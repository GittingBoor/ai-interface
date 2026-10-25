import { describe, expect, it } from 'vitest'
import type { AnalyticsMetric, AnalyticsResult, AnalyticsSeries, Favorite, HostId, TerminalInfo } from '@shared/types'
import { liveTerminalFor, topProjects } from '../../src/renderer/src/lib/home'

const STYLE = { hostLabel: (id: HostId): string => id, hostColor: (): string => '#111', palette: ['#aaa'] }
const METRICS: readonly AnalyticsMetric[] = ['tokens', 'cost', 'hours', 'prompts', 'sessions']

const fav = (id: number, path: string): Favorite => ({
  id,
  host: 'local',
  path,
  name: `Projekt ${id}`,
  color: '#e08a4f',
  icon: null,
  sortOrder: id,
  createdAt: 0,
  categoryId: null,
  starred: false
})

/** Stunden je Tag; 20 Tage. */
const series = (path: string, hours: Readonly<Record<number, number>>): AnalyticsSeries => {
  const perDay = Array.from({ length: 20 }, (_, i) => hours[i] ?? 0)
  const values = Object.fromEntries(METRICS.map((m) => [m, m === 'hours' ? perDay : perDay.map(() => 0)])) as Record<AnalyticsMetric, number[]>
  return { key: `local|${path}`, host: 'local', values, totals: { tokens: 0, cost: 0, hours: perDay.reduce((a, b) => a + b, 0), prompts: 0, sessions: 0 } }
}

const result = (list: readonly AnalyticsSeries[]): AnalyticsResult => ({
  buckets: Array.from({ length: 20 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`),
  series: list,
  totals: { tokens: 0, cost: 0, hours: 0, prompts: 0, sessions: 0 },
  previous: null,
  heatmap: [],
  dataSince: null,
  hasUnpriced: false
})

describe('topProjects', () => {
  it('wertet nur die letzten 14 Zeiteinheiten nach Stunden', () => {
    const r = result([series('/alt', { 0: 50 }), series('/neu', { 19: 2 }), series('/mitte', { 10: 1 })])
    expect(topProjects(r, [], 14, 6, STYLE).map((p) => p.label)).toEqual(['neu', 'mitte'])
  })

  it('liefert höchstens `limit` Projekte', () => {
    const r = result(Array.from({ length: 9 }, (_, i) => series(`/p${i}`, { 19: i + 1 })))
    expect(topProjects(r, [], 14, 6, STYLE)).toHaveLength(6)
  })

  it('bei Gleichstand stehen Favoriten vorn', () => {
    const r = result([series('/frei', { 19: 3 }), series('/fav', { 19: 3 })])
    expect(topProjects(r, [fav(1, '/fav')], 14, 6, STYLE).map((p) => p.label)).toEqual(['Projekt 1', 'frei'])
  })
})

describe('liveTerminalFor', () => {
  const term = (id: string, path: string, running: boolean, startedAt = 0, orchestrator = false): TerminalInfo => ({
    id,
    host: 'local',
    path,
    mode: 'continue',
    title: id,
    running,
    startedAt,
    orchestrator
  })

  it('beendete Terminals zählen nicht, dann wird fortgesetzt statt gesprungen', () => {
    expect(liveTerminalFor([term('alt', '/p', false)], 'local', '/p')).toBeNull()
  })

  it('nimmt das jüngste laufende Terminal im Projekt oder Unterordner, nie den Orchestrator', () => {
    const list = [term('a', '/p', true, 1), term('b', '/p/sub', true, 5), term('o', '/p', true, 9, true), term('x', '/q', true, 7)]
    expect(liveTerminalFor(list, 'local', '/p')?.id).toBe('b')
  })
})
