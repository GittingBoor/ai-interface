import { describe, expect, it } from 'vitest'
import type { Favorite } from '@shared/types'
import { parseFrontmatter } from '../../src/main/skills/frontmatter'
import { buildRelations } from '../../src/main/skills/relations'
import { SkillCatalog } from '../../src/main/skills/SkillCatalog'
import { FakeHost } from '../helpers/FakeHost'

describe('parseFrontmatter', () => {
  it('liest einfache Werte, Anführungszeichen, Listen und mehrzeilige Texte', () => {
    const text = [
      '---',
      'name: webbuilder',
      'description: "Baut Websites: schnell, schön"',
      "model: 'sonnet'",
      'tools: WebSearch, WebFetch, Read',
      'skills: [impeccable, frontend-design]',
      'tags:',
      '  - a',
      '  - b',
      'long: >',
      '  erste Zeile',
      '  zweite Zeile',
      '---',
      '# Titel',
      'Text'
    ].join('\r\n')
    const { data, body } = parseFrontmatter(text)
    expect(data).toEqual({
      name: 'webbuilder',
      description: 'Baut Websites: schnell, schön',
      model: 'sonnet',
      tools: 'WebSearch, WebFetch, Read',
      skills: ['impeccable', 'frontend-design'],
      tags: ['a', 'b'],
      long: 'erste Zeile zweite Zeile'
    })
    expect(body.trim()).toBe('# Titel\nText')
  })

  it('liefert ohne Frontmatter den ganzen Text als Inhalt', () => {
    expect(parseFrontmatter('# Nur Text\n')).toEqual({ data: {}, body: '# Nur Text\n' })
  })
})

const fav = (path: string, name: string): Favorite => ({
  id: 1,
  host: 'mini-pc',
  path,
  name,
  color: '#e08a4f',
  sortOrder: 0,
  createdAt: 0,
  categoryId: null,
  starred: true,
  icon: null
})

function catalogHost(): FakeHost {
  const h = new FakeHost('mini-pc', '/home/alex')
  const skill = (name: string, extra = ''): string => `---\nname: ${name}\ndescription: Kann ${name}.\n${extra}---\nInhalt von ${name}\n`
  h.setFile('/home/alex/.claude/skills/impeccable/SKILL.md', skill('impeccable'))
  h.setFile('/home/alex/.claude/skills/synced/bucket-1/deep-research/SKILL.md', skill('deep-research'))
  h.setFile('/home/alex/.claude/skills-disabled/alt/SKILL.md', skill('alt'))
  h.setFile(
    '/home/alex/.claude/agents/webbuilder.md',
    '---\nname: webbuilder\ndescription: Baut Websites.\ntools: Read, Write, Bash\nskills: [impeccable]\nmodel: inherit\n---\nNutze immer den Skill `brainstorming` und /impeccable. Design ist wichtig.\n'
  )
  h.setFile('/home/alex/.claude/commands/deploy.md', '---\ndescription: Deployt.\n---\nMach es.\n')
  h.setFile(
    '/home/alex/.claude/plugins/installed_plugins.json',
    JSON.stringify({ version: 2, plugins: { 'superpowers@claude-plugins-official': [{ scope: 'user', installPath: '/home/alex/.claude/plugins/cache/sp/1.0' }] } })
  )
  h.setFile('/home/alex/.claude/plugins/cache/sp/1.0/skills/brainstorming/SKILL.md', skill('brainstorming'))
  h.setFile('/home/alex/.claude/plugins/cache/sp/1.0/agents/code-reviewer.md', '---\nname: code-reviewer\ndescription: Prüft Code.\n---\n')
  h.setFile('/home/alex/projects/wetter/.claude/agents/kurator.md', '---\nname: kurator\ndescription: Kuratiert.\n---\n')
  h.setFile('/home/alex/.codex/skills/figma/SKILL.md', skill('figma'))
  h.setFile('/home/alex/.claude/skills/kaputt/SKILL.md', Buffer.from([0xff, 0xfe, 0x00]))
  return h
}

describe('SkillCatalog', () => {
  it('findet Skills, Agents und Befehle aus allen Orten mit Herkunft und KI', async () => {
    const result = await new SkillCatalog(catalogHost(), () => [fav('/home/alex/projects/wetter', 'Wetter')]).scan()
    const summary = result.entries.map((e) => [e.kind, e.name, e.scope, e.ai, e.plugin, e.project]).sort((a, b) => String(a[1]).localeCompare(String(b[1])))
    expect(summary).toEqual([
      ['skill', 'alt', 'disabled', 'claude', null, null],
      ['skill', 'brainstorming', 'plugin', 'claude', 'superpowers', null],
      ['agent', 'code-reviewer', 'plugin', 'claude', 'superpowers', null],
      ['skill', 'deep-research', 'synced', 'claude', null, null],
      ['command', 'deploy', 'user', 'claude', null, null],
      ['skill', 'figma', 'user', 'codex', null, null],
      ['skill', 'impeccable', 'user', 'claude', null, null],
      ['skill', 'kaputt', 'user', 'claude', null, null],
      ['agent', 'kurator', 'project', 'claude', null, 'Wetter'],
      ['agent', 'webbuilder', 'user', 'claude', null, null]
    ])
    const web = result.entries.find((e) => e.name === 'webbuilder')
    expect(web).toMatchObject({ host: 'mini-pc', tools: ['Read', 'Write', 'Bash'], skills: ['impeccable'], model: 'inherit', description: 'Baut Websites.' })
    expect(web?.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(web?.id).toBe('mini-pc:/home/alex/.claude/agents/webbuilder.md')
  })

  it('sammelt Fehler, ohne abzubrechen, und kommt ohne Ordner aus', async () => {
    const empty = new FakeHost('local', '/home/leer')
    empty.setFile('/home/leer/x.txt', 'x')
    expect(await new SkillCatalog(empty, () => []).scan()).toEqual({ host: 'local', entries: [], relations: [], errors: [] })
  })
})

describe('buildRelations', () => {
  it('verbindet Plugins, Tools, genutzte und erwähnte Skills', async () => {
    const { entries } = await new SkillCatalog(catalogHost(), () => []).scan()
    const relations = buildRelations(entries)
    const id = (name: string): string => entries.find((e) => e.name === name)?.id ?? name
    expect(relations).toEqual(
      expect.arrayContaining([
        { from: 'plugin:superpowers', to: id('brainstorming'), kind: 'contains' },
        { from: 'plugin:superpowers', to: id('code-reviewer'), kind: 'contains' },
        { from: id('webbuilder'), to: 'tool:Read', kind: 'uses-tool' },
        { from: id('webbuilder'), to: id('impeccable'), kind: 'uses-skill' },
        { from: id('webbuilder'), to: id('brainstorming'), kind: 'mentions' }
      ])
    )
    // „impeccable“ ist schon „uses-skill“, „Design“ im Fließtext ist keine Erwähnung eines Skills
    expect(relations.filter((r) => r.from === id('webbuilder') && r.to === id('impeccable'))).toHaveLength(1)
  })
})
