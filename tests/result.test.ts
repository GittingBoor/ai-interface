import { describe, expect, it } from 'vitest'
import { fail, ok } from '@shared/result'

describe('Result', () => {
  it('verpackt Erfolg', () => {
    expect(ok(1)).toEqual({ ok: true, data: 1 })
  })

  it('verpackt Fehler mit Code, Meldung und Hinweis', () => {
    const r = fail({ code: 'HOST_UNREACHABLE', message: 'Mini-PC nicht erreichbar', hint: 'Netzwerk prüfen' })
    expect(r).toEqual({
      ok: false,
      error: { code: 'HOST_UNREACHABLE', message: 'Mini-PC nicht erreichbar', hint: 'Netzwerk prüfen' }
    })
  })
})
