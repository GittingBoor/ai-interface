import { describe, expect, it } from 'vitest'
import { LOCALES, LOCALE_NAMES, effectiveLocale, intlTag, resolveLocale } from '@shared/i18n/locales'

describe('resolveLocale', () => {
  it.each([
    ['de-DE', 'de'],
    ['zh-CN', 'zh'],
    ['zh-TW', 'zh'],
    ['ja', 'ja'],
    ['fr-CA', 'fr'],
    ['pt-BR', 'en'],
    ['', 'en'],
    ['EN-gb', 'en']
  ])('%s -> %s', (tag, expected) => {
    expect(resolveLocale(tag)).toBe(expected)
  })

  it('undefined und null fallen auf en zurück', () => {
    expect(resolveLocale(undefined)).toBe('en')
    expect(resolveLocale(null)).toBe('en')
  })
})

describe('effectiveLocale', () => {
  it('system folgt dem Systemtag', () => {
    expect(effectiveLocale('system', 'it-IT')).toBe('it')
  })
  it('feste Sprache gewinnt', () => {
    expect(effectiveLocale('ja', 'de-DE')).toBe('ja')
  })
})

describe('intlTag und Namen', () => {
  it('zh wird zu zh-CN, sonst der Code', () => {
    expect(intlTag('zh')).toBe('zh-CN')
    expect(intlTag('de')).toBe('de')
  })
  it('jede Sprache hat eine Eigenbezeichnung', () => {
    expect(LOCALES.map((l) => LOCALE_NAMES[l])).toEqual(['Deutsch', 'English', '中文', '日本語', 'Italiano', 'Español', 'Français'])
  })
})
