import { describe, expect, it } from 'vitest'
import { filterHowTo, HOWTO_ENTRIES, HOWTO_GROUPS } from '../../src/renderer/src/lib/howto'

describe('How-To', () => {
  it('jeder Eintrag gehört zu einer bekannten Gruppe', () => {
    const groups = new Set(HOWTO_GROUPS.map((g) => g.id))
    expect(HOWTO_ENTRIES.every((e) => groups.has(e.group))).toBe(true)
  })

  it('enthält Win+H und das Diktat-Kürzel', () => {
    expect(HOWTO_ENTRIES.some((e) => e.keys.join('+') === 'Win+H')).toBe(true)
    expect(HOWTO_ENTRIES.some((e) => e.keys.join('+') === 'Strg+Shift+Leertaste')).toBe(true)
  })

  it('sucht in Titel, Beschreibung und Tasten, ohne Groß/Klein', () => {
    expect(filterHowTo(HOWTO_ENTRIES, 'zwischenablage').map((e) => e.keys.join('+'))).toContain('Win+V')
    expect(filterHowTo(HOWTO_ENTRIES, 'win+h').length).toBeGreaterThan(0)
    expect(filterHowTo(HOWTO_ENTRIES, '  ')).toHaveLength(HOWTO_ENTRIES.length)
    expect(filterHowTo(HOWTO_ENTRIES, 'gibtsnicht')).toEqual([])
  })
})
