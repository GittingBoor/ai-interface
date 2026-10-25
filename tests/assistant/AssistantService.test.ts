import { describe, expect, it } from 'vitest'
import type { AssistantEvent } from '@shared/types'
import { AssistantService, type AgentMessage, type RunOptions } from '../../src/main/assistant/AssistantService'
import type { AssistantTool } from '../../src/main/assistant/tools'

const tool = (name: string, mutating: boolean): AssistantTool => ({
  name,
  description: name,
  schema: {},
  mutating,
  preview: () => `Vorschau ${name}`,
  run: async () => 'ok'
})

const TOOLS = [tool('list_projects', false), tool('create_project_folder', true)]

type Script = (options: RunOptions) => AsyncGenerator<AgentMessage>

function setup(script: Script, confirmTimeoutMs = 1_000) {
  const events: AssistantEvent[] = []
  const calls: RunOptions[] = []
  const service = new AssistantService({
    run: (prompt, options) => {
      calls.push(options)
      return script(options)
    },
    tools: TOOLS,
    emit: (e) => events.push(e),
    confirmTimeoutMs
  })
  return { service, events, calls }
}

const answer = (text: string): AgentMessage => ({ type: 'assistant', message: { content: [{ type: 'text', text }] } })
const result = (session: string, isError = false): AgentMessage => ({ type: 'result', session_id: session, is_error: isError })

describe('AssistantService', () => {
  it('streamt Text, merkt sich die Session und setzt sie beim nächsten Mal fort', async () => {
    const { service, events, calls } = setup(async function* () {
      yield { type: 'system', subtype: 'init', session_id: 's1' }
      yield answer('Hallo Alex')
      yield result('s1')
    })
    await service.send('Hi')
    await service.send('Noch was')
    expect(events.filter((e) => e.type === 'text').map((e) => (e.type === 'text' ? e.text : ''))).toEqual(['Hallo Alex', 'Hallo Alex'])
    expect(events.filter((e) => e.type === 'done')).toHaveLength(2)
    expect(calls[0]?.resume).toBeUndefined()
    expect(calls[1]?.resume).toBe('s1')
    service.reset()
    await service.send('Neu')
    expect(calls[2]?.resume).toBeUndefined()
  })

  it('sperrt Schlüssel-, Anmelde- und .env-Dateien auch für die eingebauten Lesewerkzeuge', async () => {
    const decisions: string[] = []
    const { service } = setup(async function* (options) {
      const inputs: [string, Record<string, unknown>][] = [
        ['Read', { file_path: 'C:\\Users\\B\\.ssh\\id_ed25519' }],
        ['Read', { file_path: 'C:/Users/B/.claude/.credentials.json' }],
        ['Read', { file_path: '/home/alex/projects/x/.env' }],
        ['Grep', { pattern: 'token', path: 'C:\\Users\\B\\.ssh' }],
        ['Glob', { pattern: '**/.env.local' }],
        ['Read', { file_path: 'D:\\GitHub\\CLAUDE.md' }],
        ['Grep', { pattern: 'environment', path: 'D:\\GitHub' }]
      ]
      for (const [name, input] of inputs) decisions.push((await options.canUseTool(name, input)).behavior)
      yield result('s')
    })
    await service.send('x')
    expect(decisions).toEqual(['deny', 'deny', 'deny', 'deny', 'deny', 'allow', 'allow'])
  })

  it('erlaubt Lesewerkzeuge und eingebaute Lesetools ohne Rückfrage, verbietet Unbekanntes', async () => {
    const decisions: string[] = []
    const { service, events } = setup(async function* (options) {
      for (const name of ['mcp__aii__list_projects', 'Read', 'Grep', 'Bash', 'Write', 'mcp__fremd__x']) {
        const d = await options.canUseTool(name, {})
        decisions.push(`${name}:${d.behavior}`)
      }
      yield result('s')
    })
    await service.send('x')
    expect(decisions).toEqual(['mcp__aii__list_projects:allow', 'Read:allow', 'Grep:allow', 'Bash:deny', 'Write:deny', 'mcp__fremd__x:deny'])
    expect(events.some((e) => e.type === 'confirm')).toBe(false)
  })

  it('fragt bei ändernden Werkzeugen nach und folgt der Antwort', async () => {
    const decisions: string[] = []
    const { service, events } = setup(async function* (options) {
      decisions.push((await options.canUseTool('mcp__aii__create_project_folder', { name: 'X' })).behavior)
      decisions.push((await options.canUseTool('mcp__aii__create_project_folder', { name: 'Y' })).behavior)
      yield result('s')
    })
    const running = service.send('leg an')
    const answerNext = async (allow: boolean): Promise<void> => {
      await new Promise((r) => setTimeout(r, 10))
      const confirm = [...events].reverse().find((e) => e.type === 'confirm')
      if (confirm?.type !== 'confirm') throw new Error('keine Rückfrage')
      expect(confirm.preview).toBe('Vorschau create_project_folder')
      service.confirm(confirm.requestId, allow)
    }
    await answerNext(true)
    await answerNext(false)
    await running
    expect(decisions).toEqual(['allow', 'deny'])
    expect(events.filter((e) => e.type === 'confirm-resolved').map((e) => (e.type === 'confirm-resolved' ? e.allowed : null))).toEqual([true, false])
  })

  it('lehnt nach Zeitablauf ab', async () => {
    let decision = ''
    const { service } = setup(async function* (options) {
      decision = (await options.canUseTool('mcp__aii__create_project_folder', {})).behavior
      yield result('s')
    }, 20)
    await service.send('x')
    expect(decision).toBe('deny')
  })

  it('bricht mit stop() ab und meldet Fehler mit Hinweis', async () => {
    const { service, events } = setup(async function* (options) {
      yield answer('Anfang')
      await new Promise((resolve) => options.abortController.signal.addEventListener('abort', resolve))
      throw new Error('aborted')
    })
    const running = service.send('lang')
    await new Promise((r) => setTimeout(r, 10))
    service.stop()
    await running
    expect(events.some((e) => e.type === 'error')).toBe(false)
    expect(events.at(-1)?.type).toBe('done')

    const failing = setup(async function* () {
      yield { type: 'result', session_id: 's', is_error: true, result: 'Claude AI usage limit reached' }
    })
    await failing.service.send('x')
    expect(failing.events.find((e) => e.type === 'error')).toMatchObject({ type: 'error', message: 'Claude AI usage limit reached' })
  })

  it('lässt keinen zweiten Auftrag parallel zu', async () => {
    const { service } = setup(async function* () {
      await new Promise((r) => setTimeout(r, 30))
      yield result('s')
    })
    const first = service.send('a')
    await expect(service.send('b')).rejects.toThrow(/läuft noch/)
    await first
  })
})
