import { create } from 'zustand'
import type { HostStatus, ProjectUsage, UsageOverview } from '@shared/types'
import { api } from '@renderer/api/client'
import { errorMessage, reportError, unwrap } from '@renderer/api/call'

const PROJECT_WINDOW_DAYS = 7

interface UsageStore {
  readonly overview: UsageOverview | null
  readonly hosts: readonly HostStatus[]
  /** Projekte der letzten 7 Tage (für Favoriten). */
  readonly projects7d: readonly ProjectUsage[]
  readonly error: string | null
  readonly refreshing: boolean
  readonly loadedAt: number | null
  load(): Promise<void>
  refresh(): Promise<void>
  setHosts(hosts: readonly HostStatus[]): void
}

export const useUsage = create<UsageStore>((set, get) => ({
  overview: null,
  hosts: [],
  projects7d: [],
  error: null,
  refreshing: false,
  loadedAt: null,
  load: async () => {
    try {
      const [overview, hosts, projects7d] = await Promise.all([
        unwrap(api.usage.overview()),
        unwrap(api.hosts.status()),
        unwrap(api.usage.projects(PROJECT_WINDOW_DAYS))
      ])
      set({ overview, hosts, projects7d, error: null, loadedAt: Date.now() })
    } catch (error) {
      set({ error: errorMessage(error) })
    }
  },
  refresh: async () => {
    if (get().refreshing) return
    set({ refreshing: true })
    try {
      const hosts = await unwrap(api.usage.refresh())
      set({ hosts })
      await get().load()
    } catch (error) {
      reportError(error)
    } finally {
      set({ refreshing: false })
    }
  },
  setHosts: (hosts) => set({ hosts })
}))
