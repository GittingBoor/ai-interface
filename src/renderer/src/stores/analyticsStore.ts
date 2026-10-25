import { create } from 'zustand'
import type { AnalyticsMetric, AnalyticsQuery, AnalyticsRange, AnalyticsResolution, AnalyticsResult, AnalyticsSplit, HostFilter } from '@shared/types'
import { api } from '@renderer/api/client'
import { errorMessage, unwrap } from '@renderer/api/call'
import { autoResolution, effectiveQuery, type AnalyticsDrill, type ChartMode } from '@renderer/lib/analytics'

export type { AnalyticsDrill } from '@renderer/lib/analytics'

const STORAGE_KEY = 'ai-interface.analytics'

const RANGES: readonly AnalyticsRange[] = ['7d', '30d', '90d', '365d', 'all']
const SPLITS: readonly AnalyticsSplit[] = ['project', 'host', 'model', 'none']
const RESOLUTIONS: readonly AnalyticsResolution[] = ['day', 'week', 'month']
const METRICS: readonly AnalyticsMetric[] = ['tokens', 'cost', 'hours', 'prompts', 'sessions']
const CHART_MODES: readonly ChartMode[] = ['lines', 'stacked', 'percent']
const TABS: readonly AnalyticsTab[] = ['overview', 'analysis']

/** Reiter der Auswertung: feste Übersicht oder Analyse mit Filtern. */
export type AnalyticsTab = 'overview' | 'analysis'

interface AnalyticsPrefs {
  readonly query: AnalyticsQuery
  readonly metric: AnalyticsMetric
  readonly chartMode: ChartMode
  readonly resolutionAuto: boolean
  readonly tab: AnalyticsTab
}

interface AnalyticsStore extends AnalyticsPrefs {
  readonly drill: AnalyticsDrill | null
  /** Gespeicherte Abfrage plus Drilldown: danach richten sich Diagramme und Sessions. */
  readonly active: AnalyticsQuery
  readonly result: AnalyticsResult | null
  /** Alle Projekte im Zeitraum/Rechner, unabhängig von Projektauswahl und Aufteilung (für die Auswahl im Panel). */
  readonly universe: AnalyticsResult | null
  readonly error: string | null
  readonly loading: boolean
  setRange(range: AnalyticsRange): void
  setHost(host: HostFilter): void
  setSplit(split: AnalyticsSplit): void
  setResolution(resolution: AnalyticsResolution | 'auto'): void
  setExcluded(excludedProjects: readonly string[]): void
  setMetric(metric: AnalyticsMetric): void
  setChartMode(mode: ChartMode): void
  setTab(tab: AnalyticsTab): void
  drillInto(drill: AnalyticsDrill): void
  clearDrill(): void
  openWith(patch: Partial<AnalyticsQuery>): void
  load(): Promise<void>
}

const DEFAULT_RANGE: AnalyticsRange = '30d'

const DEFAULTS: AnalyticsPrefs = {
  query: { range: DEFAULT_RANGE, host: 'all', split: 'project', resolution: autoResolution(DEFAULT_RANGE), projects: null, excludedProjects: [], models: null },
  metric: 'tokens',
  chartMode: 'stacked',
  resolutionAuto: true,
  tab: 'overview'
}

const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T => typeof value === 'string' && (list as readonly string[]).includes(value)

const isStringList = (value: unknown): value is string[] => Array.isArray(value) && value.every((v) => typeof v === 'string')

function parseQuery(raw: Record<string, unknown>): AnalyticsQuery {
  const fallback = DEFAULTS.query
  return {
    range: isOneOf(RANGES, raw.range) ? raw.range : fallback.range,
    host: typeof raw.host === 'string' && raw.host.length > 0 ? raw.host : fallback.host,
    split: isOneOf(SPLITS, raw.split) ? raw.split : fallback.split,
    resolution: isOneOf(RESOLUTIONS, raw.resolution) ? raw.resolution : fallback.resolution,
    // Früher gespeicherte Positivlisten werden verworfen: sie blendeten neue Projekte still aus.
    projects: null,
    excludedProjects: isStringList(raw.excludedProjects) ? raw.excludedProjects : [],
    models: null
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

function readPrefs(): AnalyticsPrefs {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!isRecord(raw)) return DEFAULTS
    const resolutionAuto = typeof raw.resolutionAuto === 'boolean' ? raw.resolutionAuto : DEFAULTS.resolutionAuto
    const query = parseQuery(isRecord(raw.query) ? raw.query : {})
    return {
      query: resolutionAuto ? { ...query, resolution: autoResolution(query.range) } : query,
      metric: isOneOf(METRICS, raw.metric) ? raw.metric : DEFAULTS.metric,
      chartMode: isOneOf(CHART_MODES, raw.chartMode) ? raw.chartMode : DEFAULTS.chartMode,
      resolutionAuto,
      tab: isOneOf(TABS, raw.tab) ? raw.tab : DEFAULTS.tab
    }
  } catch (error) {
    console.warn('Auswertung: gespeicherte Einstellungen nicht lesbar, Standard wird genutzt', error)
    return DEFAULTS
  }
}

/** Speichern ist Komfort; klappt es nicht, gilt die Auswahl nur für diese Sitzung. */
function writePrefs(prefs: AnalyticsPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch (error) {
    console.warn('Auswertung: Einstellungen konnten nicht gespeichert werden', error)
  }
}

const sameQuery = (a: AnalyticsQuery, b: AnalyticsQuery): boolean => JSON.stringify(a) === JSON.stringify(b)

/** Abfrage der Projektauswahl: alle Projekte (auch abgewählte), nach Projekt aufgeteilt. */
const universeQuery = (q: AnalyticsQuery): AnalyticsQuery => ({ ...q, split: 'project', projects: null, excludedProjects: [], models: null })

let requestId = 0

export const useAnalytics = create<AnalyticsStore>((set, get) => {
  const initial = readPrefs()

  const persist = (): void => {
    const { query, metric, chartMode, resolutionAuto, tab } = get()
    writePrefs({ query, metric, chartMode, resolutionAuto, tab })
  }

  /** Neue Abfrage bzw. neuen Drilldown übernehmen, speichern und laden (nur wenn sich die wirksame Abfrage ändert). */
  const applyQuery = (patch: Partial<AnalyticsQuery>, extra: Partial<Pick<AnalyticsStore, 'drill' | 'resolutionAuto'>> = {}): void => {
    const before = get().active
    const query: AnalyticsQuery = { ...get().query, ...patch }
    const drill = extra.drill === undefined ? get().drill : extra.drill
    const active = effectiveQuery(query, drill)
    set({ query, ...extra, drill, active })
    persist()
    if (!sameQuery(before, active)) void get().load()
  }

  return {
    ...initial,
    drill: null,
    active: initial.query,
    result: null,
    universe: null,
    error: null,
    loading: false,

    setRange: (range) => applyQuery(get().resolutionAuto ? { range, resolution: autoResolution(range) } : { range }),
    setHost: (host) => applyQuery({ host }, { drill: null }),
    setSplit: (split) => applyQuery({ split }),
    setResolution: (resolution) =>
      resolution === 'auto'
        ? applyQuery({ resolution: autoResolution(get().query.range) }, { resolutionAuto: true })
        : applyQuery({ resolution }, { resolutionAuto: false }),
    setExcluded: (excludedProjects) => applyQuery({ excludedProjects }, { drill: null }),
    setMetric: (metric) => {
      set({ metric })
      persist()
    },
    setChartMode: (chartMode) => {
      set({ chartMode })
      persist()
    },
    setTab: (tab) => {
      set({ tab })
      persist()
    },

    drillInto: (drill) => applyQuery({}, { drill }),
    clearDrill: () => applyQuery({}, { drill: null }),

    openWith: (patch) => {
      set({ tab: 'analysis' })
      const needsAuto = patch.range !== undefined && patch.resolution === undefined && get().resolutionAuto
      applyQuery(needsAuto && patch.range ? { ...patch, resolution: autoResolution(patch.range) } : patch, { drill: null })
    },

    load: async () => {
      const id = ++requestId
      const query = get().active
      const universeOf = universeQuery(query)
      set({ loading: true })
      try {
        const [result, universe] = await Promise.all([
          unwrap(api.usage.analytics(query)),
          sameQuery(query, universeOf) ? null : unwrap(api.usage.analytics(universeOf))
        ])
        if (id !== requestId) return
        set({ result, universe: universe ?? result, error: null, loading: false })
      } catch (error) {
        if (id === requestId) set({ error: errorMessage(error), loading: false })
      }
    }
  }
})
