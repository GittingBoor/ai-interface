import { describe, expect, it } from 'vitest'
import type { SkillEntry, SkillRelation } from '@shared/types'
import { DEFAULT_FILTERS, facetCounts, filterEntries, groupEntries, missingSummaryIds, relationsFor } from '../../src/renderer/src/lib/skills'
import { buildGraph, GRAPH_ROW, sourceOf } from '../../src/renderer/src/lib/skillGraph'

const entry = (name: string, over: Partial<SkillEntry> = {}): SkillEntry => ({
  id: `local:/s/${name}`,
  kind: 'skill',
  name,
  description: `${name} description`,
  path: `/s/${name}`,
  host: 'local',
  ai: 'claude',
  scope: 'user',
  plugin: null,
  project: null,
  tools: [],
  model: null,
  skills: [],
  hash: `h-${name}`,
  bodyExcerpt: '',
  ...over
})

const a = entry('alpha')
const b = entry('beta', { scope: 'plugin', plugin: 'sp' })
const c = entry('gamma', { kind: 'agent', host: 'mini-pc', id: 'mini-pc:/s/gamma' })
const d = entry('delta', { ai: 'codex' })
const e = entry('eps', { scope: 'project', project: 'ai-interface' })
const all = [a, b, c, d, e]

describe('Skill-Filter', () => {
  it('sucht in Name, Beschreibung und Zusammenfassung', () => {
    expect(filterEntries(all, { ...DEFAULT_FILTERS, query: 'Gestalten' }, { 'h-alpha': 'Hilft beim Gestalten' })).toEqual([a])
    expect(filterEntries(all, { ...DEFAULT_FILTERS, query: 'beta desc' }, {})).toEqual([b])
  })

  it('zählt je Option ohne den eigenen Filter', () => {
    const counts = facetCounts(all, { ...DEFAULT_FILTERS, host: 'mini-pc', kind: 'skill' }, {}, 'host', (x) => x.host)
    expect(counts.get('local')).toBe(4)
    expect(counts.get('mini-pc')).toBeUndefined()
    expect(counts.get('all')).toBe(4)
  })
})

describe('Gruppierung', () => {
  it('ordnet nach Herkunft mit Plugin- und Projekt-Untergruppen', () => {
    const groups = groupEntries(all)
    expect(groups.map((g) => g.scope)).toEqual(['user', 'plugin', 'project'])
    expect(groups[1]?.subgroups[0]?.label).toBe('sp')
    expect(groups[2]?.subgroups[0]?.label).toBe('ai-interface')
    expect(groups[0]?.subgroups[0]?.entries[0]?.kind).toBe('agent')
  })

  it('fehlende Zusammenfassungen je Hash nur einmal', () => {
    const twin = entry('alpha', { id: 'mini-pc:/s/alpha', host: 'mini-pc' })
    expect(missingSummaryIds([a, twin, b], { 'h-beta': 'x' })).toEqual([a.id])
  })
})

describe('Beziehungen und Grafik', () => {
  const relations: SkillRelation[] = [
    { from: 'plugin:sp', to: b.id, kind: 'contains' },
    { from: c.id, to: 'tool:Read', kind: 'uses-tool' },
    { from: c.id, to: a.id, kind: 'mentions' }
  ]

  it('löst Beziehungen in beide Richtungen auf', () => {
    const byId = new Map(all.map((x) => [x.id, x]))
    const items = relationsFor(c, relations, byId)
    expect(items.map((i) => [i.kind, i.direction, i.label])).toEqual([
      ['uses-tool', 'out', 'Read'],
      ['mentions', 'out', 'alpha']
    ])
    expect(relationsFor(b, relations, byId)[0]).toMatchObject({ kind: 'contains', direction: 'in', label: 'sp', entry: null })
  })

  it('baut drei Spalten mit festem Zeilenabstand', () => {
    expect(sourceOf(d)).toBe('src:codex')
    const graph = buildGraph(all, relations)
    const entryNodes = graph.nodes.filter((n) => n.column === 'entry')
    expect(entryNodes).toHaveLength(all.length)
    expect((entryNodes[1]?.y ?? 0) - (entryNodes[0]?.y ?? 0)).toBe(GRAPH_ROW)
    expect(graph.nodes.filter((n) => n.column === 'tool').map((n) => n.label)).toEqual(['Read'])
    expect(graph.edges.filter((x) => x.kind === 'contains')).toHaveLength(all.length)
    expect(graph.neighbors.get(c.id)?.has(a.id)).toBe(true)
  })

  it('lässt Kanten zu ausgefilterten Einträgen weg', () => {
    const graph = buildGraph([c], relations)
    expect(graph.edges.some((x) => x.kind === 'mentions')).toBe(false)
  })
})
