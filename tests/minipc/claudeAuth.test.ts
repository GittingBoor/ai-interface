import { describe, expect, it } from 'vitest'
import type { ClaudeAuth } from '@shared/types'
import { MiniPcService } from '../../src/main/minipc/MiniPcService'
import { parseClaudeAuth } from '../../src/main/minipc/parseClaudeAuth'
import { claudeAuthView, CLAUDE_AUTH_WARN_DAYS } from '../../src/renderer/src/lib/claudeAuth'
import { FakeHost } from '../helpers/FakeHost'

const DAY = 86_400_000
const NOW = 1_800_000_000_000
const EXPIRES = 1_795_552_449_892

const out = (fields: Record<string, string>): string => ['@@AUTH@@', ...Object.entries(fields).map(([k, v]) => `${k}=${v}`), ''].join('\r\n')
const signedIn = (expiresAt: number): ClaudeAuth => ({ state: 'signedIn', expiresAt, checkedAt: NOW })

describe('parseClaudeAuth', () => {
  it('liest das feste Ablaufdatum einer gültigen Anmeldung', () => {
    expect(parseClaudeAuth(out({ cli: '1', file: '1', loggedIn: '1', refresh: '1', expires: String(EXPIRES) }), 5)).toEqual({ state: 'signedIn', expiresAt: EXPIRES, checkedAt: 5 })
  })

  it.each([
    ['ohne Refresh-Token', { cli: '1', file: '1', loggedIn: '1', refresh: '0', expires: String(EXPIRES) }],
    ['ohne Ablaufdatum', { cli: '1', file: '1', loggedIn: '1', refresh: '1', expires: '' }],
    ['wenn claude auth status abgemeldet meldet', { cli: '1', file: '1', loggedIn: '0', refresh: '1', expires: String(EXPIRES) }],
    ['ohne Anmeldedatei', { cli: '1', file: '0', loggedIn: '0', refresh: '0', expires: '' }]
  ])('meldet abgemeldet %s', (_name, fields) => {
    expect(parseClaudeAuth(out(fields), 5).state).toBe('signedOut')
  })

  it('ohne Claude und ohne Anmeldedatei: nicht installiert statt Alarm', () => {
    expect(parseClaudeAuth(out({ cli: '0', file: '0', loggedIn: '0', refresh: '0', expires: '' }), 5).state).toBe('notInstalled')
  })

  it('ohne Claude-CLI im PATH zählt allein die Anmeldedatei', () => {
    expect(parseClaudeAuth(out({ cli: '0', file: '1', loggedIn: '0', refresh: '1', expires: String(EXPIRES) }), 5).state).toBe('signedIn')
  })

  it('unlesbare Antwort ergibt unbekannt', () => {
    expect(parseClaudeAuth('bash: Fehler', 5).state).toBe('unknown')
  })
})

describe('MiniPcService.claudeAuth', () => {
  it('ein nicht erreichbares Gerät ergibt unbekannt, ohne Ausnahme', async () => {
    const host = new FakeHost('mini-pc')
    host.offline = true
    const auth = await new MiniPcService(() => host, () => 9).claudeAuth('mini-pc')
    expect(auth).toMatchObject({ state: 'unknown', checkedAt: 9 })
    expect(auth.state === 'unknown' && auth.reason).toMatch(/nicht erreichbar/)
  })

  it('schickt nur einen Befehl und gibt kein Token aus', async () => {
    const host = new FakeHost('mini-pc')
    const commands: string[] = []
    host.execHandler = (command) => {
      commands.push(command)
      return { stdout: out({ cli: '1', file: '1', loggedIn: '1', refresh: '1', expires: String(EXPIRES) }), stderr: '', code: 0 }
    }
    expect(await new MiniPcService(() => host, () => 9).claudeAuth('mini-pc')).toEqual({ state: 'signedIn', expiresAt: EXPIRES, checkedAt: 9 })
    expect(commands).toHaveLength(1)
    expect(commands[0]).not.toMatch(/cat .*credentials/)
  })
})

describe('claudeAuthView', () => {
  it('über der Schwelle: Resttage ohne Markierung', () => {
    const view = claudeAuthView(signedIn(NOW + 27.9 * DAY), NOW)
    expect(view).toMatchObject({ level: 'ok', daysLeft: 27, label: 'Claude-Login: noch 27 Tage' })
  })

  it('knapp über sieben Tagen noch ohne Markierung', () => {
    expect(claudeAuthView(signedIn(NOW + CLAUDE_AUTH_WARN_DAYS * DAY + 1), NOW).level).toBe('ok')
  })

  it.each([CLAUDE_AUTH_WARN_DAYS * DAY, 3 * DAY, 1])('warnt bei ≤ 7 Tagen (%i ms übrig)', (left) => {
    const view = claudeAuthView(signedIn(NOW + left), NOW)
    expect(view.level).toBe('warn')
    expect(view.hint).toMatch(/^Claude-Anmeldung läuft am .+ ab – neu anmelden/)
  })

  it('weniger als ein Tag wird ausgeschrieben', () => {
    expect(claudeAuthView(signedIn(NOW + DAY / 2), NOW).label).toBe('Claude-Login: noch weniger als 1 Tag')
  })

  it.each([0, -DAY])('abgelaufen (%i ms übrig) ist rot', (left) => {
    expect(claudeAuthView(signedIn(NOW + left), NOW)).toMatchObject({ level: 'expired', daysLeft: null })
  })

  it('abgemeldet ist rot', () => {
    expect(claudeAuthView({ state: 'signedOut', checkedAt: NOW }, NOW).level).toBe('expired')
  })

  it('unbekannt und noch nicht geprüft: keine Warnstufe', () => {
    expect(claudeAuthView({ state: 'unknown', reason: 'Mini-PC nicht erreichbar', checkedAt: NOW }, NOW)).toMatchObject({ level: 'unknown', label: 'Claude-Login: unbekannt' })
    expect(claudeAuthView(undefined, NOW).level).toBe('unknown')
  })

  it('ohne Claude auf dem Gerät: nichts anzeigen', () => {
    expect(claudeAuthView({ state: 'notInstalled', checkedAt: NOW }, NOW)).toMatchObject({ level: 'none', label: null })
  })
})
