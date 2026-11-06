import { afterEach, describe, expect, it } from 'vitest'
import { aiImagesMessage } from '../../src/renderer/src/lib/aiImages'
import { setActiveLanguage } from '../../src/renderer/src/i18n/activeLocale'
import { messagesFor } from '@shared/i18n/messages'
import { LOCALES } from '@shared/i18n/locales'

describe('Rahmen-Texte', () => {
  afterEach(() => setActiveLanguage('de'))

  it('bildet die KI-Bild-Meldung in der aktiven Sprache', () => {
    setActiveLanguage('en')
    expect(aiImagesMessage(3, ['A', 'B', 'A'])).toBe('3 new AI images in A and B')
    setActiveLanguage('de')
    expect(aiImagesMessage(1, ['A'])).toBe('1 neues KI-Bild in A')
  })

  it.each(LOCALES)('%s: Update-Knopf passt zum Hinweis in den Benachrichtigungen', (locale) => {
    const t = messagesFor(locale)
    expect(t.notify.updateAvailableBody).toContain(t.frame.update.install)
  })
})
