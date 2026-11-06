import { describe, expect, it } from 'vitest'
import { LOCALES } from '../../src/shared/i18n/locales'
import { messagesFor } from '../../src/shared/i18n/messages'

describe('Einrichtung: Doku-Pfade', () => {
  it('Deutsch nennt die deutschen Dateien', () => {
    const t = messagesFor('de').setup
    expect(t.docsGuide).toBe('docs/EINRICHTUNG.md')
    expect(t.docsTemplate).toBe('docs/CLAUDE-TEMPLATE.md')
  })

  it.each(LOCALES.filter((l) => l !== 'de'))('%s verweist auf die englische Doku', (locale) => {
    const t = messagesFor(locale).setup
    expect(t.docsGuide).toBe('docs/en/SETUP.md')
    expect(t.docsTemplate).toBe('docs/en/CLAUDE-TEMPLATE.md')
  })
})

describe('Einstellungen: Abschnittstitel', () => {
  it.each(LOCALES)('%s: Titel „Ordner und Notizen“ steht wortgleich im Rahmen-Text', (locale) => {
    const t = messagesFor(locale)
    expect(t.frame.noVault.body('x')).toContain(t.settings.vault.title)
  })
})
