import { describe, expect, it } from 'vitest'
import { describeSchedule, EMPTY_AUTOMATION, nextRunAt, validateAutomation } from '@shared/automations'
import { MESSAGES } from '@shared/i18n/messages'

const t = MESSAGES.de.automations

/** Ortszeit, damit die Tests in jeder Zeitzone gelten. */
const at = (y: number, m: number, d: number, h = 0, min = 0): number => new Date(y, m - 1, d, h, min).getTime()

describe('nextRunAt', () => {
  it('liefert bei manuell nichts', () => {
    expect(nextRunAt({ kind: 'manual' }, at(2026, 11, 3))).toBeNull()
  })

  it('rechnet Abstände ab dem letzten Start', () => {
    expect(nextRunAt({ kind: 'interval', minutes: 90 }, at(2026, 11, 3, 10))).toBe(at(2026, 11, 3, 11, 30))
    expect(nextRunAt({ kind: 'interval', minutes: 2 }, at(2026, 11, 3))).toBeNull()
  })

  it('findet den nächsten passenden Wochentag zur Uhrzeit', () => {
    const workdays = { kind: 'daily', time: '08:00', weekdays: [1, 2, 3, 4, 5] } as const
    // Di, 03.11.2026 07:59 → heute 08:00
    expect(nextRunAt(workdays, at(2026, 11, 3, 7, 59))).toBe(at(2026, 11, 3, 8))
    // genau 08:00 → morgen
    expect(nextRunAt(workdays, at(2026, 11, 3, 8))).toBe(at(2026, 11, 4, 8))
    // Fr 09:00 → Mo
    expect(nextRunAt(workdays, at(2026, 11, 6, 9))).toBe(at(2026, 11, 9, 8))
    expect(nextRunAt({ kind: 'daily', time: '25:00', weekdays: [1] }, at(2026, 11, 3))).toBeNull()
  })
})

describe('describeSchedule', () => {
  it('beschreibt Zeitpläne in Worten', () => {
    expect(describeSchedule({ kind: 'daily', time: '08:00', weekdays: [5, 1, 2, 3, 4] }, t)).toBe('werktags um 08:00')
    expect(describeSchedule({ kind: 'daily', time: '20:15', weekdays: [0, 1, 2, 3, 4, 5, 6] }, t)).toBe('täglich um 20:15')
    expect(describeSchedule({ kind: 'daily', time: '07:00', weekdays: [1, 3] }, t)).toBe('Mo, Mi um 07:00')
    expect(describeSchedule({ kind: 'interval', minutes: 120 }, t)).toBe('alle 2 Std.')
    expect(describeSchedule({ kind: 'interval', minutes: 15 }, t)).toBe('alle 15 Min.')
  })
})

describe('validateAutomation', () => {
  it('verlangt Name, Ordner und Auftrag', () => {
    expect(validateAutomation(EMPTY_AUTOMATION, t)).toBe('Name fehlt.')
    expect(validateAutomation({ ...EMPTY_AUTOMATION, name: 'x', cwd: '/p', prompt: 'tu was' }, t)).toBeNull()
    expect(validateAutomation({ ...EMPTY_AUTOMATION, name: 'x', cwd: '/p', prompt: 'p', schedule: { kind: 'daily', time: '8', weekdays: [1] } }, t)).toContain('HH:MM')
  })
})
