import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { AnalyticsMetric, AnalyticsResolution } from '@shared/types'
import { useElementSize } from '@renderer/lib/hooks'
import { formatMetric, stackSeries, type ChartMode, type ChartSeries } from '@renderer/lib/analytics'
import { formatDateMedium, formatDayLong, formatDayShort, parseDay } from '@renderer/lib/format'
import { ChartTooltip, TooltipRow } from './ChartTooltip'
import { niceTicks } from './geometry'

interface TrendChartProps {
  readonly buckets: readonly string[]
  readonly series: readonly ChartSeries[]
  readonly mode: ChartMode
  readonly metric: AnalyticsMetric
  readonly resolution: AnalyticsResolution
}

const PLOT_HEIGHT = 224
const AXIS_BAND = 28
/** Kennzahlen mit ganzen Zahlen: Achsenschritt mindestens 1. */
const COUNT_METRICS: readonly AnalyticsMetric[] = ['tokens', 'prompts', 'sessions']
const Y_LABEL_WIDTH = 60
const RIGHT_PAD = 6
const TOP_PAD = 8
const MIN_LABEL_SPACING = 72
const EDGE_LABEL_ZONE = 24
const AREA_OPACITY = 0.72
const DIM_OPACITY = 0.18
const PERCENT_TICKS = [0, 0.25, 0.5, 0.75, 1] as const
const MORPH = { duration: 0.55, ease: [0.16, 1, 0.3, 1] } as const
const REVEAL = { duration: 0.8, ease: [0.16, 1, 0.3, 1] } as const

const percent = new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 0 })
const monthShort = new Intl.DateTimeFormat('de-DE', { month: 'short', year: '2-digit' })
const monthLong = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })

function axisLabel(bucket: string, resolution: AnalyticsResolution): string {
  return resolution === 'month' ? monthShort.format(parseDay(bucket)) : formatDayShort(bucket)
}

function bucketTitle(bucket: string, resolution: AnalyticsResolution): string {
  if (resolution === 'day') return formatDayLong(bucket)
  if (resolution === 'week') return `Woche ab ${formatDateMedium(parseDay(bucket).getTime())}`
  return monthLong.format(parseDay(bucket))
}

interface Frame {
  readonly left: number
  readonly plotWidth: number
  readonly count: number
  readonly top: number
}

const xAt = (f: Frame, i: number): number => (f.count <= 1 ? f.left + f.plotWidth / 2 : f.left + (i / (f.count - 1)) * f.plotWidth)
const yAt = (f: Frame, v: number): number => TOP_PAD + (PLOT_HEIGHT - TOP_PAD) * (1 - (f.top > 0 ? v / f.top : 0))

/** Punkte einer Kante; eine einzelne Zeiteinheit wird über die ganze Breite gezogen. */
function edge(f: Frame, values: readonly number[]): [number, number][] {
  if (f.count <= 1) {
    const y = yAt(f, values[0] ?? 0)
    return [
      [f.left, y],
      [f.left + f.plotWidth, y]
    ]
  }
  return values.map((v, i) => [xAt(f, i), yAt(f, v)])
}

const toPath = (points: readonly [number, number][]): string => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('')

function areaPath(f: Frame, lower: readonly number[], upper: readonly number[]): string {
  const bottom = edge(f, lower).reverse()
  return `${toPath(edge(f, upper))}${bottom.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join('')}Z`
}

/** Welche Zeiteinheiten eine Achsenbeschriftung bekommen: vom Ende her gleichmäßig. */
function labelIndexes(count: number, plotWidth: number): Set<number> {
  const step = Math.max(1, Math.ceil(count / Math.max(1, Math.floor(plotWidth / MIN_LABEL_SPACING))))
  const result = new Set<number>()
  for (let i = count - 1; i >= 0; i -= step) result.add(i)
  return result
}

function anchorFor(x: number, f: Frame): 'start' | 'middle' | 'end' {
  if (x - f.left < EDGE_LABEL_ZONE) return 'start'
  if (f.left + f.plotWidth - x < EDGE_LABEL_ZONE) return 'end'
  return 'middle'
}

interface HoverProps {
  readonly index: number
  readonly buckets: readonly string[]
  readonly series: readonly ChartSeries[]
  readonly mode: ChartMode
  readonly metric: AnalyticsMetric
  readonly resolution: AnalyticsResolution
}

function TooltipBody({ index, buckets, series, mode, metric, resolution }: HoverProps): React.JSX.Element {
  const sum = series.reduce((s, x) => s + (x.values[index] ?? 0), 0)
  const ordered = mode === 'lines' ? [...series].sort((a, b) => (b.values[index] ?? 0) - (a.values[index] ?? 0)) : [...series].reverse()
  const rows = ordered.filter((s) => (s.values[index] ?? 0) > 0)
  return (
    <>
      <p className="mb-1.5 font-[600] text-ink">{bucketTitle(buckets[index] ?? '', resolution)}</p>
      {rows.map((s) => {
        const value = s.values[index] ?? 0
        const text = mode === 'percent' ? `${sum > 0 ? percent.format(value / sum) : '–'} · ${formatMetric(metric, value)}` : formatMetric(metric, value)
        return <TooltipRow key={s.key} label={s.label} value={text} swatch={s.color} />
      })}
      {rows.length === 0 ? <p className="text-ink-3">keine Aktivität</p> : null}
      {series.length > 1 ? (
        <div className="mt-1.5 border-t border-line pt-1.5">
          <TooltipRow label="Summe" value={formatMetric(metric, sum)} />
        </div>
      ) : null}
    </>
  )
}

function Legend({ series, metric, focus, onFocus }: { readonly series: readonly ChartSeries[]; readonly metric: AnalyticsMetric; readonly focus: string | null; onFocus(key: string | null): void }): React.JSX.Element {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-3" style={{ paddingLeft: Y_LABEL_WIDTH }} onMouseLeave={() => onFocus(null)}>
      {series.map((s) => (
        <li
          key={s.key}
          className={`flex items-center gap-1.5 transition-opacity duration-150 ${focus !== null && focus !== s.key ? 'opacity-45' : ''}`}
          onMouseEnter={() => onFocus(s.key)}
        >
          <span aria-hidden className="size-2 rounded-[2px]" style={{ background: s.color }} />
          <span className="text-ink-2">{s.label}</span>
          <span className="num">{formatMetric(metric, s.total)}</span>
        </li>
      ))}
    </ul>
  )
}

/** Verlauf einer Kennzahl je Zeiteinheit: Linien, gestapelte Flächen oder Anteile (100 %). */
export function TrendChart({ buckets, series, mode, metric, resolution }: TrendChartProps): React.JSX.Element {
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const [rawHover, setHover] = useState<number | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const reduced = useReducedMotion() ?? false
  /** Nach einem Wechsel mit weniger Zeiteinheiten kann der alte Index ins Leere zeigen. */
  const hover = rawHover !== null && rawHover < buckets.length ? rawHover : null
  const stacks = useMemo(() => stackSeries(series, mode), [series, mode])
  const max = Math.max(0, ...stacks.flatMap((s) => s.upper))
  const ticks = mode === 'percent' ? [...PERCENT_TICKS] : niceTicks(max, undefined, COUNT_METRICS.includes(metric) ? 1 : 0)
  const frame: Frame = { left: Y_LABEL_WIDTH, plotWidth: Math.max(0, width - Y_LABEL_WIDTH - RIGHT_PAD), count: buckets.length, top: mode === 'percent' ? 1 : (ticks[ticks.length - 1] ?? max) }
  const labels = labelIndexes(buckets.length, frame.plotWidth)
  const structure = `${buckets[0] ?? ''}-${buckets.length}`
  const clipId = `trend-clip-${structure}`
  const tickText = (t: number): string => (mode === 'percent' ? percent.format(t) : t === 0 ? '0' : formatMetric(metric, t))
  const move = (dir: 1 | -1): void => setHover((h) => Math.min(buckets.length - 1, Math.max(0, (h ?? (dir > 0 ? -1 : buckets.length)) + dir)))

  const pick = (clientX: number, rect: DOMRect): void => {
    if (buckets.length <= 1) return setHover(0)
    const ratio = (clientX - rect.left - frame.left) / frame.plotWidth
    setHover(Math.min(buckets.length - 1, Math.max(0, Math.round(ratio * (buckets.length - 1)))))
  }

  return (
    <div>
      <div
        ref={ref}
        className="relative rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-4 focus-visible:ring-offset-base"
        tabIndex={0}
        role="group"
        aria-label={`Verlauf mit ${series.length} ${series.length === 1 ? 'Serie' : 'Serien'} über ${buckets.length} Zeiteinheiten. Pfeiltasten wählen eine Zeiteinheit.`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') move(1)
          if (e.key === 'ArrowLeft') move(-1)
          if (e.key === 'Escape') setHover(null)
        }}
        onBlur={() => setHover(null)}
      >
        {width > 0 ? (
          <svg
            width={width}
            height={PLOT_HEIGHT + AXIS_BAND}
            className="block overflow-visible"
            onMouseMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <clipPath id={clipId}>
                <motion.rect
                  key={structure}
                  x={0}
                  y={0}
                  height={PLOT_HEIGHT + 2}
                  initial={reduced ? false : { width: frame.left }}
                  animate={{ width }}
                  transition={REVEAL}
                />
              </clipPath>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={frame.left} x2={frame.left + frame.plotWidth} y1={yAt(frame, t) + 0.5} y2={yAt(frame, t) + 0.5} stroke="var(--color-line)" strokeWidth={1} strokeDasharray={t === 0 ? undefined : '2 4'} />
                <text x={frame.left - 10} y={yAt(frame, t)} dy="0.32em" textAnchor="end" className="num fill-ink-3 text-[10.5px]">
                  {tickText(t)}
                </text>
              </g>
            ))}
            <g clipPath={`url(#${clipId})`}>
              {series.map((s, i) => {
                const stack = stacks[i]
                if (!stack) return null
                const dimmed = focus !== null && focus !== s.key
                return (
                  <g key={`${structure}-${s.key}`} className="transition-opacity duration-200" opacity={dimmed ? DIM_OPACITY : 1}>
                    <motion.path
                      initial={false}
                      animate={{ d: areaPath(frame, stack.lower, stack.upper), fillOpacity: mode === 'lines' ? 0 : AREA_OPACITY }}
                      transition={reduced ? { duration: 0 } : MORPH}
                      fill={s.color}
                    />
                    <motion.path
                      initial={false}
                      animate={{ d: toPath(edge(frame, stack.upper)), strokeWidth: mode === 'lines' ? 2 : 1.25 }}
                      transition={reduced ? { duration: 0 } : MORPH}
                      fill="none"
                      stroke={s.color}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </g>
                )
              })}
            </g>
            <line x1={frame.left} x2={frame.left + frame.plotWidth} y1={PLOT_HEIGHT + 0.5} y2={PLOT_HEIGHT + 0.5} stroke="var(--color-line-strong)" strokeWidth={1} />
            {buckets.map((b, i) => {
              if (!labels.has(i)) return null
              const x = xAt(frame, i)
              return (
                <text key={b} x={x} y={PLOT_HEIGHT + 18} textAnchor={anchorFor(x, frame)} className="num fill-ink-3 text-[10.5px]">
                  {axisLabel(b, resolution)}
                </text>
              )
            })}
            {hover !== null ? (
              <g pointerEvents="none">
                <line x1={xAt(frame, hover)} x2={xAt(frame, hover)} y1={TOP_PAD} y2={PLOT_HEIGHT} stroke="var(--color-ink-3)" strokeWidth={1} />
                {stacks.map((s, i) => (
                  <circle key={series[i]?.key ?? i} cx={xAt(frame, hover)} cy={yAt(frame, s.upper[hover] ?? 0)} r={3.5} fill={series[i]?.color} stroke="var(--color-base)" strokeWidth={2} />
                ))}
              </g>
            ) : null}
          </svg>
        ) : (
          <div style={{ height: PLOT_HEIGHT + AXIS_BAND }} />
        )}
        {hover !== null && width > 0 ? (
          <ChartTooltip x={xAt(frame, hover)} y={TOP_PAD} containerWidth={width}>
            <TooltipBody index={hover} buckets={buckets} series={series} mode={mode} metric={metric} resolution={resolution} />
          </ChartTooltip>
        ) : null}
      </div>
      <Legend series={series} metric={metric} focus={focus} onFocus={setFocus} />
    </div>
  )
}
