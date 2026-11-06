import type { HostId, Source } from './types'
import { isWebUrl } from './links'

/** Ab so vielen Quellen derselben Webseite werden sie gebündelt; einzelne bleiben flach in der Liste. */
export const BUNDLE_MIN_SOURCES = 2
const NOTE_MAX_CHARS = 160
const TITLE_MAX_CHARS = 90
const WWW_PREFIX = /^www\./
/** Lokale und private Adressen sind Entwicklungs-Server oder Geräte, keine Quellen. */
const PRIVATE_HOST = /^(?:localhost|127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|0\.0\.0\.0|\[::1?\])|\.local$|\.lan$|\.internal$/i
const SENTENCE_END = /(?<=[.?!])\s/

/** Webseite einer Adresse ohne `www.` (`https://de.wikipedia.org/wiki/X` → `de.wikipedia.org`). */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(WWW_PREFIX, '')
  } catch {
    return url
  }
}

/** Öffentliche http(s)-Adresse, die sich als Quelle lohnt (keine lokalen Server, keine Heimnetz-Geräte). */
export function isSourceUrl(url: string): boolean {
  if (!isWebUrl(url)) return false
  return !PRIVATE_HOST.test(new URL(url).hostname)
}

const shorten = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text)

/** Lesbarer Titel aus der Adresse: letzter Pfadteil (`Fourier-Transformation`), sonst die Webseite. */
export function titleFromUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return shorten(url, TITLE_MAX_CHARS)
  }
  const segment = parsed.pathname.split('/').filter(Boolean).pop() ?? ''
  let decoded = segment
  try {
    decoded = decodeURIComponent(segment)
  } catch {
    // Kaputte Kodierung: Pfadteil so lassen.
  }
  const words = decoded.replace(/\.(?:html?|php|aspx?)$/i, '').replace(/[-_+]+/g, ' ').trim()
  return shorten(words ? `${words} · ${domainOf(url)}` : domainOf(url), TITLE_MAX_CHARS)
}

/** Erster Satz der Abruf-Frage, gekürzt. */
export function noteFromPrompt(prompt: string): string {
  const first = prompt.trim().replace(/\s+/g, ' ').split(SENTENCE_END)[0] ?? ''
  return shorten(first, NOTE_MAX_CHARS)
}

/** Ordner unter „Quellen“: ein Projekt oder „Allgemein“ (`project = null`). */
export interface SourceFolderKey {
  readonly host: HostId | null
  readonly project: string | null
}

export const sameFolder = (source: SourceFolderKey, folder: SourceFolderKey): boolean =>
  source.project === folder.project && (source.project === null || source.host === folder.host)

/** Mehrere Quellen derselben Webseite. */
export interface SourceBundle {
  readonly domain: string
  readonly sources: readonly Source[]
}

/** Eine Hälfte eines Ordners („Ich“ oder „KI“): Bündel zuerst, dann einzelne Quellen. */
export interface SourceSection {
  readonly bundles: readonly SourceBundle[]
  readonly singles: readonly Source[]
  readonly count: number
}

/** Bündelt nach Webseite erst ab `BUNDLE_MIN_SOURCES`; so bleibt eine Liste mit vielen verschiedenen Seiten flach. */
export function sectionOf(sources: readonly Source[]): SourceSection {
  const byDomain = new Map<string, Source[]>()
  for (const source of sources) {
    const domain = domainOf(source.url)
    byDomain.set(domain, [...(byDomain.get(domain) ?? []), source])
  }
  const bundles: SourceBundle[] = []
  const singles: Source[] = []
  for (const [domain, list] of byDomain) {
    if (list.length >= BUNDLE_MIN_SOURCES) bundles.push({ domain, sources: list })
    else singles.push(...list)
  }
  bundles.sort((a, b) => b.sources.length - a.sources.length || a.domain.localeCompare(b.domain))
  singles.sort((a, b) => b.createdAt - a.createdAt)
  return { bundles, singles, count: sources.length }
}

/** Ordnerinhalt: erst deine Quellen, dann die der KI. */
export function splitByOrigin(sources: readonly Source[]): { readonly mine: SourceSection; readonly ai: SourceSection } {
  return { mine: sectionOf(sources.filter((s) => s.origin === 'user')), ai: sectionOf(sources.filter((s) => s.origin === 'ai')) }
}
