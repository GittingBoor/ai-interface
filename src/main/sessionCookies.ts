import type { Cookie, CookiesSetDetails } from 'electron'

/** So lange überlebt ein Sitzungs-Cookie Neustarts; ob die Anmeldung dann noch gilt, entscheidet die Seite selbst. */
export const COOKIE_KEEP_SECONDS = 30 * 24 * 60 * 60

/** Der Teil von Electrons `session.cookies`, den das Festhalten braucht (im Test ersetzt). */
export interface CookieStore {
  on(event: 'changed', listener: (event: Electron.Event, cookie: Cookie, cause: string, removed: boolean) => void): void
  set(details: CookiesSetDetails): Promise<void>
  flushStore(): Promise<void>
}

/** Dieselben Cookie-Daten mit Ablaufdatum; `null`, wenn das Cookie schon dauerhaft ist. */
export function persistentCookie(cookie: Cookie, nowSeconds: number): CookiesSetDetails | null {
  if (!cookie.session) return null
  const host = (cookie.domain ?? '').replace(/^\./, '')
  return {
    url: `${cookie.secure ? 'https' : 'http'}://${host}${cookie.path ?? '/'}`,
    name: cookie.name,
    value: cookie.value,
    ...(cookie.hostOnly ? {} : { domain: cookie.domain }),
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    expirationDate: nowSeconds + COOKIE_KEEP_SECONDS
  }
}

/**
 * Chromium verwirft Cookies ohne Ablaufdatum beim Beenden, auch in einer dauerhaften Sitzung. Anmeldungen wie
 * Cloudflare Access gingen so bei jedem App-Start verloren; deshalb bekommen sie hier ein Ablaufdatum.
 */
export function keepSessionCookies(store: CookieStore, nowSeconds: () => number, onError: (message: string) => void): void {
  store.on('changed', (_event, cookie, _cause, removed) => {
    const details = removed ? null : persistentCookie(cookie, nowSeconds())
    if (!details) return
    store
      .set(details)
      .then(() => store.flushStore())
      .catch((error: unknown) => onError(`Cookie ${cookie.name} von ${cookie.domain} nicht gespeichert: ${error instanceof Error ? error.message : String(error)}`)) // i18n-ignore: Logtext
  })
}
