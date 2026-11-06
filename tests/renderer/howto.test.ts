import { beforeAll, describe, expect, it } from 'vitest'
import { messagesFor } from '@shared/i18n/messages'
import { LOCALES } from '@shared/i18n/locales'
import { filterHowTo, howToEntries, howToGroups } from '../../src/renderer/src/lib/howto'

const de = messagesFor('de')

describe('How-To', () => {
  let entries: ReturnType<typeof howToEntries>
  beforeAll(() => {
    entries = howToEntries(de)
  })

  it('jeder Eintrag gehört zu einer bekannten Gruppe', () => {
    const groups = new Set(howToGroups(de).map((g) => g.id))
    expect(entries.every((e) => groups.has(e.group))).toBe(true)
  })

  it('enthält Win+H und das Diktat-Kürzel', () => {
    expect(entries.some((e) => e.keys.join('+') === 'Win+H')).toBe(true)
    expect(entries.some((e) => e.keys.join('+') === 'Strg+Shift+Leertaste')).toBe(true)
  })

  it('sucht in Titel, Beschreibung und Tasten, ohne Groß/Klein', () => {
    expect(filterHowTo(entries, 'zwischenablage').map((e) => e.keys.join('+'))).toContain('Win+V')
    expect(filterHowTo(entries, 'win+h').length).toBeGreaterThan(0)
    expect(filterHowTo(entries, '  ')).toHaveLength(entries.length)
    expect(filterHowTo(entries, 'gibtsnicht')).toEqual([])
  })

  it('liefert in jeder Sprache alle Einträge mit Titel, Beschreibung und Tasten', () => {
    for (const locale of LOCALES) {
      const localized = howToEntries(messagesFor(locale))
      expect(localized, locale).toHaveLength(entries.length)
      for (const e of localized) {
        expect(e.title, `${locale}:${e.id}`).not.toBe('')
        expect(e.description, `${locale}:${e.id}`).not.toBe('')
        expect(e.keys.length, `${locale}:${e.id}`).toBeGreaterThan(0)
      }
    }
    expect(howToEntries(messagesFor('es')).find((e) => e.id === 'dictateKeys')?.keys).toEqual(['Ctrl', 'Mayús', 'Espacio'])
  })
})
