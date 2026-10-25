import { useState } from 'react'
import { useElementSize } from '@renderer/lib/hooks'
import type { MeterTone } from '@renderer/lib/miniPc'
import { NO_VALUE } from '@renderer/lib/miniPcFormat'
import { nearestIndex, trendDomain, trendSegments, trendStats, type TrendDomainOptions, type TrendStats, type TrendValue } from '@renderer/lib/trend'
import { TONE_TEXT } from './parts'

const PLOT_HEIGHT = 52
/** Platz für die Achsenwerte über und unter der Zeichenfläche. */
const LABEL_BAND = 14
const CHART_HEIGHT = PLOT_HEIGHT + 2 * LABEL_BAND
const LINE_WIDTH = 1.5
const AREA_OPACITY = 0.1
const END_DOT_RADIUS = 2.5
const HOVER_DOT_RADIUS = 3.5
const LONE_DOT_RADIUS = 1.5
const SWATCH_WIDTH = 12
const DASH = '4 3'
/** Ab zwei Messwerten lässt sich eine Linie zeichnen. */
const MIN_POINTS = 2

const clock = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export interface TrendSeries {
  readonly key: string
  readonly label: string
  readonly values: readonly TrendValue[]
  /** CSS-Farbe der Linie. */
  readonly color: string
  /** Gestrichelt, damit zwei Linien nicht nur über die Farbe unterscheidbar sind. */
  readonly dashed?: boolean
}

interface TrendChartProps {
  readonly title: string
  readonly times: readonly number[]
  readonly series: readonly TrendSeries[]
  readonly format: (value: number) => string
  readonly domain: TrendDomainOptions
  /** Färbung des aktuellen Werts (z. B. warme Temperatur). */
  readonly tone?: MeterTone
  /** Gewählter Messpunkt, über alle Verlaufslinien hinweg gleich. */
  readonly hover: number | null
  onHover(index: number | null): void
}

interface Scale {
  x(index: number): number
  y(value: number): number
}

function LineSwatch({ series }: { readonly series: TrendSeries }): React.JSX.Element {
  return (
    <svg width={SWATCH_WIDTH} height={4} aria-hidden className="shrink-0">
      <line x1={0} x2={SWATCH_WIDTH} y1={2} y2={2} stroke={series.color} strokeWidth={LINE_WIDTH} strokeDasharray={series.dashed ? DASH : undefined} />
    </svg>
  )
}

interface SeriesMarksProps {
  readonly series: TrendSeries
  readonly scale: Scale
  readonly filled: boolean
}

/** Linie einer Reihe; Lücken (`null`) unterbrechen sie, einzelne Werte werden zu Punkten. */
function SeriesMarks({ series, scale, filled }: SeriesMarksProps): React.JSX.Element {
  const segments = trendSegments(series.values)
  const point = (index: number): string => `${scale.x(index)},${scale.y(series.values[index] ?? 0)}`
  const lastSegment = segments[segments.length - 1]
  const lastIndex = lastSegment?.[lastSegment.length - 1]
  return (
    <g>
      {segments.map((segment) => {
        const first = segment[0] ?? 0
        const last = segment[segment.length - 1] ?? first
        if (segment.length < MIN_POINTS) return <circle key={first} cx={scale.x(first)} cy={scale.y(series.values[first] ?? 0)} r={LONE_DOT_RADIUS} fill={series.color} />
        const line = `M${segment.map(point).join(' L')}`
        return (
          <g key={first}>
            {filled ? <path d={`${line} L${scale.x(last)},${scale.y(0)} L${scale.x(first)},${scale.y(0)} Z`} fill={series.color} opacity={AREA_OPACITY} /> : null}
            <path d={line} fill="none" stroke={series.color} strokeWidth={LINE_WIDTH} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={series.dashed ? DASH : undefined} />
          </g>
        )
      })}
      {lastIndex !== undefined ? <circle cx={scale.x(lastIndex)} cy={scale.y(series.values[lastIndex] ?? 0)} r={END_DOT_RADIUS} fill={series.color} /> : null}
    </g>
  )
}

function Collecting(): React.JSX.Element {
  return (
    <div className="flex items-center border-b border-dashed border-line" style={{ height: CHART_HEIGHT - LABEL_BAND, marginBottom: LABEL_BAND }}>
      <p className="text-2xs text-ink-3">Sammelt Werte …</p>
    </div>
  )
}

function rangeText(series: readonly TrendSeries[], format: (value: number) => string): string {
  const parts = series.map((s) => {
    const stats = trendStats(s.values)
    if (!stats) return null
    return series.length > 1 ? `${s.label} bis ${format(stats.max)}` : `Min. ${format(stats.min)} · Max. ${format(stats.max)}`
  })
  return parts.filter((p): p is string => p !== null).join(' · ')
}

/** Eine schlanke Verlaufslinie mit aktuellem Wert, Spanne und wählbarem Messpunkt. */
export function TrendChart({ title, times, series, format, domain, tone = 'normal', hover, onHover }: TrendChartProps): React.JSX.Element {
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  /** Nur die Linie mit Tastaturfokus sagt den gewählten Messpunkt an, sonst spräche jede Linie gleichzeitig. */
  const [focused, setFocused] = useState(false)
  const lastIndex = times.length - 1
  const shown = hover !== null && hover <= lastIndex ? hover : lastIndex
  const valueAt = (s: TrendSeries): string => {
    const value = s.values[shown]
    return value === null || value === undefined ? NO_VALUE : format(value)
  }
  const stats: TrendStats | null = trendStats(series.flatMap((s) => s.values))
  const drawable = stats !== null && series.some((s) => (trendStats(s.values)?.count ?? 0) >= MIN_POINTS)
  const [low, high] = stats ? trendDomain(stats, domain) : [0, 1]
  const start = times[0] ?? 0
  const span = (times[lastIndex] ?? start) - start
  const scale: Scale = {
    x: (index) => (span > 0 ? (((times[index] ?? start) - start) / span) * width : width),
    y: (value) => LABEL_BAND + PLOT_HEIGHT - ((value - low) / (high - low)) * PLOT_HEIGHT
  }
  const range = rangeText(series, format)
  const current = series.map((s) => `${series.length > 1 ? `${s.label} ` : ''}${valueAt(s)}`).join(', ')

  return (
    <div
      ref={ref}
      role="group"
      tabIndex={drawable ? 0 : undefined}
      aria-label={drawable ? `${title}, Verlauf: aktuell ${current}. ${range}. Pfeiltasten wählen einen Messpunkt.` : `${title}: ${current}. Der Verlauf sammelt noch Werte.`}
      className="min-w-0 rounded-sm"
      onKeyDown={(e) => {
        if (!drawable) return
        if (e.key === 'ArrowRight') onHover(Math.min((hover ?? lastIndex - 1) + 1, lastIndex))
        if (e.key === 'ArrowLeft') onHover(Math.max((hover ?? lastIndex + 1) - 1, 0))
        if (e.key === 'Escape') onHover(null)
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false)
        onHover(null)
      }}
    >
      <div className="flex min-h-6 flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-xs text-ink-3">{title}</span>
        <span className="flex items-baseline gap-3">
          {series.map((s) => (
            <span key={s.key} className="flex items-baseline gap-1.5">
              {series.length > 1 ? (
                <span className="flex items-center gap-1 self-center text-2xs text-ink-3">
                  <LineSwatch series={s} />
                  {s.label}
                </span>
              ) : null}
              <span className={`num font-[600] ${series.length > 1 ? 'text-[0.8125rem]' : 'text-[0.9375rem]'} ${TONE_TEXT[hover === null ? tone : 'normal']}`}>{valueAt(s)}</span>
            </span>
          ))}
        </span>
      </div>
      {drawable && width > 0 ? (
        <svg
          width={width}
          height={CHART_HEIGHT}
          aria-hidden
          className="mt-0.5 block overflow-visible"
          onMouseMove={(e) => {
            const x = e.clientX - e.currentTarget.getBoundingClientRect().left
            onHover(nearestIndex(times, start + (x / width) * span))
          }}
          onMouseLeave={() => onHover(null)}
        >
          <line x1={0} x2={width} y1={LABEL_BAND + 0.5} y2={LABEL_BAND + 0.5} stroke="var(--color-line)" strokeDasharray="2 3" />
          <line x1={0} x2={width} y1={LABEL_BAND + PLOT_HEIGHT + 0.5} y2={LABEL_BAND + PLOT_HEIGHT + 0.5} stroke="var(--color-line-strong)" />
          <text x={width} y={LABEL_BAND - 4} textAnchor="end" className="num fill-ink-3 text-[10px]">
            {format(high)}
          </text>
          <text x={width} y={CHART_HEIGHT - 2} textAnchor="end" className="num fill-ink-3 text-[10px]">
            {low === 0 ? '0' : format(low)}
          </text>
          {series.map((s, i) => (
            <SeriesMarks key={s.key} series={s} scale={scale} filled={domain.zeroBased && i === 0} />
          ))}
          {hover !== null && hover <= lastIndex ? (
            <g>
              <line x1={scale.x(hover)} x2={scale.x(hover)} y1={LABEL_BAND} y2={LABEL_BAND + PLOT_HEIGHT} stroke="var(--color-ink-3)" />
              {series.map((s) => {
                const value = s.values[hover]
                return value === null || value === undefined ? null : (
                  <circle key={s.key} cx={scale.x(hover)} cy={scale.y(value)} r={HOVER_DOT_RADIUS} fill={s.color} stroke="var(--color-canvas)" strokeWidth={2} />
                )
              })}
            </g>
          ) : null}
        </svg>
      ) : drawable ? (
        <div style={{ height: CHART_HEIGHT }} className="mt-0.5" />
      ) : (
        <div className="mt-0.5">
          <Collecting />
        </div>
      )}
      <p className="num -mt-2.5 flex min-h-4 justify-between gap-3 pr-16 text-2xs text-ink-3">
        <span className="truncate">{!drawable ? 'Linie ab der zweiten Messung' : hover !== null && hover <= lastIndex ? `${clock.format(times[hover] ?? start)} Uhr` : range}</span>
      </p>
      {focused && hover !== null && hover <= lastIndex ? (
        <span role="status" className="sr-only">
          {clock.format(times[hover] ?? start)} Uhr: {current}
        </span>
      ) : null}
    </div>
  )
}
