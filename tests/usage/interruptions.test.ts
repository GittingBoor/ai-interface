import { beforeEach, describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import { openDatabase } from '../../src/main/db/Database'
import { extractRunEvents } from '../../src/main/runs/extractRunEvents'
import { InterruptedRunsRepo } from '../../src/main/runs/InterruptedRunsRepo'
import { RunScanner } from '../../src/main/runs/RunScanner'
import { ScanOffsets } from '../../src/main/images/ScanOffsets'
import { FakeHost } from '../helpers/FakeHost'

const T = (minute: number): string => new Date(Date.UTC(2026, 8, 27, 10, minute)).toISOString()
const ms = (minute: number): number => Date.parse(T(minute))

const limitLine = (minute: number, session = 's1', cwd = 'D:\\GitHub\\Projects\\a'): string =>
  JSON.stringify({
    type: 'assistant',
    isApiErrorMessage: true,
    error: 'rate_limit',
    apiErrorStatus: 429,
    message: { id: `err-${minute}`, model: '<synthetic>', content: [{ type: 'text', text: "You've hit your session limit · resets 3:20pm (Europe/Berlin)" }] },
    timestamp: T(minute),
    cwd,
    sessionId: session
  })

const authErrorLine = (minute: number): string =>
  JSON.stringify({ type: 'assistant', isApiErrorMessage: true, error: 'authentication_failed', message: { model: '<synthetic>', content: [{ type: 'text', text: 'Login expired' }] }, timestamp: T(minute), cwd: '/x', sessionId: 's1' })

const answerLine = (minute: number, session = 's1'): string =>
  JSON.stringify({ type: 'assistant', message: { id: `m-${minute}`, model: 'claude-opus-5-5', content: [{ type: 'text', text: 'Weiter geht es.' }], usage: { input_tokens: 1 } }, timestamp: T(minute), cwd: '/x', sessionId: session })

const promptLine = (minute: number, text: string, session = 's1'): string =>
  JSON.stringify({ type: 'user', message: { role: 'user', content: text }, timestamp: T(minute), cwd: '/x', sessionId: session })

const toolResultLine = (minute: number): string =>
  JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: 'ok' }] }, timestamp: T(minute), cwd: '/x', sessionId: 's1' })

const chunk = (...lines: string[]): string => `${lines.join('\n')}\n`

describe('extractRunEvents', () => {
  it('erkennt Limit-Abbrüche, Antworten und die letzte echte Eingabe', () => {
    const events = extractRunEvents(chunk(promptLine(1, 'Baue den Export fertig'), toolResultLine(2), limitLine(3), authErrorLine(4), answerLine(5, 's2')))
    expect(events.interruptions).toEqual([
      { sessionId: 's1', project: 'D:\\GitHub\\Projects\\a', timestamp: ms(3), message: "You've hit your session limit · resets 3:20pm (Europe/Berlin)" }
    ])
    expect(events.answers).toEqual([{ sessionId: 's2', timestamp: ms(5) }])
    expect(events.prompts).toEqual([{ sessionId: 's1', timestamp: ms(1), text: 'Baue den Export fertig' }])
  })

  it('ignoriert Befehls- und Unterbrechungsmeldungen als Eingabe und kürzt lange Texte', () => {
    const long = 'x'.repeat(500)
    const events = extractRunEvents(chunk(promptLine(1, long), promptLine(2, '<command-name>/clear</command-name>'), promptLine(3, '[Request interrupted by user]')))
    expect(events.prompts).toHaveLength(1)
    expect(events.prompts[0]?.text.length).toBeLessThanOrEqual(200)
  })
})

describe('InterruptedRunsRepo', () => {
  let db: Database.Database
  let repo: InterruptedRunsRepo
  beforeEach(() => {
    db = openDatabase(':memory:')
    repo = new InterruptedRunsRepo(db)
  })

  const apply = (host: 'local' | 'mini-pc', text: string): void => repo.apply(host, extractRunEvents(text))

  it('hält einen Abbruch offen, bis eine spätere Antwort kommt', () => {
    apply('local', chunk(promptLine(1, 'Mach weiter'), limitLine(3)))
    expect(repo.open()).toEqual([
      { host: 'local', sessionId: 's1', project: 'D:\\GitHub\\Projects\\a', hitAt: ms(3), message: "You've hit your session limit · resets 3:20pm (Europe/Berlin)", lastPrompt: 'Mach weiter' }
    ])
    apply('local', chunk(answerLine(2)))
    expect(repo.open()).toHaveLength(1)
    apply('local', chunk(answerLine(9)))
    expect(repo.open()).toHaveLength(0)
  })

  it('trennt Hosts bei gleicher Session-ID', () => {
    apply('local', chunk(limitLine(3)))
    apply('mini-pc', chunk(answerLine(9)))
    expect(repo.open().map((r) => r.host)).toEqual(['local'])
  })

  it('öffnet nach erneutem Limit wieder, auch nach „Erledigt“', () => {
    apply('local', chunk(limitLine(3), answerLine(4)))
    expect(repo.open()).toHaveLength(0)
    apply('local', chunk(limitLine(8)))
    expect(repo.open()).toHaveLength(1)
    repo.dismiss('local', 's1')
    expect(repo.open()).toHaveLength(0)
    apply('local', chunk(limitLine(12)))
    expect(repo.open()).toHaveLength(1)
  })

  it('merkt sich die letzte Eingabe auch aus einem früheren Ausschnitt', () => {
    apply('local', chunk(promptLine(1, 'Erster Auftrag')))
    apply('local', chunk(limitLine(3)))
    expect(repo.open()[0]?.lastPrompt).toBe('Erster Auftrag')
  })
})

describe('RunScanner', () => {
  it('liest Session-Dateien inkrementell und holt nur die letzten 7 Tage nach', async () => {
    const db = openDatabase(':memory:')
    const repo = new InterruptedRunsRepo(db)
    const DAY = 86_400_000
    const now = 3 * DAY // FakeHost-Dateizeiten liegen bei wenigen Sekunden
    const host = new FakeHost('mini-pc', '/home/alex')
    const root = '/home/alex/.claude/projects'
    host.setFile(`${root}/p/neu.jsonl`, chunk(limitLine(3, 'neu')))
    host.setFile(`${root}/p/alt.jsonl`, chunk(limitLine(3, 'alt')))
    const alt = host.files.get(`${root}/p/alt.jsonl`)
    host.files.set(`${root}/p/alt.jsonl`, { data: alt?.data ?? Buffer.alloc(0), mtimeMs: now - 8 * DAY })
    const scanner = new RunScanner(new ScanOffsets(db, 'run_offsets'), repo, () => now)
    await scanner.scan(host)
    expect(repo.open().map((r) => r.sessionId)).toEqual(['neu'])
    host.appendFile(`${root}/p/neu.jsonl`, chunk(answerLine(9, 'neu')))
    await scanner.scan(host)
    expect(repo.open()).toHaveLength(0)
  })
})
