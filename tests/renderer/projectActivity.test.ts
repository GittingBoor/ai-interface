import { describe, expect, it } from 'vitest'
import type { Favorite, ProjectActivity } from '@shared/types'
import { aggregateActivity, REST_KEY, REST_TONE, topWithRest } from '../../src/renderer/src/lib/projectActivity'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

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

const row = (project: string, over: Partial<ProjectActivity> = {}): ProjectActivity => ({
  project,
  host: 'local',
  activeMs: HOUR,
  totalTokens: 1_000,
  costUsd: 1,
  sessions: 1,
  ...over
})

describe('aggregateActivity', () => {
  it('fasst Unterordner eines Projekts zusammen und übernimmt Name und Farbe', () => {
    const groups = aggregateActivity([fav(1, 'C:\\p\\app', { color: '#8fb573' })], [row('C:\\p\\app'), row('C:\\p\\app\\web', { totalTokens: 500 })])
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ label: 'Projekt 1', color: '#8fb573', totalTokens: 1_500, activeMs: 2 * HOUR, isProject: true })
  })

  it('zeigt Ordner ohne Projekt mit Ordnernamen und stabilem Grauton', () => {
    const first = aggregateActivity([], [row('/home/alex/tools', { host: 'mini-pc' })])[0]
    const again = aggregateActivity([], [row('/home/alex/x'), row('/home/alex/tools', { host: 'mini-pc' })]).find((g) => g.label === 'tools')
    expect(first?.label).toBe('tools')
    expect(first?.isProject).toBe(false)
    expect(again?.color).toBe(first?.color)
  })
})

describe('topWithRest', () => {
  const groups = aggregateActivity(
    [],
    Array.from({ length: 12 }, (_, i) => row(`C:\\p\\${i}`, { totalTokens: (i + 1) * 100, activeMs: (12 - i) * MINUTE }))
  )

  it('behält die größten nach Kennzahl und fasst den Rest zusammen', () => {
    const top = topWithRest(groups, 'tokens', 10)
    expect(top).toHaveLength(11)
    expect(top[0]?.totalTokens).toBe(1_200)
    const rest = top[10]
    expect(rest).toMatchObject({ key: REST_KEY, label: 'Weitere', mergedCount: 2, totalTokens: 300, color: REST_TONE })
  })

  it('sortiert nach Arbeitszeit, wenn danach gefragt ist', () => {
    expect(topWithRest(groups, 'time', 7)[0]?.activeMs).toBe(12 * MINUTE)
  })

  it('bildet kein „Weitere“ aus einem einzelnen Eintrag', () => {
    expect(topWithRest(groups.slice(0, 11), 'tokens', 10).some((g) => g.key === REST_KEY)).toBe(false)
  })
})

