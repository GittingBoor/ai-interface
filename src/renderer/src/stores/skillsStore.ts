import { create } from 'zustand'
import type { HostId, SkillEntry, SkillRelation } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt, errorMessage, unwrap } from '@renderer/api/call'
import { hostIds } from '@renderer/lib/hosts'
import { DEFAULT_FILTERS, missingSummaryIds, type SkillFilters } from '@renderer/lib/skills'

export type SkillsTab = 'list' | 'graph'

export interface SummaryProgress {
  readonly done: number
  readonly total: number
  readonly current: string
}

interface SkillsStore {
  readonly entries: readonly SkillEntry[]
  readonly relations: readonly SkillRelation[]
  /** Fehler beim Laden je Rechner (z. B. Gerät offline). */
  readonly hostErrors: Readonly<Record<HostId, string | null>>
  /** Einzelne Dateien, die der Katalog nicht lesen konnte. */
  readonly scanErrors: readonly string[]
  readonly summaries: Readonly<Record<string, string>>
  readonly loaded: boolean
  readonly loading: boolean
  /** Laufende Erzeugung; null = keine. */
  readonly progress: SummaryProgress | null
  readonly selectedId: string | null
  readonly tab: SkillsTab
  readonly filters: SkillFilters
  load(): Promise<void>
  summarize(ids: readonly string[]): Promise<void>
  summarizeMissing(): Promise<void>
  select(id: string | null): void
  setTab(tab: SkillsTab): void
  setFilters(patch: Partial<SkillFilters>): void
}

const NO_ERRORS: Readonly<Record<HostId, string | null>> = {}

export const useSkills = create<SkillsStore>((set, get) => ({
  entries: [],
  relations: [],
  hostErrors: NO_ERRORS,
  scanErrors: [],
  summaries: {},
  loaded: false,
  loading: false,
  progress: null,
  selectedId: null,
  tab: 'list',
  filters: DEFAULT_FILTERS,

  load: async () => {
    if (get().loading) return
    set({ loading: true })
    const results = await Promise.allSettled(hostIds().map((host) => unwrap(api.skills.catalog(host))))
    const hostErrors: Record<HostId, string | null> = { ...NO_ERRORS }
    const entries: SkillEntry[] = []
    const relations: SkillRelation[] = []
    const scanErrors: string[] = []
    results.forEach((result, i) => {
      const host = hostIds()[i]
      if (!host) return
      if (result.status === 'rejected') {
        hostErrors[host] = errorMessage(result.reason)
        return
      }
      entries.push(...result.value.entries)
      relations.push(...result.value.relations)
      scanErrors.push(...result.value.errors)
    })
    const hashes = [...new Set(entries.map((e) => e.hash))]
    const summaries = hashes.length ? ((await attempt(api.skills.summaries(hashes))) ?? get().summaries) : {}
    set({ entries, relations, hostErrors, scanErrors, summaries, loaded: true, loading: false })
  },

  summarize: async (ids) => {
    if (!ids.length || get().progress) return
    set({ progress: { done: 0, total: ids.length, current: '' } })
    const off = api.on('skills:progress', (progress) => set({ progress }))
    try {
      await attempt(api.skills.summarize([...ids]))
    } finally {
      off()
      // Auch nach einem Abbruch: bereits erzeugte Zusammenfassungen übernehmen.
      const hashes = [...new Set(get().entries.map((e) => e.hash))]
      const summaries = hashes.length ? await attempt(api.skills.summaries(hashes)) : null
      set((s) => ({ progress: null, summaries: summaries ?? s.summaries }))
    }
  },

  summarizeMissing: async () => {
    const { entries, summaries } = get()
    await get().summarize(missingSummaryIds(entries, summaries))
  },

  select: (id) => set({ selectedId: id }),
  setTab: (tab) => set({ tab }),
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } }))
}))
