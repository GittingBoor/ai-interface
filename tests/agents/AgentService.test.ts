import { describe, expect, it } from 'vitest'
import { agentTemplates } from '@shared/agents'
import { MESSAGES } from '@shared/i18n/messages'
import type { Favorite } from '@shared/types'
import { AgentService } from '../../src/main/agents/AgentService'
import { FakeHost } from '../helpers/FakeHost'

const PROJECT = { id: 1, host: 'local', path: '/home/alex/projects/demo', name: 'Demo' } as unknown as Favorite
const REVIEWER = agentTemplates(MESSAGES.de.agents)[0]!.definition

function setup(answer = ''): { host: FakeHost; service: AgentService; prompts: string[] } {
  const host = new FakeHost('local')
  const prompts: string[] = []
  const service = new AgentService({
    hosts: () => host,
    projects: () => [PROJECT],
    assist: async (_model, prompt) => {
      prompts.push(prompt)
      return answer
    }
  })
  return { host, service, prompts }
}

describe('AgentService', () => {
  it('speichert global und im Projekt', async () => {
    const { host, service } = setup()
    const user = await service.save({ host: 'local', scope: 'user', projectPath: null, definition: REVIEWER, previousPath: null })
    expect(user.path).toBe('/home/alex/.claude/agents/code-reviewer.md')
    const project = await service.save({ host: 'local', scope: 'project', projectPath: PROJECT.path, definition: REVIEWER, previousPath: null })
    expect(project.path).toBe('/home/alex/projects/demo/.claude/agents/code-reviewer.md')
    expect((await service.read('local', project.path)).definition).toEqual(REVIEWER)
    expect(host.text(user.path)).toContain('name: code-reviewer')
  })

  it('überschreibt keinen fremden Agent gleichen Namens', async () => {
    const { service } = setup()
    await service.save({ host: 'local', scope: 'user', projectPath: null, definition: REVIEWER, previousPath: null })
    await expect(service.save({ host: 'local', scope: 'user', projectPath: null, definition: REVIEWER, previousPath: null })).rejects.toMatchObject({ code: 'AGENT_EXISTS' })
  })

  it('benennt um, entfernt die alte Datei und behält unbekannte Felder', async () => {
    const { host, service } = setup()
    const old = '/home/alex/.claude/agents/alt.md'
    host.setFile(old, '---\nname: alt\ndescription: x\nhooks:\n  Stop:\n    - type: command\n---\nText')
    const doc = await service.read('local', old)
    expect(doc.preservedKeys).toEqual(['hooks'])
    const saved = await service.save({ host: 'local', scope: 'user', projectPath: null, definition: { ...doc.definition, name: 'neu', description: 'Neu beschrieben' }, previousPath: old })
    expect(host.files.has(old)).toBe(false)
    expect(host.text(saved.path)).toContain('hooks:\n  Stop:\n    - type: command')
  })

  it('lehnt ungültige Namen, fremde Projekte und Plugin-Dateien ab', async () => {
    const { service } = setup()
    await expect(service.save({ host: 'local', scope: 'user', projectPath: null, definition: { ...REVIEWER, name: 'Mit Leerzeichen' }, previousPath: null })).rejects.toMatchObject({ code: 'VALIDATION' })
    await expect(service.save({ host: 'local', scope: 'project', projectPath: '/anderswo', definition: REVIEWER, previousPath: null })).rejects.toMatchObject({ code: 'VALIDATION' })
    await expect(service.remove('local', '/home/alex/.claude/plugins/cache/x/agents/a.md')).rejects.toMatchObject({ code: 'VALIDATION' })
  })

  it('übersetzt den KI-Entwurf und filtert unbekannte Skills und Alles-erlaubt', async () => {
    const answer = 'Hier:\n```json\n' + JSON.stringify({ name: 'Log Leser', description: 'Liest Logs. Use when Fehler auftreten.', tools: ['Read'], permissionMode: 'bypassPermissions', skills: ['dataviz', 'gibtsnicht'], prompt: 'Lies Logs.', notes: ['Nur lesen'] }) + '\n```'
    const { service, prompts } = setup(answer)
    const result = await service.assist({ mode: 'create', idea: 'Ein Agent, der Logdateien auswertet', current: null, availableSkills: ['dataviz'] })
    expect(result.definition).toMatchObject({ name: 'log-leser', permissionMode: null, skills: ['dataviz'] })
    expect(result.notes).toEqual(['Nur lesen'])
    expect(prompts[0]).toContain('Logdateien auswertet')
  })
})
