import { create } from 'zustand'
import type { HostId, LaunchMode, OrchestratorLaunchMode, TerminalInfo, TerminalLayoutMode, TerminalLayoutSettings, TerminalStatus } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt, unwrap } from '@renderer/api/call'
import { terminalRegistry } from '@renderer/lib/terminalRegistry'
import { fillSlots, moveInOrder, orchestratorFirst, placeInSlot } from '@renderer/lib/terminalLayout'
import { confirmAction } from './confirmStore'
import { useNav } from './navStore'
import { useSettings } from './settingsStore'

const DEFAULT_COLS = 120
const DEFAULT_ROWS = 32
const SIZE_SAVE_DELAY_MS = 500

let initialized = false
let sizeTimer: ReturnType<typeof setTimeout> | null = null

const MODE_SUFFIX: Readonly<Record<LaunchMode, string>> = { new: '', continue: ' · fortgesetzt', resume: ' · fortgesetzt', shell: ' · Shell' }

/** Wo ein Terminal startet: Projekt oder frei gewählter Ordner. */
export interface LaunchTarget {
  readonly host: HostId
  readonly path: string
  readonly name: string
}

interface TerminalStore {
  readonly terminals: readonly TerminalInfo[]
  /** Reihenfolge der Tabs (Terminal-IDs). */
  readonly order: readonly string[]
  /** Angezeigte Terminals je Slot des Layouts. */
  readonly slots: readonly (string | null)[]
  readonly layout: TerminalLayoutSettings
  readonly activeId: string | null
  readonly opening: boolean
  readonly dialogOpen: boolean
  /** Exit-Codes beendeter Terminals. */
  readonly exitCodes: Readonly<Record<string, number>>
  /** Status je Terminal aus den Claude-Hooks. */
  readonly statuses: Readonly<Record<string, TerminalStatus>>
  init(): Promise<void>
  /** Liste neu vom Main-Prozess holen (z. B. Privatmodus gesperrt/entsperrt), Sitzungen bleiben erhalten. */
  sync(): Promise<void>
  launch(target: LaunchTarget, mode: LaunchMode, title?: string, sessionId?: string): Promise<void>
  /** Öffnet den Orchestrator (vorn in der Tab-Reihe) oder springt zu seinem offenen Tab. */
  openOrchestrator(mode: OrchestratorLaunchMode): Promise<void>
  /** Startet die Aufgaben-Prüfung mit Claude oder zeigt ihr offenes Terminal. */
  openTaskReview(): Promise<void>
  activate(id: string): void
  close(id: string): Promise<void>
  markExited(id: string, code: number): void
  setMode(mode: TerminalLayoutMode): void
  place(slot: number, id: string): void
  reorder(id: string, beforeId: string | null): void
  setSizes(group: string, sizes: Readonly<Record<string, number>>): void
  openDialog(): void
  closeDialog(): void
}

const DEFAULT_LAYOUT: TerminalLayoutSettings = { mode: 'tabs', sizes: {} }

let lastViewing = ''

/** Meldet dem Main-Prozess, welche Terminals gerade zu sehen sind (keine Benachrichtigung für diese). */
function reportViewing(slots: readonly (string | null)[]): void {
  const visible = useNav.getState().view === 'terminal' ? slots.filter((s): s is string => s !== null) : []
  const focused = document.hasFocus()
  const signature = `${visible.join(',')}|${focused}`
  if (signature === lastViewing) return
  lastViewing = signature
  void api.terminal.setViewing(visible, focused)
}

function persistLayout(layout: TerminalLayoutSettings): void {
  void useSettings.getState().update({ terminalLayout: layout })
}

export const useTerminals = create<TerminalStore>((set, get) => {
  /** Slots nach jeder Änderung an Terminals, Reihenfolge, Modus oder Aktivem neu bestimmen. */
  const commit = (patch: Partial<Pick<TerminalStore, 'terminals' | 'order' | 'slots' | 'layout' | 'activeId'>>): void => {
    const next = { ...get(), ...patch }
    set({ ...patch, slots: fillSlots(next.order, next.slots, next.layout.mode, next.activeId) })
  }

  return {
    terminals: [],
    order: [],
    slots: [null],
    layout: DEFAULT_LAYOUT,
    activeId: null,
    opening: false,
    dialogOpen: false,
    exitCodes: {},
    statuses: {},
    init: async () => {
      if (initialized) return
      initialized = true
      terminalRegistry.listen()
      api.on('terminal:exit', ({ id, code }) => get().markExited(id, code))
      api.on('terminal:status', ({ id, status }) => set({ statuses: { ...get().statuses, [id]: status } }))
      // Vom Orchestrator geöffnet: anhängen, ohne den Fokus zu wechseln.
      api.on('terminal:opened', (info) => {
        if (get().terminals.some((t) => t.id === info.id)) return
        terminalRegistry.ensure(info)
        commit({ terminals: [...get().terminals, info], order: [...get().order, info.id] })
      })
      // Von der App selbst geschlossen (z. B. Aufgaben-Prüfung fertig): ohne Rückfrage entfernen.
      api.on('terminal:closed', ({ id }) => {
        if (!get().terminals.some((t) => t.id === id)) return
        terminalRegistry.dispose(id)
        const order = get().order.filter((o) => o !== id)
        const index = get().order.indexOf(id)
        const activeId = get().activeId === id ? (order[Math.min(index, order.length - 1)] ?? null) : get().activeId
        commit({ terminals: get().terminals.filter((t) => t.id !== id), order, activeId })
      })
      api.on('terminal:focus', ({ id }) => {
        useNav.getState().go('terminal')
        get().activate(id)
      })
      const report = (): void => reportViewing(get().slots)
      useTerminals.subscribe(report)
      useNav.subscribe(report)
      window.addEventListener('focus', report)
      window.addEventListener('blur', report)
      const applySettings = (layout: TerminalLayoutSettings | undefined): void => {
        if (layout) commit({ layout })
      }
      applySettings(useSettings.getState().settings?.terminalLayout)
      const off = useSettings.subscribe((s) => {
        if (!s.settings) return
        applySettings(s.settings.terminalLayout)
        off()
      })
      const list = await attempt(api.terminal.list())
      if (!list?.length) return
      for (const info of list) {
        const snapshot = await unwrap(api.terminal.snapshot(info.id)).catch(() => '')
        terminalRegistry.ensure(info, snapshot)
      }
      commit({ terminals: list, order: orchestratorFirst(list.map((t) => t.id), list), activeId: list[list.length - 1]?.id ?? null })
      set({ statuses: (await attempt(api.terminal.statuses())) ?? {} })
    },
    sync: async () => {
      const list = await attempt(api.terminal.list())
      if (!list) return
      for (const info of list) {
        if (!get().terminals.some((t) => t.id === info.id)) terminalRegistry.ensure(info, await unwrap(api.terminal.snapshot(info.id)).catch(() => ''))
      }
      const ids = new Set(list.map((t) => t.id))
      // Verborgene Terminals: xterm samt Verlauf verwerfen, nach dem Entsperren kommt der Snapshot neu.
      for (const t of get().terminals) if (!ids.has(t.id)) terminalRegistry.dispose(t.id)
      const order = [...get().order.filter((id) => ids.has(id)), ...list.map((t) => t.id).filter((id) => !get().order.includes(id))]
      const activeId = get().activeId && ids.has(get().activeId ?? '') ? get().activeId : (order[order.length - 1] ?? null)
      commit({ terminals: list, order: orchestratorFirst(order, list), activeId })
      set({ statuses: (await attempt(api.terminal.statuses())) ?? get().statuses })
    },
    launch: async (target, mode, title, sessionId) => {
      if (get().opening) return
      set({ opening: true, dialogOpen: false })
      useNav.getState().go('terminal')
      try {
        const info = await attempt(
          api.terminal.open({
            host: target.host,
            path: target.path,
            mode,
            title: title?.trim() || `${target.name}${MODE_SUFFIX[mode]}`,
            cols: DEFAULT_COLS,
            rows: DEFAULT_ROWS,
            ...(sessionId ? { sessionId } : {})
          })
        )
        if (!info) return
        terminalRegistry.ensure(info)
        commit({ terminals: [...get().terminals, info], order: [...get().order, info.id], activeId: info.id })
      } finally {
        set({ opening: false })
      }
    },
    openTaskReview: async () => {
      if (get().opening) return
      set({ opening: true, dialogOpen: false })
      useNav.getState().go('terminal')
      try {
        const info = await attempt(api.tasks.review())
        if (!info) return
        if (get().terminals.some((t) => t.id === info.id)) return get().activate(info.id)
        terminalRegistry.ensure(info)
        commit({ terminals: [...get().terminals, info], order: [...get().order, info.id], activeId: info.id })
      } finally {
        set({ opening: false })
      }
    },
    openOrchestrator: async (mode) => {
      if (get().opening) return
      set({ opening: true, dialogOpen: false })
      useNav.getState().go('terminal')
      try {
        const info = await attempt(api.orchestrator.open(mode))
        if (!info) return
        if (get().terminals.some((t) => t.id === info.id)) return get().activate(info.id)
        terminalRegistry.ensure(info)
        commit({ terminals: [...get().terminals, info], order: [info.id, ...get().order], activeId: info.id })
      } finally {
        set({ opening: false })
      }
    },
    activate: (id) => {
      if (get().activeId !== id) commit({ activeId: id })
    },
    close: async (id) => {
      const info = get().terminals.find((t) => t.id === id)
      if (!info) return
      if (info.running) {
        const ok = await confirmAction({
          title: 'Laufendes Terminal schließen?',
          message: `„${info.title}“ läuft noch. Beim Schließen wird der Prozess beendet.`,
          confirmLabel: 'Beenden und schließen',
          danger: true
        })
        if (!ok) return
      }
      await attempt(api.terminal.close(id))
      terminalRegistry.dispose(id)
      const order = get().order.filter((o) => o !== id)
      const index = get().order.indexOf(id)
      const activeId = get().activeId === id ? (order[Math.min(index, order.length - 1)] ?? null) : get().activeId
      commit({ terminals: get().terminals.filter((t) => t.id !== id), order, activeId })
    },
    markExited: (id, code) => {
      terminalRegistry.writeNotice(id, `[Prozess beendet, Code ${code}]`)
      set({
        terminals: get().terminals.map((t) => (t.id === id ? { ...t, running: false } : t)),
        exitCodes: { ...get().exitCodes, [id]: code }
      })
    },
    setMode: (mode) => {
      const layout = { ...get().layout, mode }
      // Beim Wechsel neu nach Tab-Reihenfolge verteilen (das aktive Terminal bleibt sichtbar).
      commit({ layout, slots: [] })
      persistLayout(layout)
    },
    place: (slot, id) => commit({ slots: placeInSlot(get().slots, slot, id), activeId: id }),
    reorder: (id, beforeId) => commit({ order: moveInOrder(get().order, id, beforeId) }),
    setSizes: (group, sizes) => {
      const layout = { ...get().layout, sizes: { ...get().layout.sizes, [group]: sizes } }
      set({ layout })
      if (sizeTimer) clearTimeout(sizeTimer)
      sizeTimer = setTimeout(() => persistLayout(get().layout), SIZE_SAVE_DELAY_MS)
    },
    openDialog: () => set({ dialogOpen: true }),
    closeDialog: () => set({ dialogOpen: false })
  }
})
