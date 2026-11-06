import { afterEach, describe, expect, it } from 'vitest'
import { setMainLanguage } from '../../src/main/i18n'
import { NotFoundError, WrongPinError, toErrorInfo } from '../../src/main/errors'

describe('Fehlertexte in der gewählten Sprache', () => {
  afterEach(() => setMainLanguage('de'))

  it('liefert deutschen Text und Hinweis', () => {
    const info = toErrorInfo(new WrongPinError())
    expect(info.message).toBe('PIN falsch.')
    expect(info.hint).toBe('PIN erneut eingeben.')
  })

  it('liefert nach dem Sprachwechsel englischen Text und Hinweis', () => {
    setMainLanguage('en')
    expect(new NotFoundError('The folder /x').message).toBe('The folder /x was not found.')
    const info = toErrorInfo(new WrongPinError(5))
    expect(info.message).toBe('Too many failed attempts, please wait 5 s.')
    expect(info.hint).toBe('Enter the PIN again.')
  })
})
