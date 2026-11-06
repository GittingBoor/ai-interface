import type { Messages } from './i18n/messages'
import type { WebLinkSettings } from './types'

/** Gemeinsame, dauerhafte Sitzung aller eingebetteten Seiten: Cookies und Anmeldungen bleiben über Neustarts erhalten. */
export const LINK_PARTITION = 'persist:links'

const WEB_PROTOCOLS: readonly string[] = ['http:', 'https:']

/** Nur echte Webadressen dürfen eingebettet oder im Browser geöffnet werden. */
export function isWebUrl(value: string): boolean {
  try {
    return WEB_PROTOCOLS.includes(new URL(value).protocol)
  } catch {
    return false
  }
}

/** Adresse ohne Protokoll bekommt `https://` (`192.168.0.10:8123` bleibt so, wie eingegeben, plus Protokoll). */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

/** Merkt sich eine geöffnete Seite; sie bleibt ab dann geladen. */
export function rememberOpened(opened: readonly string[], id: string | null): readonly string[] {
  return id && !opened.includes(id) ? [...opened, id] : opened
}

/** Geöffnete Seiten, die es noch gibt; entfernte werden so auch entladen. */
export function keptLinks(links: readonly WebLinkSettings[], opened: readonly string[]): readonly WebLinkSettings[] {
  return links.filter((l) => opened.includes(l.id))
}

/** Prüft eine Verknüpfung; `null` = gültig. */
export function linkError(link: WebLinkSettings, others: readonly WebLinkSettings[], t: Messages): string | null {
  const name = link.name.trim().toLowerCase()
  if (!name) return t.errors.links.nameRequired
  if (others.some((l) => l.id !== link.id && l.name.trim().toLowerCase() === name)) return t.errors.links.nameTaken(link.name.trim())
  if (!link.url.trim()) return t.errors.links.urlRequired
  if (!isWebUrl(normalizeUrl(link.url))) return t.errors.links.urlInvalid
  return null
}
