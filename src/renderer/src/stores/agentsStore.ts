import { create } from 'zustand'
import { EMPTY_AGENT, type AgentAssistMode, type AgentDefinition, type AgentDocument, type AgentScope } from '@shared/agents'
import type { HostId, SkillEntry } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt, errorMessage, reportError, unwrap } from '@renderer/api/call'
import { notify } from '@renderer/stores/toastStore'
import { useSkills } from '@renderer/stores/skillsStore'
import { confirmAction } from '@renderer/stores/confirmStore'
import { projectOfAgentPath } from '@renderer/lib/agents'
import { currentT } from '@renderer/i18n/useT'

export type AgentsMode = 'browse' | 'guide' | 'builder'

/** Was der Builder gerade bearbeitet und wohin es gespeichert wird. */
export interface AgentDraft {
  readonly definition: AgentDefinition
  readonly host: HostId
  readonly scope: AgentScope
  readonly projectPath: string | null
  /** Datei, die beim Speichern ersetzt wird; `null` = neuer Agent oder Kopie. */
  readonly previousPath: string | null
  /** Felder der Datei, die der Builder nicht zeigt und beim Speichern behält. */
  readonly preservedKeys: readonly string[]
  /** Woher der Entwurf kommt, für den Titel: neu, Vorlage, Bearbeiten, Kopie eines Plugin-Agents. */
  readonly origin: 'new' | 'edit' | 'copy'
}

interface AgentsStore {
  readonly mode: AgentsMode
  readonly selectedId: string | null
  readonly doc: AgentDocument | null
  readonly docLoading: boolean
  readonly docError: string | null
  readonly draft: AgentDraft | null
  /** Gespeicherter Stand beim Öffnen (zum Erkennen ungespeicherter Änderungen). */
  readonly pristine: AgentDefinition | null
  readonly assisting: AgentAssistMode | null
  readonly assistNotes: readonly string[]
  readonly saving: boolean
  readonly query: string
  setMode(mode: AgentsMode): void
  setQuery(query: string): void
  select(id: string | null): void
  openBuilder(entry: SkillEntry | null, definition?: AgentDefinition): Promise<void>
  closeBuilder(): Promise<void>
  updateDraft(patch: Partial<AgentDefinition>): void
  setTarget(host: HostId, scope: AgentScope, projectPath: string | null): void
  assist(mode: AgentAssistMode, idea: string): Promise<void>
  save(): Promise<boolean>
  remove(entry: SkillEntry): Promise<void>
}

const newDraft = (definition: AgentDefinition = EMPTY_AGENT): AgentDraft => ({
  definition,
  host: 'local',
  scope: 'user',
  projectPath: null,
  previousPath: null,
  preservedKeys: [],
  origin: 'new'
})

const sameDefinition = (a: AgentDefinition | null, b: AgentDefinition | null): boolean => JSON.stringify(a) === JSON.stringify(b)

export const useAgents = create<AgentsStore>((set, get) => ({
  mode: 'browse',
  selectedId: null,
  doc: null,
  docLoading: false,
  docError: null,
  draft: null,
  pristine: null,
  assisting: null,
  assistNotes: [],
  saving: false,
  query: '',

  setMode: (mode) => set({ mode }),
  setQuery: (query) => set({ query }),

  select: (id) => {
    set({ selectedId: id, doc: null, docError: null, docLoading: id !== null, mode: get().mode === 'builder' ? 'builder' : 'browse' })
    if (!id) return
    const entry = useSkills.getState().entries.find((e) => e.id === id)
    if (!entry) return set({ docLoading: false })
    void unwrap(api.agents.read(entry.host, entry.path)).then(
      (doc) => get().selectedId === id && set({ doc, docLoading: false }),
      (error: unknown) => get().selectedId === id && set({ docError: errorMessage(error), docLoading: false })
    )
  },

  openBuilder: async (entry, definition) => {
    if (!entry) {
      const draft = newDraft(definition)
      return set({ mode: 'builder', draft, pristine: draft.definition, assistNotes: [] })
    }
    const doc = await attempt(api.agents.read(entry.host, entry.path))
    if (!doc) return
    const project = entry.scope === 'project' ? projectOfAgentPath(entry.path) : null
    const draft: AgentDraft = doc.readOnly
      ? { ...newDraft(doc.definition), host: entry.host, origin: 'copy' }
      : {
          definition: doc.definition,
          host: entry.host,
          scope: project ? 'project' : 'user',
          projectPath: project,
          previousPath: entry.path,
          preservedKeys: doc.preservedKeys,
          origin: 'edit'
        }
    set({ mode: 'builder', draft, pristine: draft.definition, assistNotes: [] })
  },

  closeBuilder: async () => {
    const { draft, pristine } = get()
    if (draft && !sameDefinition(draft.definition, pristine)) {
      const t = currentT().agents.store
      const ok = await confirmAction({ title: t.discardTitle, message: t.discardMessage, confirmLabel: t.discard, danger: true })
      if (!ok) return
    }
    set({ mode: 'browse', draft: null, pristine: null, assistNotes: [] })
  },

  updateDraft: (patch) => set((s) => (s.draft ? { draft: { ...s.draft, definition: { ...s.draft.definition, ...patch } } } : {})),

  setTarget: (host, scope, projectPath) => set((s) => (s.draft ? { draft: { ...s.draft, host, scope, projectPath: scope === 'project' ? projectPath : null } } : {})),

  assist: async (mode, idea) => {
    const draft = get().draft
    if (!draft || get().assisting) return
    set({ assisting: mode })
    const availableSkills = [...new Set(useSkills.getState().entries.filter((e) => e.kind === 'skill').map((e) => e.name))]
    try {
      const result = await unwrap(api.agents.assist({ mode, idea, current: mode === 'improve' ? draft.definition : null, availableSkills }))
      // Beim Verbessern bleibt der Name, damit die Datei nicht ungefragt umbenannt wird.
      const definition = mode === 'improve' && draft.definition.name ? { ...result.definition, name: draft.definition.name } : result.definition
      set((s) => (s.draft ? { draft: { ...s.draft, definition }, assistNotes: result.notes } : {}))
    } catch (error) {
      reportError(error)
    } finally {
      set({ assisting: null })
    }
  },

  save: async () => {
    const draft = get().draft
    if (!draft || get().saving) return false
    set({ saving: true })
    try {
      const saved = await unwrap(api.agents.save({ host: draft.host, scope: draft.scope, projectPath: draft.projectPath, definition: draft.definition, previousPath: draft.previousPath }))
      notify.success(currentT().agents.store.saved(draft.definition.name))
      await useSkills.getState().load()
      set({ mode: 'browse', draft: null, pristine: null, assistNotes: [] })
      get().select(`${saved.host}:${saved.path}`)
      return true
    } catch (error) {
      reportError(error)
      return false
    } finally {
      set({ saving: false })
    }
  },

  remove: async (entry) => {
    const t = currentT().agents.store
    const ok = await confirmAction({ title: t.deleteTitle(entry.name), message: t.deleteMessage(entry.path), confirmLabel: t.delete, danger: true })
    if (!ok) return
    const done = await attempt(api.agents.remove(entry.host, entry.path))
    if (done === null) return
    notify.success(currentT().agents.store.deleted(entry.name))
    set({ selectedId: null, doc: null })
    await useSkills.getState().load()
  }
}))

/** Ungespeicherte Änderungen im Builder? */
export const useDraftDirty = (): boolean => useAgents((s) => s.draft !== null && !sameDefinition(s.draft.definition, s.pristine))
