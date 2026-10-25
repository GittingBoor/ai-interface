import { motion } from 'motion/react'
import type { AnalyticsMetric } from '@shared/types'
import { formatMetric, type ChartSeries } from '@renderer/lib/analytics'

interface RankingBarsProps {
  readonly series: readonly ChartSeries[]
  readonly metric: AnalyticsMetric
  /** Schlüssel der hervorgehobenen Serie (aktiver Drilldown). */
  readonly selected: string | null
  /** Ohne Handler sind die Zeilen nicht klickbar. */
  readonly onSelect?: (series: ChartSeries) => void
  /** Serien ab dieser Stelle stecken im Verlauf im „Rest“ und werden gedämpft gefärbt. */
  readonly restFrom: number
}

const MIN_BAR_PERCENT = 1.5
const STAGGER_S = 0.03
const MAX_STAGGERED = 12
const REST_TONE = 'var(--color-ink-3)'

const share = new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 1 })

/** Serien nach Kennzahl im Zeitraum, mit Wert und Anteil; Klick bohrt in die Serie. */
export function RankingBars({ series, metric, selected, onSelect, restFrom }: RankingBarsProps): React.JSX.Element {
  const max = Math.max(0, ...series.map((s) => s.total))
  const sum = series.reduce((s, x) => s + x.total, 0)
  return (
    <ol className="-mx-2 max-h-[25.5rem] space-y-0.5 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
      {series.map((s, i) => {
        const active = selected === s.key
        const dimmed = selected !== null && !active
        const color = i >= restFrom ? REST_TONE : s.color
        const body = (
          <>
            <span className="flex items-baseline gap-3 text-[0.8125rem]">
              <span className={`min-w-0 flex-1 truncate ${active ? 'font-[600] text-ink' : 'text-ink-2'}`}>{s.label}</span>
              <span className="num w-12 shrink-0 text-right text-xs text-ink-3">{sum > 0 ? share.format(s.total / sum) : '–'}</span>
              <span className="num w-[5.25rem] shrink-0 text-right font-[560] text-ink">{formatMetric(metric, s.total)}</span>
            </span>
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-raised-2/70">
              <motion.span
                className="block h-full origin-left rounded-full"
                style={{ background: color, width: `${max > 0 ? Math.max(MIN_BAR_PERCENT, (s.total / max) * 100) : 0}%` }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: Math.min(i, MAX_STAGGERED) * STAGGER_S, ease: [0.16, 1, 0.3, 1] }}
              />
            </span>
          </>
        )
        const box = `block w-full rounded-md px-2 py-2 text-left transition-[opacity,background-color] duration-150 ${dimmed ? 'opacity-50' : ''} ${active ? 'bg-raised' : ''}`
        return (
          <li key={s.key}>
            {onSelect ? (
              <button
                type="button"
                className={`${box} hover:bg-raised focus-visible:bg-raised focus-visible:outline-none hover:opacity-100`}
                aria-pressed={active}
                title={active ? 'Filter aufheben' : `Nur „${s.label}“ zeigen`}
                onClick={() => onSelect(s)}
              >
                {body}
              </button>
            ) : (
              <div className={box}>{body}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
