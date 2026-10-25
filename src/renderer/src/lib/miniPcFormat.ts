/** Anzeigeformate für die Detailwerte eines Geräts (Raten, Takt, Adressen, Docker-Meldungen). */
import { formatBytes } from './format'

const LOCALE = 'de-DE'
const MHZ_PER_GHZ = 1_000
/** Längere Adressen werden in der Mitte gekürzt. */
const ADDRESS_MAX_LENGTH = 24
const ADDRESS_HEAD_GROUPS = 2
export const NO_VALUE = '–'

const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const oneDecimal = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Prozent ohne Nachkommastelle: „9 %“. */
export const formatPercent = (value: number): string => `${integer.format(value)} %`

/** Prozent mit einer Nachkommastelle, für kleine Anteile: „0,3 %“. */
export const formatPercentFine = (value: number): string => `${oneDecimal.format(value)} %`

export const formatCelsius = (value: number): string => `${integer.format(value)} °C`

export const formatWatts = (value: number): string => `${oneDecimal.format(value)} W`

/** Durchsatz: „180,0 KB/s“, `null` (noch keine zweite Messung) als „–“. */
export function formatRate(bytesPerSecond: number | null): string {
  return bytesPerSecond === null ? NO_VALUE : `${formatBytes(bytesPerSecond)}/s`
}

/** Takt: „800 MHz“ bzw. „2,1 GHz“. */
export function formatClock(mhz: number): string {
  return mhz < MHZ_PER_GHZ ? `${integer.format(mhz)} MHz` : `${oneDecimal.format(mhz / MHZ_PER_GHZ)} GHz`
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

const LINK_STATES: Readonly<Record<string, string>> = {
  UP: 'verbunden',
  DOWN: 'getrennt',
  UNKNOWN: 'unbekannt',
  DORMANT: 'ruht',
  LOWERLAYERDOWN: 'kein Link'
}

export const linkStateText = (state: string): string => LINK_STATES[state.toUpperCase()] ?? state

const DOCKER_STATES: Readonly<Record<string, string>> = {
  running: 'läuft',
  exited: 'gestoppt',
  restarting: 'startet neu',
  paused: 'pausiert',
  created: 'angelegt',
  dead: 'abgestürzt',
  removing: 'wird entfernt'
}

export const dockerStateText = (state: string): string => DOCKER_STATES[state] ?? state

const DOCKER_UNITS: Readonly<Record<string, string>> = {
  second: 'Sek.',
  minute: 'Min.',
  hour: 'Std.',
  day: 'Tg.',
  week: 'Wo.',
  month: 'Mon.',
  year: 'J.'
}
const DOCKER_HEALTH: Readonly<Record<string, string>> = {
  healthy: 'gesund',
  unhealthy: 'nicht gesund',
  'health: starting': 'Prüfung läuft'
}
const DOCKER_SPAN = /^(About an?|Less than an?|\d+) (second|minute|hour|day|week|month|year)s?$/
const DOCKER_UP = /^Up (.+?)(?: \((.+)\))?$/
const DOCKER_EXITED = /^Exited \((\d+)\) (.+) ago$/

/** „12 hours“ → „12 Std.“, „About an hour“ → „etwa 1 Std.“; `null`, wenn Docker etwas anderes meldet. */
function dockerSpan(text: string): string | null {
  const match = DOCKER_SPAN.exec(text)
  if (!match) return null
  const [, amount = '', unit = ''] = match
  const label = DOCKER_UNITS[unit] ?? unit
  if (amount.startsWith('About')) return `etwa 1 ${label}`
  if (amount.startsWith('Less')) return `unter 1 ${label}`
  return `${amount} ${label}`
}

/** Dockers englische Statuszeile auf Deutsch: „seit 12 Std.“, „vor 2 Tg. beendet (Code 0)“. Unbekanntes bleibt unverändert. */
export function dockerStatusText(status: string): string {
  const up = DOCKER_UP.exec(status)
  if (up) {
    const span = dockerSpan(up[1] ?? '')
    if (span === null) return status
    const health = up[2] ? (DOCKER_HEALTH[up[2]] ?? up[2]) : null
    return health ? `seit ${span} · ${health}` : `seit ${span}`
  }
  const exited = DOCKER_EXITED.exec(status)
  if (exited) {
    const span = dockerSpan(exited[2] ?? '')
    return span === null ? status : `vor ${span} beendet (Code ${exited[1]})`
  }
  return status
}
