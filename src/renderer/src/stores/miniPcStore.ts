import { create } from 'zustand'
import type { GitState, HostId, MiniPcInfo, MiniPcSnapshot, OllamaStatus } from '@shared/types'
import { api } from '@renderer/api/client'
import { errorMessage, unwrap } from '@renderer/api/call'
import { findDevice } from '@renderer/lib/hosts'
import { appendHistory, historyPoint, replaceRepo, type HistoryPoint } from '@renderer/lib/miniPc'

/** Projektordner, wenn das Gerät keinen eigenen hat; `~` löst das Backend auf. */
export const DEFAULT_PROJECTS_DIR = '~'

/** Was je Gerät zwischengespeichert wird (Wechsel zwischen Geräten behält Verlauf und Stand). */
interface DeviceData {
  readonly snapshot: MiniPcSnapshot | null
  /** IPC-Fehler; ein nicht erreichbares Gerät steht in `snapshot.error`. */
  readonly snapshotError: string | null
  /** Messpunkte der Abrufe seit dem App-Start (begrenzt auf `HISTORY_LIMIT`). */
  readonly history: readonly HistoryPoint[]
  /** Gerät, Betriebssystem und Docker-Container; wird seltener abgefragt als der Snapshot. */
  readonly info: MiniPcInfo | null
  readonly infoError: string | null
  readonly repos: readonly GitState[] | null
  readonly gitError: string | null
  readonly ollama: OllamaStatus | null
  readonly ollamaError: string | null
}

const EMPTY: DeviceData = {
  snapshot: null,
  snapshotError: null,
  history: [],
  info: null,
  infoError: null,
  repos: null,
  gitError: null,
  ollama: null,
  ollamaError: null
}

interface MiniPcStore extends DeviceData {
  /** Gerät, das gerade angezeigt wird. */
  readonly device: HostId | null
  readonly cache: Readonly<Record<HostId, DeviceData>>
  readonly snapshotLoading: boolean
  readonly infoLoading: boolean
  readonly gitLoading: boolean
  /** Pfade, für die gerade `git fetch` läuft. */
  readonly fetching: readonly string[]
  select(device: HostId): void
  loadSnapshot(): Promise<void>
  loadInfo(): Promise<void>
  loadGit(): Promise<void>
  fetchRepo(path: string): Promise<void>
  loadOllama(): Promise<void>
}

const dataOf = (s: DeviceData): DeviceData => ({
  snapshot: s.snapshot,
  snapshotError: s.snapshotError,
  history: s.history,
  info: s.info,
  infoError: s.infoError,
  repos: s.repos,
  gitError: s.gitError,
  ollama: s.ollama,
  ollamaError: s.ollamaError
})

/** Projektordner des angezeigten Geräts. */
export function projectsDirOf(device: HostId | null): string {
  return (device && findDevice(device)?.projectsDir) || DEFAULT_PROJECTS_DIR
}

export const useMiniPc = create<MiniPcStore>((set, get) => {
  /** Ergebnis nur übernehmen, wenn noch dasselbe Gerät angezeigt wird; sonst in dessen Zwischenspeicher. */
  const apply = (device: HostId, patch: Partial<DeviceData>): void => {
    if (get().device === device) {
      set(patch)
      return
    }
    const cached = get().cache[device] ?? EMPTY
    set({ cache: { ...get().cache, [device]: { ...cached, ...patch } } })
  }
  const current = (): HostId | null => get().device

  return {
    ...EMPTY,
    device: null,
    cache: {},
    snapshotLoading: false,
    infoLoading: false,
    gitLoading: false,
    fetching: [],
    select: (device) => {
      const state = get()
      if (state.device === device) return
      const cache = state.device ? { ...state.cache, [state.device]: dataOf(state) } : state.cache
      set({ ...(cache[device] ?? EMPTY), cache, device, snapshotLoading: false, infoLoading: false, gitLoading: false, fetching: [] })
    },
    loadSnapshot: async () => {
      const device = current()
      if (!device || get().snapshotLoading) return
      set({ snapshotLoading: true })
      try {
        const snapshot = await unwrap(api.minipc.snapshot(device))
        const before = get().device === device ? get().history : (get().cache[device]?.history ?? [])
        const history = snapshot.system ? appendHistory(before, historyPoint(snapshot.system, snapshot.fetchedAt)) : before
        apply(device, { snapshot, history, snapshotError: null })
      } catch (error) {
        apply(device, { snapshotError: errorMessage(error) })
      } finally {
        if (get().device === device) set({ snapshotLoading: false })
      }
    },
    loadInfo: async () => {
      const device = current()
      if (!device || get().infoLoading) return
      set({ infoLoading: true })
      try {
        apply(device, { info: await unwrap(api.minipc.info(device)), infoError: null })
      } catch (error) {
        apply(device, { infoError: errorMessage(error) })
      } finally {
        if (get().device === device) set({ infoLoading: false })
      }
    },
    loadGit: async () => {
      const device = current()
      if (!device || get().gitLoading) return
      set({ gitLoading: true })
      try {
        apply(device, { repos: await unwrap(api.minipc.git(device, projectsDirOf(device))), gitError: null })
      } catch (error) {
        apply(device, { gitError: errorMessage(error) })
      } finally {
        if (get().device === device) set({ gitLoading: false })
      }
    },
    fetchRepo: async (path) => {
      const device = current()
      if (!device || get().fetching.includes(path)) return
      set({ fetching: [...get().fetching, path] })
      try {
        const next = await unwrap(api.minipc.fetch(device, path))
        if (get().device === device) set({ repos: replaceRepo(get().repos ?? [], next) })
      } catch (error) {
        if (get().device === device) set({ repos: (get().repos ?? []).map((r) => (r.path === path ? { ...r, error: errorMessage(error) } : r)) })
      } finally {
        set({ fetching: get().fetching.filter((p) => p !== path) })
      }
    },
    loadOllama: async () => {
      const device = current()
      if (!device) return
      try {
        const all = await unwrap(api.models.ollama())
        apply(device, { ollama: all.find((s) => s.host === device) ?? { host: device, installed: false, models: [] }, ollamaError: null })
      } catch (error) {
        apply(device, { ollamaError: errorMessage(error) })
      }
    }
  }
})
