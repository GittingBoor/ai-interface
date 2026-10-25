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

/** Prüft eine Verknüpfung; `null` = gültig. */
export function linkError(link: WebLinkSettings, others: readonly WebLinkSettings[] = []): string | null {
  const name = link.name.trim().toLowerCase()
  if (!name) return 'Bitte einen Namen eingeben.'
  if (others.some((l) => l.id !== link.id && l.name.trim().toLowerCase() === name)) return `Eine Verknüpfung namens „${link.name.trim()}“ gibt es schon.`
  if (!link.url.trim()) return 'Bitte die Adresse der Seite eingeben.'
  if (!isWebUrl(normalizeUrl(link.url))) return 'Die Adresse muss mit http:// oder https:// beginnen, z. B. http://192.168.0.10:8123.'
  return null
}
