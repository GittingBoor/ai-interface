import { describe, expect, it } from 'vitest'
import type { AnalyticsQuery, AnalyticsMetric, AnalyticsResult, AnalyticsSeries, Favorite, HostId } from '@shared/types'
import { autoResolution, changeRatio, effectiveQuery, groupSeries, REST_SERIES_KEY, stackSeries, topWithRestSeries, type ChartSeries } from '../../src/renderer/src/lib/analytics'

const fav = (id: number, path: string, over: Partial<Favorite> = {}): Favorite => ({
  id,
  host: 'local',
  path,
  name: `Projekt ${id}`,
  color: '#e08a4f',
  icon: null,
  sortOrder: id,
  createdAt: 0,
  categoryId: null,
  starred: false,
  ...over
})

const STYLE = { hostLabel: (id: HostId): string => id, hostColor: (): string => '#111', palette: ['#aaa', '#bbb'] }

const METRICS: readonly AnalyticsMetric[] = ['tokens', 'cost', 'hours', 'prompts', 'sessions']

const series = (key: string, host: HostId | null, tokens: readonly number[]): AnalyticsSeries => {
  const values = Object.fromEntries(METRICS.map((m) => [m, m === 'tokens' ? tokens : tokens.map(() => 0)])) as Record<AnalyticsMetric, number[]>
  const total = tokens.reduce((a, b) => a + b, 0)
  return { key, host, values, totals: { tokens: total, cost: 0, hours: 0, prompts: 0, sessions: 0 } }
}

const result = (list: readonly AnalyticsSeries[]): AnalyticsResult => ({
  buckets: ['2026-10-18', '2026-10-19'],
  series: list,
  totals: { tokens: 0, cost: 0, hours: 0, prompts: 0, sessions: 0 },
  previous: null,
  heatmap: [],
  dataSince: null,
  hasUnpriced: false
})

const chart = (key: string, values: readonly number[]): ChartSeries => ({
  key,
  label: key,
  color: '#000',
  values,
  total: values.reduce((a, b) => a + b, 0),
  memberKeys: [key]
})

describe('autoResolution', () => {
  it('wählt die Auflösung passend zum Zeitraum', () => {
    expect(autoResolution('7d')).toBe('day')
    expect(autoResolution('30d')).toBe('day')
    expect(autoResolution('90d')).toBe('week')
    expect(autoResolution('365d')).toBe('month')
    expect(autoResolution('all')).toBe('month')
  })
})

describe('groupSeries', () => {
  it('fasst Pfade eines Favoriten zu einer Serie zusammen (Name und Farbe des Favoriten)', () => {
    const favorites = [fav(1, '/a', { color: '#5fb3a8', name: 'Alpha' })]
    const r = result([series('local|/a', 'local', [1, 2]), series('local|/a/sub', 'local', [3, 4]), series('local|/z', 'local', [10, 0])])
    const grouped = groupSeries(r, 'project', 'tokens', favorites, STYLE)
    expect(grouped.map((s) => s.label)).toEqual(['Alpha', 'z'])
    expect(grouped[0]).toMatchObject({ color: '#5fb3a8', values: [4, 6], total: 10, memberKeys: ['local|/a', 'local|/a/sub'] })
  })

  it('übernimmt Schlüssel bei Aufteilung nach Modell', () => {
    const grouped = groupSeries(result([series('claude-opus-5-5', null, [1, 1])]), 'model', 'tokens', [], STYLE)
    expect(grouped[0]).toMatchObject({ key: 'claude-opus-5-5', label: 'claude-opus-5-5', total: 2 })
  })
})

describe('topWithRestSeries', () => {
  it('behält die größten 6 und fasst den Rest zusammen', () => {
    const list = [80, 70, 60, 50, 40, 30, 2, 1].map((v, i) => chart(`s${i}`, [v, 0]))
    const top = topWithRestSeries(list, 6)
    expect(top).toHaveLength(7)
    expect(top[6]).toMatchObject({ key: REST_SERIES_KEY, label: 'Rest', values: [3, 0], total: 3, memberKeys: ['s6', 's7'] })
  })

  it('lässt kurze Listen unverändert', () => {
    expect(topWithRestSeries([chart('a', [1])], 6)).toHaveLength(1)
  })
})

describe('stackSeries', () => {
  it('gestapelt: obere Kante der letzten Serie ist die Summe', () => {
    const bands = stackSeries([chart('a', [1, 2]), chart('b', [3, 4])], 'stacked')
    expect(bands[1]).toEqual({ lower: [1, 2], upper: [4, 6] })
  })

  it('100 % ohne Werte ergibt keine NaN', () => {
    const bands = stackSeries([chart('a', [0, 0]), chart('b', [0, 0])], 'percent')
    expect(bands.flatMap((b) => [...b.lower, ...b.upper]).some(Number.isNaN)).toBe(false)
  })

  it('100 %: obere Kante der letzten Serie ist 1', () => {
    const bands = stackSeries([chart('a', [1, 3]), chart('b', [1, 1])], 'percent')
    expect(bands[1]?.upper).toEqual([1, 1])
    expect(bands[0]?.upper).toEqual([0.5, 0.75])
  })

  it('Linien: jede Serie für sich', () => {
    expect(stackSeries([chart('a', [1, 2]), chart('b', [3, 4])], 'lines')[1]).toEqual({ lower: [0, 0], upper: [3, 4] })
  })
})

describe('changeRatio', () => {
  it('berechnet die Veränderung, ohne Vorwert null', () => {
    expect(changeRatio(150, 100)).toBe(0.5)
    expect(changeRatio(1, 0)).toBeNull()
    expect(changeRatio(1, undefined)).toBeNull()
  })
})

describe('effectiveQuery', () => {
  const base: AnalyticsQuery = { range: '30d', host: 'all', split: 'project', resolution: 'day', projects: null, excludedProjects: ['local|/x'], models: null }

  it('ohne Drilldown bleibt die Abfrage unverändert', () => {
    expect(effectiveQuery(base, null)).toBe(base)
  })

  it('Drilldown auf Projekt, Rechner und Modell legt sich über die Abfrage', () => {
    expect(effectiveQuery(base, { key: 'fav-1', label: 'A', memberKeys: ['local|/a'], split: 'project' })).toMatchObject({ projects: ['local|/a'], excludedProjects: ['local|/x'] })
    expect(effectiveQuery(base, { key: 'mini-pc', label: 'Mini', memberKeys: ['mini-pc'], split: 'host' })).toMatchObject({ host: 'mini-pc' })
    expect(effectiveQuery(base, { key: 'opus', label: 'opus', memberKeys: ['opus'], split: 'model' })).toMatchObject({ models: ['opus'] })
  })

  it('Drilldown auf Rest bei Rechnern filtert über alle Rechner der Gruppe statt auf einen unbekannten Rechner', () => {
    expect(effectiveQuery(base, { key: REST_SERIES_KEY, label: 'Rest', memberKeys: ['a', 'b'], split: 'host' }).host).toBe('all')
  })
})
