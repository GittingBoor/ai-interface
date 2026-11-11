import { describe, expect, it } from 'vitest'
import type { ProjectKnowledge } from '../../src/shared/knowledge'
import { presentSections } from '../../src/renderer/src/views/knowledge/knowledgeSections'

const VERSION_ONE: ProjectKnowledge = {
  version: 1,
  generatedAt: 0,
  basedOn: { head: null, protocolDate: null },
  summary: 'Kurz',
  architecture: { nodes: [{ id: 'a', label: 'A', kind: 'ui' }], edges: [] },
  features: [{ name: 'F', where: 'src', status: 'fertig' }],
  timeline: [],
  concepts: [{ term: 'T', explanation: 'E' }],
  gaps: []
}

describe('presentSections', () => {
  it('Fassung 1 zeigt nur Abschnitte mit Inhalt', () => {
    expect(presentSections(VERSION_ONE).map((s) => s.id)).toEqual(['overview', 'architecture', 'features', 'concepts'])
  })

  it('leere neue Felder und Abläufe ohne Schritte bleiben ausgeblendet', () => {
    const knowledge: ProjectKnowledge = {
      ...VERSION_ONE,
      version: 2,
      flows: [{ title: 'X', question: 'Y', steps: [] }],
      orientation: { start: [], readFirst: [] },
      pitfalls: [],
      resources: []
    }
    expect(presentSections(knowledge).map((s) => s.id)).toEqual(['overview', 'architecture', 'features', 'concepts'])
  })

  it('zählt Einträge für das Inhaltsverzeichnis', () => {
    const knowledge: ProjectKnowledge = { ...VERSION_ONE, gaps: ['a', 'b'], resources: [{ title: 'R', url: 'https://example.org', about: 'x' }] }
    const entries = presentSections(knowledge)
    expect(entries.find((e) => e.id === 'gaps')?.count).toBe(2)
    expect(entries.find((e) => e.id === 'resources')?.count).toBe(1)
    expect(entries.find((e) => e.id === 'overview')?.count).toBeUndefined()
  })
})
