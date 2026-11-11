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
  concepts: [{ term: 'Begriff', short: 'Kurz gesagt.', explanation: 'Ein Satz. Noch einer.', links: [{ title: 'Doku', url: 'https://example.org/doku' }] }],
  gaps: ['Unklar, wie X läuft.'],
  flows: [{ title: 'Speichern', question: 'Was passiert beim Speichern?', steps: [{ from: 'UI', to: 'Dienst', label: 'sendet Daten' }] }],
  orientation: { start: [{ label: 'Starten', command: 'npm run dev' }], readFirst: [{ path: 'src/main.ts', why: 'Einstieg' }] },
  pitfalls: [{ title: 'Zeilenenden', detail: 'Tests prüfen CRLF.', where: 'tests' }],
  resources: [{ title: 'Electron', url: 'https://www.electronjs.org/docs', about: 'Offizielle Doku' }]
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
    const concepts = Array.from({ length: 9 }, (_, i) => ({ term: `t${i}`, short: 'k', explanation: 'Kurz.', links: [] }))
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
    const concepts = [{ term: 't', short: 'k', explanation: 'A. B. C. D.', links: [] }]
    expect(knowledgeDraftSchema.safeParse({ ...valid, concepts }).success).toBe(false)
  })
})

describe('knowledgeDraftSchema (Fassung 2)', () => {
  it('rejects a draft without flows', () => {
    const { flows: _f, ...rest } = valid
    expect(knowledgeDraftSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects links without http(s)', () => {
    const resources = [{ title: 'X', url: 'javascript:alert(1)', about: 'nein' }]
    expect(knowledgeDraftSchema.safeParse({ ...valid, resources }).success).toBe(false)
  })

  it('rejects a flow with more than 7 participants', () => {
    const steps = Array.from({ length: 8 }, (_, i) => ({ from: `p${i}`, to: `q${i}`, label: 'x' }))
    expect(knowledgeDraftSchema.safeParse({ ...valid, flows: [{ title: 'T', question: 'F?', steps }] }).success).toBe(false)
  })

  it('rejects paths outside the project', () => {
    const orientation = { start: [], readFirst: [{ path: '../geheim.txt', why: 'nein' }] }
    expect(knowledgeDraftSchema.safeParse({ ...valid, orientation }).success).toBe(false)
  })
})

describe('projectKnowledgeSchema', () => {
  const full = { ...valid, version: 2, generatedAt: 1, basedOn: { head: null, protocolDate: null } }

  it('accepts version 2', () => {
    expect(projectKnowledgeSchema.safeParse(full).success).toBe(true)
  })

  it('accepts version 1 without the newer fields', () => {
    const { flows: _f, orientation: _o, pitfalls: _p, resources: _r, ...core } = valid
    const v1 = { ...core, concepts: [{ term: 'Alt', explanation: 'Nur Erklärung.' }], version: 1, generatedAt: 1, basedOn: { head: null, protocolDate: null } }
    expect(projectKnowledgeSchema.safeParse(v1).success).toBe(true)
  })

  it('rejects version 3', () => {
    expect(projectKnowledgeSchema.safeParse({ ...full, version: 3 }).success).toBe(false)
  })
})
