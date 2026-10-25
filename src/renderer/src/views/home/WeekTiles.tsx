import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { AnalyticsMetric, AnalyticsResult } from '@shared/types'
import { AnimatedNumber } from '@renderer/components/AnimatedNumber'
import { Skeleton } from '@renderer/components/States'
import { Sparkline } from '@renderer/components/charts/Sparkline'
import { changeRatio, formatMetric, METRIC_LABEL } from '@renderer/lib/analytics'
import { useAnalytics } from '@renderer/stores/analyticsStore'
import { useNav } from '@renderer/stores/navStore'

const METRICS: readonly AnalyticsMetric[] = ['tokens', 'hours', 'prompts', 'sessions', 'cost']
/** Serie der Abfrage ohne Aufteilung. */
const TOTAL_SERIES_KEY = 'all'

const change = new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 0, signDisplay: 'exceptZero' })

function Change({ ratio }: { readonly ratio: number | null }): React.JSX.Element {
  if (ratio === null) {
    return (
      <span className="text-ink-3" title="Keine Daten aus der Vorwoche">
        –<span className="sr-only">kein Vergleich mit der Vorwoche</span>
      </span>
    )
  }
  const Icon = ratio > 0 ? ArrowUpRight : ArrowDownRight
  const tone = ratio === 0 ? 'text-ink-2' : ratio > 0 ? 'text-status-idle' : 'text-danger-ink'
  return (
    <span className={`num inline-flex items-center gap-0.5 font-[600] ${tone}`} title="gegenüber der Vorwoche">
      {ratio === 0 ? null : <Icon className="size-3" aria-hidden strokeWidth={2.5} />}
      {change.format(ratio)}
    </span>
  )
}

function openAnalytics(metric: AnalyticsMetric): void {
  const analytics = useAnalytics.getState()
  analytics.setMetric(metric)
  analytics.openWith({ range: '7d', host: 'all', excludedProjects: [] })
  useNav.getState().go('overview')
}

/** Kennzahlen der letzten 7 Tage mit Mini-Verlauf; Klick öffnet die Auswertung mit 7 Tagen. */
export function WeekTiles({ result }: { readonly result: AnalyticsResult | null }): React.JSX.Element {
  const grid = 'grid grid-cols-5 border-y border-line @max-[40rem]/main:grid-cols-3 @max-[26rem]/main:grid-cols-2'
  if (!result) {
    return (
      <div className={grid} aria-busy="true" aria-label="Wochenzahlen werden geladen">
        {METRICS.map((m) => (
          <div key={m} className="px-4 py-3.5 first:pl-0">
            <Skeleton className="h-[5.25rem]" />
          </div>
        ))}
      </div>
    )
  }
  const series = result.series.find((s) => s.key === TOTAL_SERIES_KEY) ?? result.series[0]
  return (
    <ul className={grid}>
      {METRICS.map((m) => (
        <li key={m} className="min-w-0 border-l border-line first:border-l-0 @max-[40rem]/main:[&:nth-child(4)]:border-l-0 @max-[40rem]/main:[&:nth-child(n+4)]:border-t @max-[26rem]/main:border-l-0">
          <button
            type="button"
            onClick={() => openAnalytics(m)}
            title={`${METRIC_LABEL[m]} in der Auswertung ansehen`}
            className="group block w-full px-4 pt-3.5 pb-3 text-left transition-colors duration-150 hover:bg-raised/40 focus-visible:bg-raised/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50"
          >
            <span className="flex items-baseline justify-between gap-2 text-2xs">
              <span className="truncate text-xs font-[560] text-ink-2 group-hover:text-ink">{METRIC_LABEL[m]}</span>
              <Change ratio={result.previous ? changeRatio(result.totals[m], result.previous[m]) : null} />
            </span>
            <AnimatedNumber value={result.totals[m]} format={(v) => formatMetric(m, v)} className="mt-1 block truncate text-[1.1875rem] leading-tight font-[620] tracking-[-0.015em] text-ink [font-stretch:104%]" />
            <Sparkline values={series?.values[m] ?? []} className="mt-2" />
          </button>
        </li>
      ))}
    </ul>
  )
}
