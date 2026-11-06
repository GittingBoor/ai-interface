import { create } from 'zustand'
import { EMPTY_AUTOMATION, type Automation, type AutomationInput, type AutomationRun } from '@shared/automations'
import { api } from '@renderer/api/client'
import { attempt, reportError, unwrap } from '@renderer/api/call'
import { notify } from '@renderer/stores/toastStore'
import { confirmAction } from '@renderer/stores/confirmStore'
import { currentT } from '@renderer/i18n/useT'

/** Offener Editor: neue Automatisierung (`id = null`) oder bestehende. */
export interface AutomationEditorState {
  readonly id: number | null
  readonly input: AutomationInput
}

interface AutomationsStore {
  readonly items: readonly Automation[]
  readonly loaded: boolean
  readonly selectedId: number | null
  readonly runs: readonly AutomationRun[]
  readonly selectedRunId: number | null
  readonly editor: AutomationEditorState | null
  readonly saving: boolean
  load(): Promise<void>
  /** Nach `automations:changed`: Liste und Verlauf der Auswahl neu holen. */
  refresh(): Promise<void>
  select(id: number | null): void
  selectRun(id: number | null): void
  openEditor(id: number | null, preset?: Partial<AutomationInput>): void
  closeEditor(): void
  patchEditor(patch: Partial<AutomationInput>): void
  save(): Promise<boolean>
  toggle(item: Automation): Promise<void>
  runNow(id: number): Promise<void>
  remove(item: Automation): Promise<void>
}

const toInput = (a: Automation): AutomationInput => ({
  name: a.name,
  agent: a.agent,
  host: a.host,
  cwd: a.cwd,
  prompt: a.prompt,
  schedule: a.schedule,
  permission: a.permission,
  model: a.model,
  timeoutMinutes: a.timeoutMinutes,
  notify: a.notify,
  enabled: a.enabled
})

export const useAutomations = create<AutomationsStore>((set, get) => ({
  items: [],
  loaded: false,
  selectedId: null,
  runs: [],
  selectedRunId: null,
  editor: null,
  saving: false,

  load: async () => {
    const items = await attempt(api.automations.list())
    if (!items) return set({ loaded: true })
    const selectedId = get().selectedId ?? items[0]?.id ?? null
    set({ items, loaded: true, selectedId })
    if (selectedId !== null) await get().refresh()
  },

  refresh: async () => {
    const items = await attempt(api.automations.list())
    if (items) set({ items })
    const id = get().selectedId
    if (id === null) return set({ runs: [] })
    const runs = await attempt(api.automations.runs(id))
    if (runs && get().selectedId === id) set({ runs })
  },

  select: (id) => {
    set({ selectedId: id, runs: [], selectedRunId: null })
    void get().refresh()
  },

  selectRun: (id) => set({ selectedRunId: id }),

  openEditor: (id, preset = {}) => {
    const existing = id === null ? null : get().items.find((a) => a.id === id)
    set({ editor: { id, input: existing ? toInput(existing) : { ...EMPTY_AUTOMATION, ...preset } } })
  },

  closeEditor: () => set({ editor: null }),

  patchEditor: (patch) => set((s) => (s.editor ? { editor: { ...s.editor, input: { ...s.editor.input, ...patch } } } : {})),

  save: async () => {
    const editor = get().editor
    if (!editor || get().saving) return false
    set({ saving: true })
    try {
      const saved = await unwrap(editor.id === null ? api.automations.create(editor.input) : api.automations.update(editor.id, editor.input))
      set({ editor: null, selectedId: saved.id })
      const t = currentT().automations.store
      notify.success(editor.id === null ? t.created(saved.name) : t.saved(saved.name))
      await get().refresh()
      return true
    } catch (error) {
      reportError(error)
      return false
    } finally {
      set({ saving: false })
    }
  },

  toggle: async (item) => {
    const done = await attempt(api.automations.update(item.id, { ...toInput(item), enabled: !item.enabled }))
    if (done) await get().refresh()
  },

  runNow: async (id) => {
    const done = await attempt(api.automations.runNow(id))
    if (done !== null) await get().refresh()
  },

  remove: async (item) => {
    const t = currentT().automations.store
    const ok = await confirmAction({ title: t.deleteTitle(item.name), message: t.deleteMessage, confirmLabel: t.delete, danger: true })
    if (!ok) return
    const done = await attempt(api.automations.remove(item.id))
    if (done === null) return
    set({ selectedId: null, runs: [] })
    await get().load()
  }
}))
