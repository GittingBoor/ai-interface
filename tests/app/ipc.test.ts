import { describe, expect, it } from 'vitest'
import { wrapHandler } from '../../src/main/ipcWrap'
import { ValidationError } from '../../src/main/errors'

describe('wrapHandler', () => {
  it('verpackt Rückgabewerte als ok-Result', async () => {
    expect(await wrapHandler(async (a: number) => a + 1)(1)).toEqual({ ok: true, data: 2 })
  })

  it('wandelt AppErrors in Fehler mit Hinweis um', async () => {
    const result = await wrapHandler(() => {
      throw new ValidationError('kaputt')
    })()
    expect(result).toEqual({ ok: false, error: { code: 'VALIDATION', message: 'kaputt', hint: 'Eingabe korrigieren und erneut versuchen.' } })
  })

  it('meldet unerwartete Fehler mit Log-Hinweis und ruft den Logger', async () => {
    const logged: unknown[] = []
    const result = await wrapHandler(() => Promise.reject(new Error('boom')), (e) => logged.push(e))()
    expect(result).toMatchObject({ ok: false, error: { code: 'UNEXPECTED', message: 'boom' } })
    expect(logged).toHaveLength(1)
  })
})
