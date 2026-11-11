import { describe, expect, it } from 'vitest'
import type { KnowledgeDraft, ProjectKnowledge } from '@shared/knowledge'
import type { Favorite, ProtocolEntry } from '@shared/types'
import { NotFoundError } from '../../src/main/errors'
import type { InspectedProject } from '../../src/main/knowledge/KnowledgeInspector'
import { createKnowledgeTools } from '../../src/main/knowledge/knowledgeTools'
import { KNOWLEDGE_CLAUDE_MD, KNOWLEDGE_FORMAT_MD, knowledgeStartPrompt } from '../../src/main/knowledge/knowledgePrompt'
import { FakeHost } from '../helpers/FakeHost'

const HEAD = 'abc1234def5678'
const PROTOCOLS: ProtocolEntry[] = [{ path: 'Projekte/App/Protokoll/2026-10-19.md', name: '2026-10-19.md', modifiedAt: 0, size: 10 }]

const VALID_DRAFT: KnowledgeDraft = {
  summary: 'Eine App, die Dinge zeigt.',
  architecture: { nodes: [{ id: 'ui', label: 'Oberfläche', kind: 'ui' }], edges: [] },
  features: [{ name: 'Liste', where: 'src/list.ts', status: 'fertig' }],
  timeline: [{ date: '2026-10-19', title: 'Start', links: [{ kind: 'commit', ref: 'abc1234' }] }],
  concepts: [],
  gaps: [],
  flows: [], orientation: { start: [], readFirst: [] }, pitfalls: [], resources: []
}

function favorite(): Favorite {
  return { id: 1, host: 'local', path: '/p', name: 'App', color: '#fff', sortOrder: 0, createdAt: 0, categoryId: null, starred: false, icon: null }
}

function inspected(knowledge: ProjectKnowledge | null = null, head: string | null = HEAD): InspectedProject {
  return {
    favorite: favorite(),
    status: knowledge ? 'stale' : 'missing',
    knowledge,
    current: { head, protocolDate: '2026-10-19' },
    newProtocols: 1,
    newCommits: 3,
    lastActivity: 0
  }
}

function setup(project: InspectedProject = inspected()) {
  const host = new FakeHost()
  const commands: string[] = []
  host.execHandler = (command) => {
    commands.push(command)
    return { stdout: 'abc1234 (Start, 2026-10-19)\n', stderr: '', code: 0 }
  }
  host.setFile('/p/src/a.ts', 'export const a = 1')
  host.setFile('/p/README.md', '# App')
  const saved: KnowledgeDraft[] = []
  const finished: string[] = []
  const tools = createKnowledgeTools({
    project,
    hostLabel: 'Dieser PC',
    host: () => host,
    protocols: async () => PROTOCOLS,
    readProtocol: async (path) => {
      if (!PROTOCOLS.some((p) => p.path === path)) throw new NotFoundError(`Protokoll ${path}`)
      return 'Protokolltext'
    },
    stats: async () => null,
    save: async (draft) => {
      saved.push(draft)
    },
    finish: (summary) => finished.push(summary)
  })
  const run = (name: string, input: unknown): Promise<string> => {
    const tool = tools.find((t) => t.name === name)
    if (!tool) throw new Error(`Werkzeug ${name} fehlt`)
    return tool.run(input)
  }
  return { tools, run, commands, saved, finished, host }
}

describe('Werkzeuge des Projektwissens', () => {
  it('tools are bound to one project', async () => {
    const t = setup()
    expect(t.tools.map((tool) => tool.name)).toEqual([
      'project_info',
      'read_knowledge',
      'list_protocols',
      'read_protocol',
      'git_log',
      'git_show_stat',
      'git_grep',
      'list_files',
      'project_stats',
      'read_project_file',
      'save_knowledge',
      'finish'
    ])
    for (const tool of t.tools) {
      expect(Object.keys(tool.schema)).not.toContain('favoriteId')
      expect(Object.keys(tool.schema)).not.toContain('groupId')
    }
    await t.run('git_log', {})
    expect(t.commands[0]).toBe(`git -C '/p' log -n 40 --pretty=reference`)
  })

  it('git_log since und git_show_stat prüfen den Hash', async () => {
    const t = setup()
    await t.run('git_log', { since: 'abc1234', limit: 5 })
    expect(t.commands[0]).toBe(`git -C '/p' log -n 5 --pretty=reference abc1234..HEAD`)
    await t.run('git_show_stat', { ref: 'abc1234' })
    expect(t.commands[1]).toBe(`git -C '/p' show --stat --format=medium --date=short abc1234`)
    await expect(t.run('git_log', { since: 'HEAD; rm -rf /' })).rejects.toThrow(/Ungültige Eingabe/)
    await expect(t.run('git_show_stat', { ref: '--output=x' })).rejects.toThrow(/Ungültige Eingabe/)
  })

  it('git_grep quotiert den Suchtext', async () => {
    const t = setup()
    await t.run('git_grep', { text: "it's" })
    expect(t.commands[0]).toBe(`git -C '/p' grep -n -I -F -i --max-count=5 -e 'it'\\''s'`)
  })

  it('project_info nennt Projekt, Stand und Neues', async () => {
    const info = JSON.parse(await setup().run('project_info', {})) as Record<string, unknown>
    expect(info).toMatchObject({
      name: 'App',
      device: 'Dieser PC',
      path: '/p',
      shell: 'posix',
      status: 'missing',
      current: { head: HEAD, protocolDate: '2026-10-19' },
      basedOn: null,
      newProtocols: 1,
      newCommits: 3
    })
  })

  it('read_knowledge liefert null ohne Wissen', async () => {
    expect(await setup().run('read_knowledge', {})).toBe('null')
  })

  it('list_files nutzt git ls-files mit Git und readDir ohne Git', async () => {
    const withGit = setup()
    await withGit.run('list_files', { dir: 'src' })
    expect(withGit.commands[0]).toBe(`git -C '/p' ls-files -- 'src'`)
    const noGit = setup(inspected(null, null))
    const listing = await noGit.run('list_files', {})
    expect(listing.split('\n').sort()).toEqual(['README.md', 'src/'])
    expect(noGit.commands).toEqual([])
    await expect(noGit.run('list_files', { dir: '../x' })).rejects.toThrow(/relativ/)
  })

  it('read_project_file rejects ..', async () => {
    const t = setup()
    await expect(t.run('read_project_file', { path: '../secret' })).rejects.toThrow(/relativ/)
    await expect(t.run('read_project_file', { path: '/etc/passwd' })).rejects.toThrow(/relativ/)
    expect(await t.run('read_project_file', { path: 'src/a.ts' })).toBe('export const a = 1')
  })

  it('read_protocol rejects path of another group', async () => {
    const t = setup()
    expect(await t.run('read_protocol', { path: PROTOCOLS[0]?.path })).toBe('Protokolltext')
    await expect(t.run('read_protocol', { path: 'Projekte/Andere/Protokoll/2026-10-01.md' })).rejects.toThrow(NotFoundError)
    expect(JSON.parse(await t.run('list_protocols', {}))).toEqual([{ path: PROTOCOLS[0]?.path, name: '2026-10-19.md', size: 10 }])
  })

  it('save_knowledge rejects invalid draft with readable issues', async () => {
    const t = setup()
    const invalid = { ...VALID_DRAFT, summary: 'x'.repeat(301), features: [{ name: 'a', where: 'b', status: 'kaputt' }] }
    const error = await t.run('save_knowledge', { knowledge: invalid }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(Error)
    const message = (error as Error).message
    expect(message).toMatch(/summary: summary hat 301 Zeichen/)
    expect(message).toMatch(/features\.0\.status/)
    expect(t.saved).toEqual([])
  })

  it('save_knowledge passes valid draft to deps.save', async () => {
    const t = setup()
    expect(await t.run('save_knowledge', { knowledge: VALID_DRAFT })).toMatch(/gespeichert/)
    expect(t.saved).toEqual([VALID_DRAFT])
  })

  it('finish calls deps.finish', async () => {
    const t = setup()
    await t.run('finish', { summary: 'Fertig.' })
    expect(t.finished).toEqual(['Fertig.'])
  })
})

describe('Startprompt und CLAUDE.md', () => {
  it('nennt ersten Lauf oder Folgelauf', () => {
    expect(knowledgeStartPrompt(inspected(), 'de')).toMatch(/Erster Lauf/)
    const knowledge: ProjectKnowledge = { version: 2, generatedAt: 0, basedOn: { head: HEAD, protocolDate: '2026-10-01' }, ...VALID_DRAFT }
    const followUp = knowledgeStartPrompt(inspected(knowledge), 'de')
    expect(followUp).toMatch(/Folgelauf seit abc1234\/2026-10-01/)
    expect(followUp).toContain('App')
    expect(followUp.split('\n').length).toBeLessThanOrEqual(6)
  })

  it('gibt dem Agenten die Sprache der App vor', () => {
    expect(knowledgeStartPrompt(inspected(), 'en')).toMatch(/Always respond in English/)
    expect(knowledgeStartPrompt(inspected(), 'ja')).toMatch(/in Japanese/)
  })

  it('CLAUDE.md and FORMAT.md contain no personal data and name all tools and fields', () => {
    for (const text of [KNOWLEDGE_CLAUDE_MD, KNOWLEDGE_FORMAT_MD]) expect(text).not.toMatch(/Users\\|192\.168\.|benni/i)
    for (const tool of ['project_info', 'read_knowledge', 'project_stats', 'save_knowledge', 'finish', 'git_show_stat', 'list_files', 'WebSearch']) {
      expect(KNOWLEDGE_FORMAT_MD).toContain(tool)
    }
    for (const field of ['flows', 'orientation', 'pitfalls', 'resources', 'concepts']) expect(KNOWLEDGE_FORMAT_MD).toContain(`\`${field}\``)
  })
})
