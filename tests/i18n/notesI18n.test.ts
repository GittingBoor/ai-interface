import { describe, expect, it } from 'vitest'
import { LOCALES, type Locale } from '@shared/i18n/locales'
import { messagesFor } from '@shared/i18n/messages'

describe('Notizen: Wörterbuch', () => {
  it.each(LOCALES)('%s: Galerie-Filter steht wortgleich im Hinweis der Rahmen-Texte', (locale) => {
    const t = messagesFor(locale)
    expect(t.frame.app.imagesHint).toContain(t.gallery.sourceAuto)
  })

  it.each(LOCALES)('%s: Mengenangaben unterscheiden Einzahl und Mehrzahl sinnvoll', (locale) => {
    const t = messagesFor(locale)
    expect(t.todos.overdue(1)).not.toBe(t.todos.overdue(2))
    expect(t.sources.count(1)).toContain('1')
    expect(t.gallery.added(3)).toContain('3')
  })

  const PLURAL_WORDING: ReadonlyArray<readonly [Locale, string, string]> = [
    ['de', '1 Quelle', '2 Quellen'],
    ['en', '1 source', '2 sources'],
    ['fr', '1 source', '2 sources'],
    ['es', '1 fuente', '2 fuentes'],
    ['it', '1 fonte', '2 fonti']
  ]

  it.each(PLURAL_WORDING)('%s: Quellen-Anzahl hat echte Einzahl- und Mehrzahlform', (locale, one, many) => {
    const t = messagesFor(locale)
    expect(t.sources.count(1)).toBe(one)
    expect(t.sources.count(2)).toBe(many)
  })

  const LINE_WORDING: ReadonlyArray<readonly [Locale, string, string]> = [
    ['de', '1 Zeile', '3 Zeilen'],
    ['en', '1 line', '3 lines'],
    ['fr', '1 ligne', '3 lignes'],
    ['es', '1 línea', '3 líneas'],
    ['it', '1 riga', '3 righe']
  ]

  it.each(LINE_WORDING)('%s: übersprungene Zeilen haben echte Einzahl- und Mehrzahlform', (locale, one, many) => {
    const lines = messagesFor(locale).usage.overview.host.lines
    expect(lines(1)).toBe(one)
    expect(lines(3)).toBe(many)
  })
})
