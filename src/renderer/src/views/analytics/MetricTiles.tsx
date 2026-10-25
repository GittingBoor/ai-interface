import { motion } from 'motion/react'
import { ArrowDownRight, ArrowUpRight, CircleDashed } from 'lucide-react'
import type { AnalyticsMetric, AnalyticsRange, AnalyticsResult } from '@shared/types'
import { AnimatedNumber } from '@renderer/components/AnimatedNumber'
import { changeRatio, formatMetric, METRIC_LABEL } from '@renderer/lib/analytics'

const METRICS: readonly AnalyticsMetric[] = ['tokens', 'cost', 'hours', 'prompts', 'sessions']

const PREVIOUS_TEXT: Readonly<Record<AnalyticsRange, string>> = {
  '7d': 'ggü. Vorwoche',
  '30d': 'ggü. 30 Tagen davor',
  '90d': 'ggü. Quartal davor',
  '365d': 'ggü. Vorjahr',
  all: ''
}

const change = new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 0, signDisplay: 'exceptZero' })

function Change({ ratio, range }: { readonly ratio: number | null; readonly range: AnalyticsRange }): React.JSX.Element {
  if (ratio === null) {
    const why = range === 'all' ? 'Bei „Gesamt“ gibt es keinen Vergleich.' : 'Der Zeitraum davor liegt vor Beginn der Daten oder war leer.'
    return (
      <span className="text-ink-3" title={why}>
        –<span className="sr-only">kein Vergleich. {why}</span>
      </span>
    )
  }
  const up = ratio > 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className={`num inline-flex items-center gap-0.5 font-[600] ${ratio === 0 ? 'text-ink-2' : up ? 'text-status-idle' : 'text-danger-ink'}`}>
        {ratio === 0 ? null : <Icon className="size-3.5" aria-hidden strokeWidth={2.25} />}
        {change.format(ratio)}
      </span>
      <span className="truncate text-ink-3">{PREVIOUS_TEXT[range]}</span>
    </span>
  )
}

interface MetricTilesProps {
  readonly result: AnalyticsResult
  readonly range: AnalyticsRange
  readonly metric: AnalyticsMetric
  onSelect(metric: AnalyticsMetric): void
}

/** Fünf Kennzahlen des Zeitraums; die gewählte Kachel bestimmt die Kennzahl aller Diagramme. */
export function MetricTiles({ result, range, metric, onSelect }: MetricTilesProps): React.JSX.Element {
  const move = (dir: 1 | -1): void => {
    const next = METRICS[(METRICS.indexOf(metric) + dir + METRICS.length) % METRICS.length]
    if (next) onSelect(next)
  }
  return (
    <div
      role="radiogroup"
      aria-label="Kennzahl der Diagramme"
      className="grid grid-cols-5 border-y border-line @max-[46rem]/content:grid-cols-3 @max-[28rem]/content:grid-cols-2"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') move(1)
        if (e.key === 'ArrowLeft') move(-1)
      }}
    >
      {METRICS.map((m) => {
        const active = m === metric
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(m)}
            className={`group relative min-w-0 border-l border-line px-5 pt-4 pb-4 text-left transition-colors duration-150 first:border-l-0 first:pl-0 @max-[46rem]/content:[&:nth-child(4)]:border-l-0 @max-[46rem]/content:[&:nth-child(4)]:pl-0 @max-[46rem]/content:[&:nth-child(n+4)]:border-t @max-[28rem]/content:border-l-0 @max-[28rem]/content:pl-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50 ${active ? '' : 'hover:bg-raised/40'}`}
          >
            {active ? (
              <motion.span layoutId="metric-tile-mark" aria-hidden className="absolute inset-x-0 -top-px h-0.5 rounded-full bg-accent" transition={{ type: 'spring', bounce: 0.12, duration: 0.4 }} />
            ) : null}
            <span className={`block text-xs font-[560] transition-colors duration-150 ${active ? 'text-accent-text' : 'text-ink-2'}`}>{METRIC_LABEL[m]}</span>
            <AnimatedNumber
              value={result.totals[m]}
              format={(v) => formatMetric(m, v)}
              className={`mt-1.5 block truncate text-[1.5rem] leading-tight font-[620] tracking-[-0.02em] [font-stretch:104%] ${active ? 'text-ink' : 'text-ink-2'}`}
            />
            <span className="mt-1.5 flex min-h-4 items-center gap-2 text-2xs">
              <Change ratio={result.previous ? changeRatio(result.totals[m], result.previous[m]) : null} range={range} />
            </span>
            {m === 'cost' && result.hasUnpriced ? (
              <span title="Enthält Token von Modellen ohne hinterlegten Preis. Preise in den Einstellungen ergänzen." className="mt-1 inline-flex items-center gap-1 text-2xs text-warn">
                <CircleDashed className="size-3" aria-hidden />
                <span className="sr-only">Enthält unbepreiste Modelle</span>
                <span aria-hidden>+ unbepreist</span>
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
