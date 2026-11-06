import { afterEach, describe, expect, it } from 'vitest'
import type { ClaudeAuth } from '@shared/types'
import { LOCALES, type Locale } from '@shared/i18n/locales'
import { messagesFor } from '@shared/i18n/messages'
import { setActiveLanguage } from '../../src/renderer/src/i18n/activeLocale'
import { claudeAuthView } from '../../src/renderer/src/lib/claudeAuth'
import { changeParts, formatUptime, tempLabel, throttleText } from '../../src/renderer/src/lib/miniPc'

const DAY = 86_400_000
const NOW = 1_800_000_000_000
const SIGNED_IN: ClaudeAuth = { state: 'signedIn', expiresAt: NOW + 3 * DAY, checkedAt: NOW }

describe('KI und Geräte: Wörterbuch', () => {
  afterEach(() => setActiveLanguage('de'))

  it.each(LOCALES)('%s: Laufzeit und Mengenangaben liefern Text mit den Zahlen', (locale) => {
    const t = messagesFor(locale).device
    expect(t.uptime(5, 6, 0)).toContain('5')
    expect(t.uptime(0, 0, 4)).toContain('4')
    expect(t.throttleCount(3)).toContain('3')
    expect(t.authDaysLeft(3)).toContain('3')
    expect(t.updatesPending(1)).not.toBe(t.updatesPending(2))
  })

  const UPDATE_WORDING: ReadonlyArray<readonly [Locale, string, string]> = [
    ['de', '1 Update offen', '2 Updates offen'],
    ['en', '1 update pending', '2 updates pending'],
    ['fr', '1 mise à jour en attente', '2 mises à jour en attente']
  ]

  it.each(UPDATE_WORDING)('%s: ausstehende Updates haben echte Einzahl- und Mehrzahlform', (locale, one, many) => {
    const t = messagesFor(locale).device
    expect(t.updatesPending(1)).toBe(one)
    expect(t.updatesPending(2)).toBe(many)
  })

  it('Englisch: Anzeigehelfer folgen der aktiven Sprache', () => {
    setActiveLanguage('en')
    expect(formatUptime(5 * 86_400 + 6 * 3_600)).toBe('5d 6h')
    expect(tempLabel({ chip: 'coretemp', label: 'Core 0' })).toBe('Core 1')
    expect(throttleText(0)).toBe('never')
    expect(changeParts({ staged: 1, unstaged: 2, untracked: 0 })).toEqual(['1 staged', '2 modified'])
    expect(claudeAuthView(SIGNED_IN, NOW).label).toBe('Claude login: 3 days left')
  })
})
