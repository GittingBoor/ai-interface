import { describe, expect, it } from 'vitest'
import type { ProjectKnowledge } from '@shared/knowledge'
import { HostUnreachableError } from '../../src/main/errors'
import { KnowledgeStore } from '../../src/main/knowledge/KnowledgeStore'
import { FakeHost } from '../helpers/FakeHost'

const FILE = '/p/.ai-interface/projektwissen.json'
const EXCLUDE = '/p/.git/info/exclude'

const KNOWLEDGE: ProjectKnowledge = {
  version: 2,
  generatedAt: 1_000,
  basedOn: { head: null, protocolDate: null },
  summary: 'Test.',
  architecture: { nodes: [], edges: [] },
  features: [],
  timeline: [],
  concepts: [],
  gaps: []
}

describe('KnowledgeStore', () => {
  const store = new KnowledgeStore()

  it('read returns missing when file absent', async () => {
    expect(await store.read(new FakeHost(), '/p')).toEqual({ kind: 'missing' })
  })

  it('read returns invalid for broken JSON and wrong schema', async () => {
    const host = new FakeHost()
    host.setFile(FILE, '{')
    const broken = await store.read(host, '/p')
    expect(broken.kind).toBe('invalid')
    host.setFile(FILE, '{"version": 1}')
    expect((await store.read(host, '/p')).kind).toBe('invalid')
  })

  it('read propagates other host errors', async () => {
    const host = new FakeHost()
    host.setFile(FILE, '{}')
    host.offline = true
    await expect(store.read(host, '/p')).rejects.toBeInstanceOf(HostUnreachableError)
  })

  it('write creates file and appends exclude once', async () => {
    const host = new FakeHost()
    host.setFile(EXCLUDE, '# kommentar\n*.log\n')
    await store.write(host, '/p', KNOWLEDGE)
    await store.write(host, '/p', KNOWLEDGE)
    const lines = host.text(EXCLUDE).split('\n').filter((l) => l === '.ai-interface/')
    expect(lines).toHaveLength(1)
    expect(host.text(EXCLUDE)).toBe('# kommentar\n*.log\n.ai-interface/\n')
    expect(host.files.has('/p/.gitignore')).toBe(false)
    expect(host.text(FILE)).toBe(JSON.stringify(KNOWLEDGE, null, 2))
  })

  it('write without git repo', async () => {
    const host = new FakeHost()
    await store.write(host, '/p', KNOWLEDGE)
    expect(host.files.has(EXCLUDE)).toBe(false)
    expect(host.files.has(FILE)).toBe(true)
  })

  it('exclude without trailing newline', async () => {
    const host = new FakeHost()
    host.setFile(EXCLUDE, 'node_modules')
    await store.write(host, '/p', KNOWLEDGE)
    expect(host.text(EXCLUDE)).toBe('node_modules\n.ai-interface/\n')
  })
})
