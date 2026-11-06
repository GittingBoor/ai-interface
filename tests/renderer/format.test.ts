import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { setActiveLanguage } from '../../src/renderer/src/i18n/activeLocale'
import { formatDue, formatDuration, formatRelative, formatTokens, formatUsd, splitTokens } from '../../src/renderer/src/lib/format'
import { dockerStatusText, formatPercent, linkStateText } from '../../src/renderer/src/lib/miniPcFormat'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const NOW = 1_800_000_000_000
/** Intl trennt Zahl und Einheit mit geschütztem Leerzeichen. */
const plain = (text: string): string => text.replace(/[  ]/g, ' ')

describe('Formate auf Deutsch', () => {
  beforeEach(() => setActiveLanguage('de'))
  afterAll(() => setActiveLanguage(undefined))

  it('schreibt Zahlen und Zeiten deutsch', () => {
    expect(formatTokens(812)).toBe('812')
    expect(plain(formatTokens(1_200_000))).toBe('1,2 Mio.')
    expect(formatRelative(NOW - 10_000, NOW)).toBe('gerade eben')
    expect(formatRelative(NOW - 5 * MINUTE, NOW)).toBe('vor 5 Min.')
    expect(formatRelative(NOW - DAY, NOW)).toBe('gestern')
    expect(formatDuration(90 * MINUTE)).toBe('1 Std. 30 Min.')
    expect(formatUsd(1.5)).toContain('1,50')
  })

  it('trennt Zahl und Einheit', () => {
    expect(splitTokens(1_200_000)).toEqual({ figure: '1,2', unit: 'Mio.' })
    expect(splitTokens(812)).toEqual({ figure: '812', unit: '' })
  })
})

describe('Formate in anderen Sprachen', () => {
  afterAll(() => setActiveLanguage(undefined))

  it('kürzt Tausender englisch', () => {
    setActiveLanguage('en')
    expect(formatTokens(12_400)).toBe('12.4K')
    expect(splitTokens(12_400)).toEqual({ figure: '12.4', unit: 'K' })
  })

  it('schreibt relative Zeiten englisch', () => {
    setActiveLanguage('en')
    expect(formatRelative(NOW - 10_000, NOW)).toBe('just now')
    expect(formatRelative(NOW - 5 * MINUTE, NOW)).toMatch(/^5 min\.? ago$/)
    expect(formatRelative(NOW - DAY, NOW)).toBe('yesterday')
    expect(formatDuration(HOUR)).toBe('1 hr')
  })

  it('trennt chinesische Kürzel', () => {
    setActiveLanguage('zh')
    expect(splitTokens(12_400)).toEqual({ figure: '1.2', unit: '万' })
  })

  it('übersetzt Statuszeilen des Mini-PCs', () => {
    setActiveLanguage('en')
    expect(linkStateText('UP')).toBe('up')
    expect(dockerStatusText('Up 7 days (healthy)')).toBe('up 7 d · healthy')
    expect(formatPercent(9)).toBe('9%')
    setActiveLanguage('fr')
    expect(dockerStatusText('Exited (0) 2 days ago')).toBe('arrêté il y a 2 j (code 0)')
  })

  it('meldet überfällige Aufgaben englisch', () => {
    setActiveLanguage('en')
    expect(formatDue('1999-01-01')).toContain('overdue')
  })
})
