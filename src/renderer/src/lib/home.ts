import type { AnalyticsResult, AnalyticsSeries, Favorite, HostId, TerminalInfo } from '@shared/types'
import { isInside } from '@shared/projectMatch'
import { groupSeries, type ChartSeries, type SeriesStyle } from './analytics'

const FAVORITE_PREFIX = 'fav-'

/** Nur die letzten `days` Zeiteinheiten der Stunden behalten. */
function lastDays(series: AnalyticsSeries, days: number): AnalyticsSeries {
  const hours = series.values.hours.slice(-days)
  return { ...series, values: { ...series.values, hours }, totals: { ...series.totals, hours: hours.reduce((a, b) => a + b, 0) } }
}

/** Projekte mit der meisten aktiven Zeit der letzten `days` Tage; bei Gleichstand Favoriten zuerst. */
export function topProjects(result: AnalyticsResult, favorites: readonly Favorite[], days: number, limit: number, style: SeriesStyle): ChartSeries[] {
  const recent = { ...result, series: result.series.map((s) => lastDays(s, days)) }
  const isFavorite = (s: ChartSeries): number => (s.key.startsWith(FAVORITE_PREFIX) ? 1 : 0)
  return groupSeries(recent, 'project', 'hours', favorites, style)
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total || isFavorite(b) - isFavorite(a))
    .slice(0, limit)
}

/** Jüngstes laufendes Terminal im Projekt (auch Unterordner); beendete zählen nicht, dann wird fortgesetzt. */
export function liveTerminalFor(terminals: readonly TerminalInfo[], host: HostId, path: string): TerminalInfo | null {
  const own = terminals.filter((t) => t.running && !t.orchestrator && isInside({ host, path }, t.host, t.path))
  return own.sort((a, b) => b.startedAt - a.startedAt)[0] ?? null
}
