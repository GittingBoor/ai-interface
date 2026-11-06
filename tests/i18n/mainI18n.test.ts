import { beforeEach, describe, expect, it } from 'vitest'
import { de } from '@shared/i18n/de'
import { fr } from '@shared/i18n/fr'
import { mainLocale, mainT, setMainLanguage, setSystemLocaleProvider } from '../../src/main/i18n'

describe('Übersetzer im Main-Prozess', () => {
  beforeEach(() => {
    setMainLanguage('system')
    setSystemLocaleProvider(() => 'fr-FR')
  })

  it('nimmt ohne gesetzte Sprache die Systemsprache', () => {
    expect(mainLocale()).toBe('fr')
    expect(mainT()).toBe(fr)
  })

  it('übernimmt eine feste Sprache', () => {
    setMainLanguage('ja')
    expect(mainLocale()).toBe('ja')
  })

  it('fällt bei unbekannter Systemsprache auf Englisch zurück', () => {
    setMainLanguage('ja')
    setMainLanguage('system')
    setSystemLocaleProvider(() => 'pt-BR')
    expect(mainLocale()).toBe('en')
  })

  it('liefert das Wörterbuch der gesetzten Sprache', () => {
    setMainLanguage('de')
    expect(mainT()).toBe(de)
  })
})
