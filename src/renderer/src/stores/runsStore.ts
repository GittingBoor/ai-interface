import { create } from 'zustand'
import type { InterruptedRun } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt, errorMessage, unwrap } from '@renderer/api/call'
import { useTerminals } from './terminalStore'

interface RunsStore {
  readonly runs: readonly InterruptedRun[]
  readonly loaded: boolean
  readonly error: string | null
  /** In dieser Sitzung fortgesetzte Durchläufe; sie verschwinden, sobald Claude wieder antwortet. */
  readonly resumed: readonly string[]
  load(): Promise<void>
  receive(runs: readonly InterruptedRun[]): void
  dismiss(run: InterruptedRun): Promise<void>
  resume(run: InterruptedRun, name: string): Promise<void>
}

export const runKey = (run: Pick<InterruptedRun, 'host' | 'sessionId'>): string => `${run.host}:${run.sessionId}`

export const useRuns = create<RunsStore>((set, get) => ({
  runs: [],
  loaded: false,
  error: null,
  resumed: [],
  load: async () => {
    try {
      set({ runs: await unwrap(api.runs.list()), loaded: true, error: null })
    } catch (cause) {
      set({ loaded: true, error: errorMessage(cause) })
    }
  },
  receive: (runs) => {
    const open = new Set(runs.map(runKey))
    set({ runs, loaded: true, error: null, resumed: get().resumed.filter((k) => open.has(k)) })
  },
  dismiss: async (run) => {
    const runs = await attempt(api.runs.dismiss(run.host, run.sessionId))
    if (runs) get().receive(runs)
  },
  resume: async (run, name) => {
    const before = useTerminals.getState().terminals.length
    await useTerminals.getState().launch({ host: run.host, path: run.project, name }, 'resume', undefined, run.sessionId)
    // Fehler meldet `launch` selbst per Toast; nur ein wirklich geöffnetes Terminal gilt als fortgesetzt.
    if (useTerminals.getState().terminals.length === before) return
    const key = runKey(run)
    if (!get().resumed.includes(key)) set({ resumed: [...get().resumed, key] })
  }
}))
