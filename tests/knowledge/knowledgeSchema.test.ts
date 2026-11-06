import { describe, expect, it } from 'vitest'
import type { KnowledgeDraft, KnowledgeNode } from '@shared/knowledge'
import { knowledgeDraftSchema, projectKnowledgeSchema } from '../../src/main/knowledge/knowledgeSchema'

function node(id: string): KnowledgeNode {
  return { id, label: id.toUpperCase(), kind: 'service' }
}

const valid: KnowledgeDraft = {
  summary: 'Eine kurze Zusammenfassung.',
  architecture: {
    nodes: [node('a'), node('b'), node('c')],
    edges: [{ from: 'a', to: 'b', label: 'ruft' }]
  },
  features: [
    { name: 'Eins', where: 'src/a', status: 'fertig' },
    { name: 'Zwei', where: 'src/b', status: 'geplant' }
  ],
  timeline: [{ date: '2026-01-02', title: 'Start', links: [{ kind: 'commit', ref: 'abc1234' }] }],
  concepts: [{ term: 'Begriff', explanation: 'Ein Satz. Noch einer.' }],
  gaps: ['Unklar, wie X läuft.']
}

describe('knowledgeDraftSchema', () => {
  it('accepts a valid draft', () => {
    expect(knowledgeDraftSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects summary over 300 chars', () => {
    expect(knowledgeDraftSchema.safeParse({ ...valid, summary: 'x'.repeat(301) }).success).toBe(false)
  })

  it('rejects 13 nodes', () => {
    const nodes = Array.from({ length: 13 }, (_, i) => node(`n${i}`))
    const result = knowledgeDraftSchema.safeParse({ ...valid, architecture: { nodes, edges: [] } })
    expect(result.success).toBe(false)
  })

  it('rejects 9 concepts', () => {
    const concepts = Array.from({ length: 9 }, (_, i) => ({ term: `t${i}`, explanation: 'Kurz.' }))
    expect(knowledgeDraftSchema.safeParse({ ...valid, concepts }).success).toBe(false)
  })

  it('rejects edge pointing to unknown node', () => {
    const result = knowledgeDraftSchema.safeParse({
      ...valid,
      architecture: { nodes: valid.architecture.nodes, edges: [{ from: 'a', to: 'zz' }] }
    })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('zz')
  })

  it('rejects duplicate node ids', () => {
    const result = knowledgeDraftSchema.safeParse({ ...valid, architecture: { nodes: [node('a'), node('a')], edges: [] } })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('mehrfach')
  })

  it('rejects concept explanation with more than 3 sentences', () => {
    const concepts = [{ term: 't', explanation: 'A. B. C. D.' }]
    expect(knowledgeDraftSchema.safeParse({ ...valid, concepts }).success).toBe(false)
  })
})

describe('projectKnowledgeSchema', () => {
  const full = { ...valid, version: 1, generatedAt: 1, basedOn: { head: null, protocolDate: null } }

  it('accepts version 1', () => {
    expect(projectKnowledgeSchema.safeParse(full).success).toBe(true)
  })

  it('rejects version 2', () => {
    expect(projectKnowledgeSchema.safeParse({ ...full, version: 2 }).success).toBe(false)
  })
})
