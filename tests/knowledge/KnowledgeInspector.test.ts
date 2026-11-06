import { describe, expect, it } from 'vitest'
import type { ProjectKnowledge } from '@shared/knowledge'
import type { Favorite, ProtocolGroup } from '@shared/types'
import { KnowledgeInspector, type InspectedProject } from '../../src/main/knowledge/KnowledgeInspector'
import { KnowledgeStore } from '../../src/main/knowledge/KnowledgeStore'
import { FakeHost } from '../helpers/FakeHost'

const FILE = '/p/.ai-interface/projektwissen.json'
const HEAD = 'aaa111'
const NEW_HEAD = 'bbb222'
const COMMIT_TIME_S = 1_700_000_000

function favorite(id = 1, path = '/p'): Favorite {
  return { id, host: 'local', path, name: `P${id}`, color: '#fff', sortOrder: id, createdAt: 0, categoryId: null, starred: false, icon: null }
}

function knowledge(head: string | null, protocolDate: string | null): ProjectKnowledge {
  return {
    version: 1,
    generatedAt: 1_000,
    basedOn: { head, protocolDate },
    summary: 'Test.',
    architecture: { nodes: [], edges: [] },
    features: [],
    timeline: [],
    concepts: [],
    gaps: []
  }
}

function group(favoriteId: number, names: readonly string[]): ProtocolGroup {
  return {
    id: `g${favoriteId}`,
    label: 'Protokoll',
    favoriteId,
    color: null,
    icon: null,
    entries: names.map((name) => ({ path: `Protokoll/${name}`, name, size: 0, modifiedAt: 0 }))
  }
}

function gitHandler(head: string, options: { count?: string; knownBase?: string } = {}): (command: string) => { stdout: string; stderr: string; code: number } {
  return (command) => {
    if (command.includes('rev-parse HEAD')) return { stdout: `${head}\n`, stderr: '', code: 0 }
    if (command.includes('log -1 --format=%ct')) return { stdout: `${COMMIT_TIME_S}\n`, stderr: '', code: 0 }
    if (command.includes('rev-list --count HEAD')) return { stdout: `${options.count ?? '9'}\n`, stderr: '', code: 0 }
    if (command.includes('rev-list --count') && command.includes('..HEAD')) {
      return command.includes(`${options.knownBase ?? HEAD}..HEAD`) ? { stdout: '2\n', stderr: '', code: 0 } : { stdout: '', stderr: 'bad revision', code: 128 }
    }
    return { stdout: '', stderr: 'unexpected', code: 127 }
  }
}

function setup(groups: readonly ProtocolGroup[] = []): { host: FakeHost; inspector: KnowledgeInspector } {
  const host = new FakeHost()
  const inspector = new KnowledgeInspector({ host: () => host, store: new KnowledgeStore(), protocols: async () => groups })
  return { host, inspector }
}

async function inspectOne(inspector: KnowledgeInspector): Promise<InspectedProject> {
  const [result] = await inspector.inspect([favorite()])
  if (!result) throw new Error('Kein Ergebnis')
  return result
}

describe('KnowledgeInspector', () => {
  it('missing when no file', async () => {
    const { host, inspector } = setup([group(1, ['2026-01-02.md', 'notes.md', '2026-01-05.md'])])
    host.execHandler = gitHandler(HEAD)
    const result = await inspectOne(inspector)
    expect(result.status).toBe('missing')
    expect(result.knowledge).toBeNull()
    expect(result.current).toEqual({ head: HEAD, protocolDate: '2026-01-05' })
    expect(result.newProtocols).toBe(2)
    expect(result.newCommits).toBe(9)
    expect(result.lastActivity).toBe(new Date(2026, 0, 5).getTime())
  })

  it('invalid file counts as missing', async () => {
    const { host, inspector } = setup()
    host.setFile(FILE, '{')
    host.execHandler = gitHandler(HEAD)
    const result = await inspectOne(inspector)
    expect(result.status).toBe('missing')
    expect(result.knowledge).toBeNull()
  })

  it('current when head and protocol date unchanged', async () => {
    const { host, inspector } = setup([group(1, ['2026-01-05.md'])])
    host.setFile(FILE, JSON.stringify(knowledge(HEAD, '2026-01-05')))
    host.execHandler = gitHandler(HEAD)
    const result = await inspectOne(inspector)
    expect(result.status).toBe('current')
    expect(result.knowledge?.basedOn.head).toBe(HEAD)
    expect(result.newProtocols).toBe(0)
  })

  it('stale when HEAD moved', async () => {
    const { host, inspector } = setup()
    host.setFile(FILE, JSON.stringify(knowledge(HEAD, null)))
    host.execHandler = gitHandler(NEW_HEAD)
    const result = await inspectOne(inspector)
    expect(result.status).toBe('stale')
    expect(result.newCommits).toBe(2)
  })

  it('stale when HEAD is unknown to the repo: counts all commits', async () => {
    const { host, inspector } = setup()
    host.setFile(FILE, JSON.stringify(knowledge('fade000', null)))
    host.execHandler = gitHandler(NEW_HEAD, { count: '7' })
    const result = await inspectOne(inspector)
    expect(result.status).toBe('stale')
    expect(result.newCommits).toBe(7)
  })

  it('stale when newer protocol exists', async () => {
    const { host, inspector } = setup([group(1, ['2026-01-05.md', '2026-01-06.md'])])
    host.setFile(FILE, JSON.stringify(knowledge(HEAD, '2026-01-05')))
    host.execHandler = gitHandler(HEAD)
    const result = await inspectOne(inspector)
    expect(result.status).toBe('stale')
    expect(result.newProtocols).toBe(1)
    expect(result.newCommits).toBe(0)
    expect(result.lastActivity).toBe(new Date(2026, 0, 6).getTime())
  })

  it('no git: head null, not stale only because of git', async () => {
    const { host, inspector } = setup()
    host.setFile(FILE, JSON.stringify(knowledge(null, null)))
    host.execHandler = () => ({ stdout: '', stderr: 'not a git repository', code: 128 })
    const result = await inspectOne(inspector)
    expect(result.current.head).toBeNull()
    expect(result.newCommits).toBe(0)
    expect(result.lastActivity).toBe(0)
    expect(result.status).toBe('current')
  })

  it('unreachable when host offline, other projects unaffected', async () => {
    const offline = new FakeHost()
    offline.offline = true
    const online = new FakeHost()
    online.execHandler = gitHandler(HEAD)
    const inspector = new KnowledgeInspector({
      host: (id) => (id === 'off' ? offline : online),
      store: new KnowledgeStore(),
      protocols: async () => []
    })
    const results = await inspector.inspect([{ ...favorite(1), host: 'off' }, favorite(2)])
    expect(results.map((r) => r.status)).toEqual(['unreachable', 'missing'])
  })

  it('other errors mark only that project as failed', async () => {
    const online = new FakeHost()
    online.execHandler = gitHandler(HEAD)
    const inspector = new KnowledgeInspector({
      host: (id) => {
        if (id === 'weg') throw new Error('Gerät „weg“ nicht gefunden')
        return online
      },
      store: new KnowledgeStore(),
      protocols: async () => []
    })
    const results = await inspector.inspect([{ ...favorite(1), host: 'weg' }, favorite(2)])
    expect(results.map((r) => r.status)).toEqual(['failed', 'missing'])
    expect(results[0]?.error).toMatch(/nicht gefunden/)
  })
})
