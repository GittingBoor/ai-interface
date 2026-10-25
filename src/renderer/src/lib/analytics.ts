import type { AnalyticsMetric, AnalyticsQuery, AnalyticsRange, AnalyticsResolution, AnalyticsResult, AnalyticsSplit, Favorite, HostId } from '@shared/types'
import { findFavorite } from './projects'
import { baseName, formatInteger, formatTokens, formatUsd } from './format'

export type ChartMode = 'lines' | 'stacked' | 'percent'

/** Beschriftung und Farben von außen (die Host-Helfer hängen am Settings-Store). */
export interface SeriesStyle {
  hostLabel(id: HostId): string
  hostColor(id: HostId): string
  readonly palette: readonly string[]
}

export const TOP_SERIES = 6
export const REST_SERIES_KEY = 'rest'
const REST_LABEL = 'Rest'
const REST_COLOR = 'var(--color-ink-3)'
const PROJECT_KEY_SEPARATOR = '|'

export const METRIC_LABEL: Readonly<Record<AnalyticsMetric, string>> = {
  tokens: 'Token',
  cost: 'API-Gegenwert',
  hours: 'Stunden',
  prompts: 'Prompts',
  sessions: 'Sessions'
}

const hours = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })

export function formatMetric(metric: AnalyticsMetric, value: number): string {
  if (metric === 'tokens') return formatTokens(value)
  if (metric === 'cost') return formatUsd(value)
  if (metric === 'hours') return `${hours.format(value)} h`
  return formatInteger(value)
}

export function autoResolution(range: AnalyticsRange): AnalyticsResolution {
  if (range === '7d' || range === '30d') return 'day'
  return range === '90d' ? 'week' : 'month'
}

/** Eine gezeichnete Serie; `memberKeys` sind die Serienschlüssel des Backends (für Drilldown/Filter). */
export interface ChartSeries {
  readonly key: string
  readonly label: string
  readonly color: string
  readonly values: readonly number[]
  readonly total: number
  readonly memberKeys: readonly string[]
}

interface Draft {
  key: string
  label: string
  color: string | null
  host: HostId | null
  values: number[]
  total: number
  memberKeys: string[]
}

function identify(
  key: string,
  host: HostId | null,
  split: AnalyticsSplit,
  favorites: readonly Favorite[],
  style: SeriesStyle
): Pick<Draft, 'key' | 'label' | 'color'> {
  if (split === 'host' && host !== null) return { key, label: style.hostLabel(host), color: style.hostColor(host) }
  if (split !== 'project' || host === null) return { key, label: split === 'none' ? 'Gesamt' : key, color: null }
  const path = key.slice(key.indexOf(PROJECT_KEY_SEPARATOR) + 1)
  const fav = findFavorite(favorites, host, path)
  return fav ? { key: `fav-${fav.id}`, label: fav.name, color: fav.color } : { key, label: baseName(path), color: null }
}

/** Serien des Backends für eine Kennzahl, bei Projekten je Favorit zusammengefasst, größte zuerst. */
export function groupSeries(
  result: AnalyticsResult,
  split: AnalyticsSplit,
  metric: AnalyticsMetric,
  favorites: readonly Favorite[],
  style: SeriesStyle
): ChartSeries[] {
  const drafts = new Map<string, Draft>()
  for (const s of result.series) {
    const id = identify(s.key, s.host, split, favorites, style)
    const values = s.values[metric]
    const draft = drafts.get(id.key)
    if (draft) {
      draft.values = draft.values.map((v, i) => v + (values[i] ?? 0))
      draft.total += s.totals[metric]
      draft.memberKeys.push(s.key)
    } else {
      drafts.set(id.key, { ...id, host: s.host, values: [...values], total: s.totals[metric], memberKeys: [s.key] })
    }
  }
  const sorted = [...drafts.values()].sort((a, b) => b.total - a.total)
  const used = new Set(sorted.map((d) => d.color).filter((c): c is string => c !== null))
  const spare = style.palette.filter((c) => !used.has(c))
  let next = 0
  return sorted.map((d) => ({
    key: d.key,
    label: d.label,
    color: d.color ?? spare[next++ % Math.max(spare.length, 1)] ?? style.palette[0] ?? REST_COLOR,
    values: d.values,
    total: d.total,
    memberKeys: d.memberKeys
  }))
}

export function topWithRestSeries(series: readonly ChartSeries[], limit: number): ChartSeries[] {
  if (series.length <= limit + 1) return [...series]
  const rest = series.slice(limit)
  const length = rest[0]?.values.length ?? 0
  return [
    ...series.slice(0, limit),
    {
      key: REST_SERIES_KEY,
      label: REST_LABEL,
      color: REST_COLOR,
      values: Array.from({ length }, (_, i) => rest.reduce((sum, s) => sum + (s.values[i] ?? 0), 0)),
      total: rest.reduce((sum, s) => sum + s.total, 0),
      memberKeys: rest.flatMap((s) => s.memberKeys)
    }
  ]
}

/** Untere und obere Kante je Serie und Zeiteinheit; bei 100 % Anteile (0–1). */
export function stackSeries(series: readonly ChartSeries[], mode: ChartMode): { readonly lower: number[]; readonly upper: number[] }[] {
  const length = series[0]?.values.length ?? 0
  const sums = Array.from({ length }, (_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0))
  const base = new Array<number>(length).fill(0)
  return series.map((s) => {
    const values = s.values.map((v, i) => (mode === 'percent' ? ((sums[i] ?? 0) === 0 ? 0 : v / (sums[i] ?? 1)) : v))
    if (mode === 'lines') return { lower: new Array<number>(length).fill(0), upper: [...values] }
    const lower = [...base]
    values.forEach((v, i) => (base[i] = (base[i] ?? 0) + v))
    return { lower, upper: [...base] }
  })
}

/** Drilldown aus dem Ranking; `memberKeys` sind die Serienschlüssel des Backends. */
export interface AnalyticsDrill {
  readonly key: string
  readonly label: string
  readonly memberKeys: readonly string[]
  /** Aufteilung, in der gebohrt wurde. */
  readonly split: AnalyticsSplit
}

/** Abfrage mit Drilldown darüber; der Drilldown selbst wird nicht gespeichert. */
export function effectiveQuery(query: AnalyticsQuery, drill: AnalyticsDrill | null): AnalyticsQuery {
  if (drill === null) return query
  if (drill.split === 'project') return { ...query, projects: drill.memberKeys }
  if (drill.split === 'host') return drill.key === REST_SERIES_KEY ? query : { ...query, host: drill.key }
  if (drill.split === 'model') return { ...query, models: drill.memberKeys }
  return query
}

export function changeRatio(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null
  return (current - previous) / previous
}
