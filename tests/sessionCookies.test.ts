import { describe, expect, it, vi } from 'vitest'
import type { Cookie } from 'electron'
import { COOKIE_KEEP_SECONDS, keepSessionCookies, persistentCookie, type CookieStore } from '../src/main/sessionCookies'

const NOW = 1_000_000

const cookie = (patch: Partial<Cookie> = {}): Cookie => ({
  name: 'CF_Authorization',
  value: 'token',
  domain: 'panel.example.org',
  hostOnly: true,
  path: '/',
  secure: true,
  httpOnly: true,
  session: true,
  sameSite: 'no_restriction',
  ...patch
})

describe('Sitzungs-Cookies eingebetteter Seiten', () => {
  it('gibt einem Sitzungs-Cookie ein Ablaufdatum', () => {
    expect(persistentCookie(cookie(), NOW)).toEqual({
      url: 'https://panel.example.org/',
      name: 'CF_Authorization',
      value: 'token',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'no_restriction',
      expirationDate: NOW + COOKIE_KEEP_SECONDS
    })
  })

  it('behält die Domain nur bei Cookies, die auch für Subdomains gelten', () => {
    const details = persistentCookie(cookie({ domain: '.example.org', hostOnly: false, secure: false }), NOW)
    expect(details).toMatchObject({ url: 'http://example.org/', domain: '.example.org' })
  })

  it('lässt Cookies mit eigenem Ablaufdatum unverändert', () => {
    expect(persistentCookie(cookie({ session: false, expirationDate: NOW + 60 }), NOW)).toBeNull()
  })

  it('schreibt neue Sitzungs-Cookies sofort auf die Platte', async () => {
    let listener: Parameters<CookieStore['on']>[1] = () => undefined
    const store: CookieStore = {
      on: (_event, next) => {
        listener = next
      },
      set: vi.fn(async () => undefined),
      flushStore: vi.fn(async () => undefined)
    }
    keepSessionCookies(store, () => NOW, vi.fn())
    listener({} as Electron.Event, cookie(), 'explicit', false)
    listener({} as Electron.Event, cookie(), 'overwrite', true)
    await vi.waitFor(() => expect(store.flushStore).toHaveBeenCalledTimes(1))
    expect(store.set).toHaveBeenCalledTimes(1)
  })

  it('meldet einen fehlgeschlagenen Schreibversuch', async () => {
    let listener: Parameters<CookieStore['on']>[1] = () => undefined
    const store: CookieStore = {
      on: (_event, next) => {
        listener = next
      },
      set: async () => {
        throw new TypeError('kaputt')
      },
      flushStore: async () => undefined
    }
    const onError = vi.fn()
    keepSessionCookies(store, () => NOW, onError)
    listener({} as Electron.Event, cookie(), 'explicit', false)
    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
    expect(onError.mock.calls[0]?.[0]).toContain('CF_Authorization')
  })
})
