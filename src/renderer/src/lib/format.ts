/** Zahlen-, Zeit- und Größenformate, durchgehend deutsch. */

const LOCALE = 'de-DE'
const THOUSAND = 1_000
const MILLION = 1_000_000
const BILLION = 1_000_000_000
const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const WEEK_DAYS = 7

const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const oneDecimal = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const usd = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const usdCompact = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const dateShort = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit' })
const dateLong = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const dateMedium = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
const dateTime = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const time = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })

export const formatInteger = (value: number): string => integer.format(value)

/** Token kompakt: „812“, „12,4 Tsd.“, „1,2 Mio.“, „3,1 Mrd.“ */
export function formatTokens(value: number): string {
  const abs = Math.abs(value)
  if (abs >= BILLION) return `${oneDecimal.format(value / BILLION)} Mrd.`
  if (abs >= MILLION) return `${oneDecimal.format(value / MILLION)} Mio.`
  if (abs >= THOUSAND * 10) return `${oneDecimal.format(value / THOUSAND)} Tsd.`
  return integer.format(value)
}

/** Aufgeteilt in Zahl und Einheit, für große Kennzahlen mit kleiner Einheit. */
export function splitTokens(value: number): { readonly figure: string; readonly unit: string } {
  const text = formatTokens(value)
  const space = text.indexOf(' ')
  return space === -1 ? { figure: text, unit: '' } : { figure: text.slice(0, space), unit: text.slice(space + 1) }
}

export function formatUsd(value: number | null): string {
  if (value === null) return '–'
  return value >= 1000 ? usdCompact.format(value) : usd.format(value)
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${unit === 0 ? integer.format(value) : oneDecimal.format(value)} ${units[unit]}`
}

export function formatRelative(timestamp: number, now: number = Date.now()): string {
  const diff = now - timestamp
  if (diff < MINUTE_MS) return 'gerade eben'
  if (diff < HOUR_MS) return `vor ${Math.floor(diff / MINUTE_MS)} Min.`
  if (diff < DAY_MS) return `vor ${Math.floor(diff / HOUR_MS)} Std.`
  const days = Math.floor(diff / DAY_MS)
  if (days === 1) return 'gestern'
  if (days < WEEK_DAYS * 2) return `vor ${days} Tagen`
  return dateMedium.format(timestamp)
}

export function formatDuration(ms: number): string {
  if (ms < MINUTE_MS) return '< 1 Min.'
  const hours = Math.floor(ms / HOUR_MS)
  const minutes = Math.round((ms % HOUR_MS) / MINUTE_MS)
  if (hours === 0) return `${minutes} Min.`
  return minutes === 0 ? `${hours} Std.` : `${hours} Std. ${minutes} Min.`
}

export const formatDayShort = (day: string): string => dateShort.format(parseDay(day))
export const formatDayLong = (day: string): string => dateLong.format(parseDay(day))
export const formatDateTime = (timestamp: number): string => dateTime.format(timestamp)
export const formatTime = (timestamp: number): string => time.format(timestamp)
export const formatDateMedium = (timestamp: number): string => dateMedium.format(timestamp)

/** „JJJJ-MM-TT“ als lokales Datum (Mitternacht). */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

/** Heutiges lokales Datum als „JJJJ-MM-TT“. */
export function todayIso(date: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function daysUntil(day: string, now: Date = new Date()): number {
  const today = parseDay(todayIso(now)).getTime()
  return Math.round((parseDay(day).getTime() - today) / DAY_MS)
}

export function formatDue(day: string): string {
  const diff = daysUntil(day)
  if (diff === 0) return 'heute'
  if (diff === 1) return 'morgen'
  if (diff === -1) return 'gestern'
  if (diff < 0) return `seit ${-diff} Tagen`
  if (diff < WEEK_DAYS) return `in ${diff} Tagen`
  return formatDayShort(day)
}

/** Letztes Pfadsegment, für Windows- und Unix-Pfade. */
export function baseName(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

const SECOND_MS = 1_000

/** Restzeit bis zu einem Zeitpunkt: „45 s“, „12 Min. 05 s“, „1 Std. 12 Min.“, „3 Tg. 1 Std.“ */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, ms)
  if (total < MINUTE_MS) return `${Math.floor(total / SECOND_MS)} s`
  if (total < HOUR_MS) {
    const minutes = Math.floor(total / MINUTE_MS)
    const seconds = Math.floor((total % MINUTE_MS) / SECOND_MS)
    return `${minutes} Min. ${String(seconds).padStart(2, '0')} s`
  }
  if (total < DAY_MS) {
    const hours = Math.floor(total / HOUR_MS)
    const minutes = Math.floor((total % HOUR_MS) / MINUTE_MS)
    return minutes === 0 ? `${hours} Std.` : `${hours} Std. ${minutes} Min.`
  }
  const days = Math.floor(total / DAY_MS)
  const hours = Math.floor((total % DAY_MS) / HOUR_MS)
  return hours === 0 ? `${days} Tg.` : `${days} Tg. ${hours} Std.`
}

/** Alter einer Abfrage, sekundengenau in der ersten Minute: „vor 20 s“, sonst wie `formatRelative`. */
export function formatAge(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestamp)
  if (diff < MINUTE_MS) return `vor ${Math.floor(diff / SECOND_MS)} s`
  return formatRelative(timestamp, now)
}
