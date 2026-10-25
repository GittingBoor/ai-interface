import type { AnalyticsRange, AnalyticsResolution } from './types'

const RANGE_DAYS: Readonly<Record<Exclude<AnalyticsRange, 'all'>, number>> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }
const DAYS_PER_WEEK = 7

const startOfDay = (ts: number): Date => {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d
}

const addDays = (ts: number, days: number): number => {
  const d = new Date(ts)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

/** Beginn der Zeiteinheit (lokale Zeit, Woche ab Montag). */
export function bucketStart(ts: number, resolution: AnalyticsResolution): number {
  const d = startOfDay(ts)
  if (resolution === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % DAYS_PER_WEEK))
  if (resolution === 'month') d.setDate(1)
  return d.getTime()
}

function nextBucket(ts: number, resolution: AnalyticsResolution): number {
  if (resolution === 'day') return addDays(ts, 1)
  if (resolution === 'week') return addDays(ts, DAYS_PER_WEEK)
  const d = new Date(ts)
  d.setMonth(d.getMonth() + 1)
  return d.getTime()
}

/** Alle Zeiteinheiten von `from` bis `to`, lückenlos. */
export function bucketList(from: number, to: number, resolution: AnalyticsResolution): number[] {
  const list: number[] = []
  for (let ts = bucketStart(from, resolution); ts <= to; ts = nextBucket(ts, resolution)) list.push(ts)
  return list
}

/** Tagesbeginn des Zeitraums; „Gesamt“ beginnt mit dem Datenbeginn (ohne Daten: heute). */
export function rangeStart(range: AnalyticsRange, now: number, dataSince: number | null): number {
  if (range === 'all') return startOfDay(dataSince ?? now).getTime()
  return addDays(startOfDay(now).getTime(), -(RANGE_DAYS[range] - 1))
}

/** Beginn des gleich langen Zeitraums davor; null bei „Gesamt“. */
export function previousStart(range: AnalyticsRange, start: number): number | null {
  return range === 'all' ? null : addDays(start, -RANGE_DAYS[range])
}

export function formatBucket(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
