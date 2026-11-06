import { describe, expect, it } from 'vitest'
import { EMPTY_AUTOMATION, type AutomationInput } from '@shared/automations'
import type { QuotaState } from '@shared/types'
import { openDatabase } from '../../src/main/db/Database'
import { AgentRunner, parseRunOutput, remoteCommand, runArgs, type RunOutcome } from '../../src/main/automations/AgentRunner'
import { AutomationRepo, KEEP_RUNS } from '../../src/main/automations/AutomationRepo'
import { AutomationService } from '../../src/main/automations/AutomationService'
import { FakeHost } from '../helpers/FakeHost'

const INPUT: AutomationInput = { ...EMPTY_AUTOMATION, name: 'Morgen-Check', agent: 'code-reviewer', cwd: '/home/alex/projects/demo', prompt: 'Prüfe die Änderungen von gestern.', schedule: { kind: 'interval', minutes: 60 } }
const OK: RunOutcome = { ok: true, result: 'Alles gut', error: null, sessionId: 's-1', costUsd: 0.12, turns: 3 }
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

function setup(quota: QuotaState = { status: 'loading' }, outcome: RunOutcome = OK) {
  const repo = new AutomationRepo(openDatabase(':memory:'))
  let now = 1_000_000
  const ran: AutomationInput[] = []
  const notes: string[] = []
  let release: () => void = () => undefined
  let hold = false
  const service = new AutomationService({
    repo,
    run: async (input) => {
      ran.push(input)
      if (hold) await new Promise<void>((r) => (release = r))
      return outcome
    },
    quota: () => quota,
    now: () => now,
    notify: (title) => notes.push(title),
    changed: () => undefined,
    logError: () => undefined
  })
  return {
    repo,
    service,
    ran,
    notes,
    advance: (ms: number) => (now += ms),
    holdRuns: () => (hold = true),
    releaseRun: () => release()
  }
}

describe('runArgs und remoteCommand', () => {
  it('baut die Flags für Agent, Modell und Rechte', () => {
    expect(runArgs({ agent: 'x', model: 'haiku', permission: 'plan' })).toEqual(['--output-format', 'json', '--permission-mode', 'plan', '--agent', 'x', '--model', 'haiku'])
    expect(runArgs({ agent: null, model: null, permission: 'acceptEdits' })).toEqual(['--output-format', 'json', '--permission-mode', 'acceptEdits'])
  })

  it('kodiert den Prompt per SSH und setzt das Zeitlimit', () => {
    const cmd = remoteCommand({ ...INPUT, prompt: "it's \"quoted\"", timeoutMinutes: 10 })
    expect(cmd.startsWith('bash -lc ')).toBe(true)
    expect(cmd).toContain(Buffer.from("it's \"quoted\"").toString('base64'))
    expect(cmd).toContain('timeout 600 claude ')
    expect(cmd).toContain('--agent')
  })
})

describe('parseRunOutput', () => {
  it('liest das JSON-Ergebnis von claude -p', () => {
    const out = JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'Fertig', session_id: 'abc', total_cost_usd: 0.5, num_turns: 4 })
    expect(parseRunOutput(`Warnung\n${out}\n`)).toEqual({ ok: true, result: 'Fertig', error: null, sessionId: 'abc', costUsd: 0.5, turns: 4 })
  })

  it('erkennt Fehlerergebnisse und Rohtext', () => {
    const out = JSON.stringify({ type: 'result', subtype: 'error_max_turns', is_error: true, session_id: 'abc' })
    expect(parseRunOutput(out)).toMatchObject({ ok: false, error: 'Claude meldet error_max_turns', sessionId: 'abc' })
    expect(parseRunOutput('command not found')).toMatchObject({ ok: false, error: 'command not found' })
  })
})

describe('AgentRunner', () => {
  it('führt per SSH aus und meldet das Zeitlimit', async () => {
    const host = new FakeHost('mini-pc')
    host.execHandler = () => ({ stdout: '', stderr: '', code: 124 })
    const runner = new AgentRunner({ host: () => host, local: async () => '' })
    expect(await runner.run({ ...INPUT, host: 'mini-pc' })).toMatchObject({ ok: false, error: 'Zeitlimit von 30 Min. überschritten' })
  })

  it('fängt Fehler beim lokalen Start ab', async () => {
    const runner = new AgentRunner({ host: () => new FakeHost(), local: async () => Promise.reject(new Error('claude nicht gefunden')) })
    expect(await runner.run(INPUT)).toMatchObject({ ok: false, error: 'claude nicht gefunden' })
  })
})

describe('AutomationService', () => {
  it('plant beim Anlegen und startet fällige Läufe', async () => {
    const t = setup()
    const created = t.service.create(INPUT)
    expect(created.nextRunAt).toBe(1_000_000 + 3_600_000)
    await t.service.tick()
    expect(t.ran).toHaveLength(0)
    t.advance(3_600_000)
    await t.service.tick()
    await flush()
    expect(t.ran).toHaveLength(1)
    const [run] = t.service.runs(created.id)
    expect(run).toMatchObject({ status: 'success', result: 'Alles gut', sessionId: 's-1', trigger: 'schedule' })
    expect(t.repo.get(created.id).nextRunAt).toBe(1_000_000 + 2 * 3_600_000)
    expect(t.notes).toEqual(['Morgen-Check fertig'])
  })

  it('holt verpasste Termine nur einmal nach', async () => {
    const t = setup()
    t.service.create(INPUT)
    t.advance(10 * 3_600_000)
    await t.service.tick()
    await flush()
    await t.service.tick()
    await flush()
    expect(t.ran).toHaveLength(1)
  })

  it('überspringt geplante Läufe bei vollem Kontingent', async () => {
    const t = setup({ status: 'ok', fetchedAt: 0, windows: [{ kind: 'five_hour', percent: 93, resetsAt: null }] })
    const a = t.service.create(INPUT)
    t.advance(3_600_000)
    await t.service.tick()
    expect(t.ran).toHaveLength(0)
    expect(t.service.runs(a.id)[0]).toMatchObject({ status: 'skipped' })
  })

  it('startet nichts doppelt und meldet laufende', async () => {
    const t = setup()
    t.holdRuns()
    const a = t.service.create({ ...INPUT, schedule: { kind: 'manual' } })
    expect(a.nextRunAt).toBeNull()
    t.service.runNow(a.id)
    await flush()
    expect(t.repo.get(a.id).running).toBe(true)
    expect(() => t.service.runNow(a.id)).toThrow(/läuft schon/)
    t.releaseRun()
    await flush()
    expect(t.repo.get(a.id).running).toBe(false)
  })

  it('verlangt gültige Eingaben und kürzt den Verlauf', async () => {
    const t = setup()
    expect(() => t.service.create({ ...INPUT, prompt: '' })).toThrow(/Auftrag fehlt/)
    const a = t.service.create(INPUT)
    for (let i = 0; i < KEEP_RUNS + 5; i++) t.repo.recordSkipped(a.id, 'manual', 'x', i)
    expect(t.service.runs(a.id)).toHaveLength(KEEP_RUNS)
  })

  it('schließt hängende Läufe nach einem Absturz ab', () => {
    const t = setup()
    const a = t.service.create(INPUT)
    t.repo.startRun(a.id, 'manual', 1)
    expect(t.repo.failInterrupted(2)).toBe(1)
    expect(t.repo.get(a.id).lastRun).toMatchObject({ status: 'error' })
  })
})
