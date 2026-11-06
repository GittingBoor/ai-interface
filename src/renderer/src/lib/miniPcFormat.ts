/** Anzeigeformate für die Detailwerte eines Geräts (Raten, Takt, Adressen, Docker-Meldungen). */
import { messagesFor, type Messages } from '@shared/i18n/messages'
import { activeLocale } from '../i18n/activeLocale'
import { formatBytes, formatInteger, formatOneDecimal, formatPercentPoints, formatPercentPointsFine } from './format'

const MHZ_PER_GHZ = 1_000
/** Längere Adressen werden in der Mitte gekürzt. */
const ADDRESS_MAX_LENGTH = 24
const ADDRESS_HEAD_GROUPS = 2
export const NO_VALUE = '–'

const texts = (): Messages['format'] => messagesFor(activeLocale()).format

/** Schlägt `key` in einer Übersetzungstabelle nach; Unbekanntes kommt als `fallback` zurück. */
function lookup(table: Readonly<Record<string, string>>, key: string, fallback: string = key): string {
  return Object.hasOwn(table, key) ? (table[key] ?? fallback) : fallback
}

/** Prozent ohne Nachkommastelle: „9 %“. */
export const formatPercent = (value: number): string => formatPercentPoints(value)

/** Prozent mit einer Nachkommastelle, für kleine Anteile: „0,3 %“. */
export const formatPercentFine = (value: number): string => formatPercentPointsFine(value)

export const formatCelsius = (value: number): string => `${formatInteger(value)} °C`

export const formatWatts = (value: number): string => `${formatOneDecimal(value)} W`

/** Durchsatz: „180,0 KB/s“, `null` (noch keine zweite Messung) als „–“. */
export function formatRate(bytesPerSecond: number | null): string {
  return bytesPerSecond === null ? NO_VALUE : `${formatBytes(bytesPerSecond)}/s`
}

/** Takt: „800 MHz“ bzw. „2,1 GHz“. */
export function formatClock(mhz: number): string {
  return mhz < MHZ_PER_GHZ ? `${formatInteger(mhz)} MHz` : `${formatOneDecimal(mhz / MHZ_PER_GHZ)} GHz`
}

const isIpv6 = (address: string): boolean => address.includes(':')

/** IPv4 zuerst, sonst in der gemeldeten Reihenfolge. */
export function sortAddresses(addresses: readonly string[]): string[] {
  return [...addresses.filter((a) => !isIpv6(a)), ...addresses.filter(isIpv6)]
}

/** Kürzt lange IPv6-Adressen: „2a02:8109:…:9f3c/64“. */
export function shortAddress(address: string): string {
  if (!isIpv6(address) || address.length <= ADDRESS_MAX_LENGTH) return address
  const [host = '', prefix] = address.split('/')
  const groups = host.split(':')
  const head = groups.slice(0, ADDRESS_HEAD_GROUPS).join(':')
  const tail = groups[groups.length - 1] ?? ''
  return `${head}:…:${tail}${prefix ? `/${prefix}` : ''}`
}

export const linkStateText = (state: string): string => lookup(texts().linkStates, state.toUpperCase(), state)

export const dockerStateText = (state: string): string => lookup(texts().dockerStates, state)

const DOCKER_SPAN = /^(About an?|Less than an?|\d+) (second|minute|hour|day|week|month|year)s?$/
const DOCKER_UP = /^Up (.+?)(?: \((.+)\))?$/
const DOCKER_EXITED = /^Exited \((\d+)\) (.+) ago$/

/** „12 hours“ → „12 Std.“, „About an hour“ → „etwa 1 Std.“; `null`, wenn Docker etwas anderes meldet. */
function dockerSpan(text: string): string | null {
  const match = DOCKER_SPAN.exec(text)
  if (!match) return null
  const [, amount = '', unit = ''] = match
  const { dockerUnits, dockerAbout, dockerLessThan } = texts()
  const label = lookup(dockerUnits, unit)
  if (amount.startsWith('About')) return dockerAbout(label)
  if (amount.startsWith('Less')) return dockerLessThan(label)
  return `${amount} ${label}`
}

/** Dockers englische Statuszeile in der gewählten Sprache: „seit 12 Std.“, „vor 2 Tg. beendet (Code 0)“. Unbekanntes bleibt unverändert. */
export function dockerStatusText(status: string): string {
  const { dockerHealth, dockerUp, dockerUpHealthy, dockerExited } = texts()
  const up = DOCKER_UP.exec(status)
  if (up) {
    const span = dockerSpan(up[1] ?? '')
    if (span === null) return status
    return up[2] ? dockerUpHealthy(span, lookup(dockerHealth, up[2])) : dockerUp(span)
  }
  const exited = DOCKER_EXITED.exec(status)
  if (exited) {
    const span = dockerSpan(exited[2] ?? '')
    return span === null ? status : dockerExited(span, exited[1] ?? '')
  }
  return status
}
