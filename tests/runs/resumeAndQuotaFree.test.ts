import { describe, expect, it } from 'vitest'
import type { QuotaState } from '@shared/types'
import { openDatabase } from '../../src/main/db/Database'
import { QuotaFreeNotifier } from '../../src/main/runs/QuotaFreeNotifier'
import { defaultSettings, SettingsService } from '../../src/main/settings/SettingsService'
import { buildLaunch } from '../../src/main/terminal/launchCommand'

describe('buildLaunch mit Fortsetzen einer Session', () => {
  it('Windows: claude --resume mit gequoteter Session-ID', () => {
    const spec = buildLaunch({ platform: 'win32', target: 'local', path: 'C:\\p', mode: 'resume', sessionId: 'abc-123', claudeCommand: 'claude', shell: undefined })
    expect(spec).toMatchObject({ args: ['-NoLogo', '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', "Set-Location -LiteralPath 'C:\\p'; claude --resume 'abc-123'"] })
  })

  it('SSH: claude --resume im Ordner', () => {
    expect(buildLaunch({ platform: 'linux', target: 'ssh', path: '/p', mode: 'resume', sessionId: 'abc-123', claudeCommand: 'claude', shell: undefined })).toEqual({
      kind: 'ssh',
      initialInput: "cd '/p' && claude --resume 'abc-123'\n"
    })
  })

  it('ohne Session-ID wie „fortsetzen“', () => {
    const spec = buildLaunch({ platform: 'linux', target: 'ssh', path: '/p', mode: 'resume', claudeCommand: 'claude', shell: undefined })
    expect(spec).toEqual({ kind: 'ssh', initialInput: "cd '/p' && claude --continue\n" })
  })
})

describe('SettingsService', () => {
  it('ergänzt neue Schlüssel in gespeicherten Objekten aus den Standardwerten', () => {
    const db = openDatabase(':memory:')
    db.prepare("INSERT INTO settings (key, value) VALUES ('notifications', ?)").run(JSON.stringify({ permission: false, question: true, done: true }))
    const settings = new SettingsService(db, defaultSettings('/home/b', 'linux')).get()
    expect(settings.notifications).toEqual({ permission: false, question: true, done: true, quotaFree: true })
  })
})

describe('QuotaFreeNotifier', () => {
  const HOUR = 3_600_000
  const ok = (percent: number, resetsAt: number): QuotaState => ({ status: 'ok', fetchedAt: 0, windows: [{ kind: 'five_hour', percent, resetsAt }, { kind: 'seven_day', percent: 10, resetsAt: 99 * HOUR }] })

  function setup(openRuns: number, enabled = true) {
    const shown: string[] = []
    const notifier = new QuotaFreeNotifier({ openRuns: () => openRuns, enabled: () => enabled, show: (title, body) => shown.push(`${title} | ${body}`) })
    return { notifier, shown }
  }

  it('meldet einmal, wenn das 5-Stunden-Fenster zurückgesetzt wurde und Durchläufe offen sind', () => {
    const { notifier, shown } = setup(2)
    notifier.update(ok(100, 5 * HOUR))
    notifier.update(ok(100, 5 * HOUR))
    notifier.update(ok(3, 10 * HOUR))
    notifier.update(ok(4, 10 * HOUR))
    expect(shown).toEqual(['Kontingent wieder frei | 2 Durchläufe warten auf Fortsetzung.'])
  })

  it('schweigt ohne offene Durchläufe, ohne vorherigen Stand, bei Fehlerzuständen und wenn abgeschaltet', () => {
    const none = setup(0)
    none.notifier.update(ok(100, 5 * HOUR))
    none.notifier.update(ok(1, 10 * HOUR))
    const off = setup(3, false)
    off.notifier.update(ok(100, 5 * HOUR))
    off.notifier.update(ok(1, 10 * HOUR))
    const errors = setup(1)
    errors.notifier.update(ok(100, 5 * HOUR))
    errors.notifier.update({ status: 'expired', reason: 'x', hint: 'y', fetchedAt: 0 })
    errors.notifier.update(ok(100, 5 * HOUR))
    expect([...none.shown, ...off.shown, ...errors.shown]).toEqual([])
  })

  it('verwendet Einzahl bei einem Durchlauf', () => {
    const { notifier, shown } = setup(1)
    notifier.update(ok(100, 5 * HOUR))
    notifier.update(ok(0, 10 * HOUR))
    expect(shown[0]).toBe('Kontingent wieder frei | 1 Durchlauf wartet auf Fortsetzung.')
  })
})
