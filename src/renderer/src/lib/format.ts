/** Zahlen-, Zeit- und Größenformate in der gewählten Sprache. Formatter werden je Sprache einmal angelegt. */
import { intlTag, type Locale } from '@shared/i18n/locales'
import { messagesFor, type Messages } from '@shared/i18n/messages'
import { activeLocale } from '../i18n/activeLocale'

const THOUSAND = 1_000
const COMPACT_FROM = THOUSAND * 10
const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const WEEK_DAYS = 7
const SECOND_MS = 1_000
const BYTE_UNITS: readonly string[] = ['B', 'KB', 'MB', 'GB', 'TB']
const BYTE_STEP = 1024
/** Führende Zahl (mit Vorzeichen und Trennern) und Einheit, z. B. „12,4 Mio.“, „1.2万“, „12.4K“. */
const FIGURE_AND_UNIT = /^([-\u2212+]?[\d.,\u00a0\u202f]*\d)\s*(.*)$/u

interface Formatters {
  readonly tag: string
  readonly messages: Messages['format']
  readonly integer: Intl.NumberFormat
  readonly oneDecimal: Intl.NumberFormat
  readonly percent: Intl.NumberFormat
  readonly percentFine: Intl.NumberFormat
  readonly compact: Intl.NumberFormat
  readonly usd: Intl.NumberFormat
  readonly usdCompact: Intl.NumberFormat
  readonly relative: Intl.RelativeTimeFormat
  readonly relativeDays: Intl.RelativeTimeFormat
  readonly daysCounted: Intl.RelativeTimeFormat
  readonly dateShort: Intl.DateTimeFormat
  readonly dateLong: Intl.DateTimeFormat
  readonly dateMedium: Intl.DateTimeFormat
  readonly dateTime: Intl.DateTimeFormat
  readonly time: Intl.DateTimeFormat
}

const cache = new Map<Locale, Formatters>()

function createFormatters(locale: Locale): Formatters {
  const tag = intlTag(locale)
  const usdOptions: Intl.NumberFormatOptions = { style: 'currency', currency: 'USD' }
  return {
    tag,
    messages: messagesFor(locale).format,
    integer: new Intl.NumberFormat(tag, { maximumFractionDigits: 0 }),
    oneDecimal: new Intl.NumberFormat(tag, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    percent: new Intl.NumberFormat(tag, { style: 'percent', maximumFractionDigits: 0 }),
    percentFine: new Intl.NumberFormat(tag, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    compact: new Intl.NumberFormat(tag, { notation: 'compact', maximumFractionDigits: 1 }),
    usd: new Intl.NumberFormat(tag, { ...usdOptions, minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    usdCompact: new Intl.NumberFormat(tag, { ...usdOptions, maximumFractionDigits: 0 }),
    relative: new Intl.RelativeTimeFormat(tag, { style: 'short' }),
    relativeDays: new Intl.RelativeTimeFormat(tag, { numeric: 'auto' }),
    daysCounted: new Intl.RelativeTimeFormat(tag, { numeric: 'always' }),
    dateShort: new Intl.DateTimeFormat(tag, { day: '2-digit', month: '2-digit' }),
    dateLong: new Intl.DateTimeFormat(tag, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    dateMedium: new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric' }),
    dateTime: new Intl.DateTimeFormat(tag, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    time: new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit' })
  }
}

function formatters(): Formatters {
  const locale = activeLocale()
  const known = cache.get(locale)
  if (known) return known
  const created = createFormatters(locale)
  cache.set(locale, created)
  return created
}

export const formatInteger = (value: number): string => formatters().integer.format(value)
export const formatOneDecimal = (value: number): string => formatters().oneDecimal.format(value)

const PERCENT_BASE = 100
/** Prozentwert (0 bis 100) mit dem Zeichenabstand der Sprache: „9 %“ (de), „9%“ (en). */
export const formatPercentPoints = (value: number): string => formatters().percent.format(value / PERCENT_BASE)
/** Wie `formatPercentPoints`, mit einer Nachkommastelle. */
export const formatPercentPointsFine = (value: number): string => formatters().percentFine.format(value / PERCENT_BASE)

/** Token kompakt: „812“, „12,4 Mio.“ (deutsch), „12.4K“ (englisch), „1.2万“ (chinesisch). */
export function formatTokens(value: number): string {
  const f = formatters()
  return Math.abs(value) >= COMPACT_FROM ? f.compact.format(value) : f.integer.format(value)
}

/** Aufgeteilt in Zahl und Einheit, für große Kennzahlen mit kleiner Einheit. */
export function splitTokens(value: number): { readonly figure: string; readonly unit: string } {
  const text = formatTokens(value)
  const match = FIGURE_AND_UNIT.exec(text)
  return match ? { figure: match[1] ?? text, unit: match[2] ?? '' } : { figure: text, unit: '' }
}

export function formatUsd(value: number | null): string {
  if (value === null) return '–'
  const f = formatters()
  return value >= 1000 ? f.usdCompact.format(value) : f.usd.format(value)
}

export function formatBytes(bytes: number): string {
  const f = formatters()
  let value = bytes
  let unit = 0
  while (value >= BYTE_STEP && unit < BYTE_UNITS.length - 1) {
    value /= BYTE_STEP
    unit++
  }
  return `${unit === 0 ? f.integer.format(value) : f.oneDecimal.format(value)} ${BYTE_UNITS[unit]}`
}

export function formatRelative(timestamp: number, now: number = Date.now()): string {
  const f = formatters()
  const diff = now - timestamp
  if (diff < MINUTE_MS) return f.messages.justNow
  if (diff < HOUR_MS) return f.relative.format(-Math.floor(diff / MINUTE_MS), 'minute')
  if (diff < DAY_MS) return f.relative.format(-Math.floor(diff / HOUR_MS), 'hour')
  const days = Math.floor(diff / DAY_MS)
  if (days < WEEK_DAYS * 2) return (days === 1 ? f.relativeDays : f.daysCounted).format(-days, 'day')
  return f.dateMedium.format(timestamp)
}

export function formatDuration(ms: number): string {
  const { messages } = formatters()
  if (ms < MINUTE_MS) return messages.lessThanMinute
  const hours = Math.floor(ms / HOUR_MS)
  const minutes = Math.round((ms % HOUR_MS) / MINUTE_MS)
  if (hours === 0) return `${minutes} ${messages.unitMinute}`
  return minutes === 0 ? `${hours} ${messages.unitHour}` : `${hours} ${messages.unitHour} ${minutes} ${messages.unitMinute}`
}

export const formatDayShort = (day: string): string => formatters().dateShort.format(parseDay(day))
export const formatDayLong = (day: string): string => formatters().dateLong.format(parseDay(day))
export const formatDateTime = (timestamp: number): string => formatters().dateTime.format(timestamp)
export const formatTime = (timestamp: number): string => formatters().time.format(timestamp)
export const formatDateMedium = (timestamp: number): string => formatters().dateMedium.format(timestamp)

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
  const f = formatters()
  const diff = daysUntil(day)
  if (diff < -1) return f.messages.overdueDays(-diff)
  if (diff < WEEK_DAYS) return (Math.abs(diff) <= 1 ? f.relativeDays : f.daysCounted).format(diff, 'day')
  return formatDayShort(day)
}

/** Letztes Pfadsegment, für Windows- und Unix-Pfade. */
export function baseName(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

/** Restzeit bis zu einem Zeitpunkt: „45 s“, „12 Min. 05 s“, „1 Std. 12 Min.“, „3 Tg. 1 Std.“ (Einheiten je Sprache). */
export function formatCountdown(ms: number): string {
  const { messages } = formatters()
  const total = Math.max(0, ms)
  if (total < MINUTE_MS) return `${Math.floor(total / SECOND_MS)} ${messages.unitSecond}`
  if (total < HOUR_MS) {
    const minutes = Math.floor(total / MINUTE_MS)
    const seconds = String(Math.floor((total % MINUTE_MS) / SECOND_MS)).padStart(2, '0')
    return `${minutes} ${messages.unitMinute} ${seconds} ${messages.unitSecond}`
  }
  if (total < DAY_MS) {
    const hours = Math.floor(total / HOUR_MS)
    const minutes = Math.floor((total % HOUR_MS) / MINUTE_MS)
    return minutes === 0 ? `${hours} ${messages.unitHour}` : `${hours} ${messages.unitHour} ${minutes} ${messages.unitMinute}`
  }
  const days = Math.floor(total / DAY_MS)
  const hours = Math.floor((total % DAY_MS) / HOUR_MS)
  return hours === 0 ? `${days} ${messages.unitDay}` : `${days} ${messages.unitDay} ${hours} ${messages.unitHour}`
}

/** Alter einer Abfrage, sekundengenau in der ersten Minute: „vor 20 s“, sonst wie `formatRelative`. */
export function formatAge(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestamp)
  if (diff < MINUTE_MS) return formatters().relative.format(-Math.floor(diff / SECOND_MS), 'second')
  return formatRelative(timestamp, now)
}
