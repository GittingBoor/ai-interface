import { useState } from 'react'
import { motion } from 'motion/react'
import type { MonthActivity } from '@shared/knowledge'
import { ChartTooltip, TooltipRow } from '@renderer/components/charts/ChartTooltip'
import { niceTicks, roundedTopPath } from '@renderer/components/charts/geometry'
import { formatInteger } from '@renderer/lib/format'
import { useElementSize } from '@renderer/lib/hooks'
import { localized } from '@renderer/i18n/activeLocale'
import { useT } from '@renderer/i18n/useT'

const HEIGHT = 176
const AXIS_LEFT = 30
const AXIS_BOTTOM = 22
const TOP_ROOM = 8
const BAR_SHARE = 0.68
const MAX_BAR = 28
const RADIUS = 3
const TICKS = 3
/** Bis zu so vielen Monaten steht unter jeder Säule ihr Monat, darüber nur die Jahreswechsel. */
const EVERY_MONTH_UP_TO = 14
const LABEL_MIN_SPACING = 28
const COLOR = 'var(--color-accent)'
const EASE = [0.16, 1, 0.3, 1] as const
const STAGGER_S = 0.012
const SLOT_HIGHLIGHT = 0.6
const BAR_DIM = 0.45
/** Wertanzeige sitzt etwas über der Säule. */
const TOOLTIP_LIFT = 32

const monthShort = localized((tag) => new Intl.DateTimeFormat(tag, { month: 'short' }))
const monthLong = localized((tag) => new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' }))
const yearOnly = localized((tag) => new Intl.DateTimeFormat(tag, { year: 'numeric' }))

const monthDate = (month: string): Date => {
  const [year, index] = month.split('-').map(Number)
  return new Date(year ?? 0, (index ?? 1) - 1, 1)
}

export const formatMonthLong = (month: string): string => monthLong().format(monthDate(month))

function axisLabel(month: string, index: number, count: number, slot: number): string | null {
  const date = monthDate(month)
  if (count <= EVERY_MONTH_UP_TO && slot >= LABEL_MIN_SPACING) return monthShort().format(date)
  return date.getMonth() === 0 || index === 0 ? yearOnly().format(date) : null
}

interface HoverState {
  readonly index: number
  readonly x: number
  readonly y: number
}

/** Commits je Monat als Säulen; Überfahren zeigt Monat und Anzahl. */
export function ActivityColumns({ activity }: { readonly activity: readonly MonthActivity[] }): React.JSX.Element {
  const [frame, size] = useElementSize<HTMLDivElement>()
  const [hover, setHover] = useState<HoverState | null>(null)
  const t = useT().knowledge
  const max = Math.max(1, ...activity.map((m) => m.commits))
  const ticks = niceTicks(max, TICKS, 1)
  const top = ticks[ticks.length - 1] ?? max
  const plotWidth = Math.max(0, size.width - AXIS_LEFT)
  const plotHeight = HEIGHT - AXIS_BOTTOM - TOP_ROOM
  const slot = activity.length ? plotWidth / activity.length : 0
  const barWidth = Math.min(MAX_BAR, slot * BAR_SHARE)
  const y = (value: number): number => TOP_ROOM + plotHeight - (value / top) * plotHeight
  const total = activity.reduce((a, b) => a + b.commits, 0)
  const peak = activity.reduce<MonthActivity | null>((best, m) => (best === null || m.commits > best.commits ? m : best), null)
  const label = t.view.activityLabel(formatInteger(total), activity.length, peak ? formatMonthLong(peak.month) : '')
  const hovered = hover ? activity[hover.index] : undefined

  return (
    <div ref={frame} className="relative w-full" onMouseLeave={() => setHover(null)}>
      {size.width > 0 ? (
        <svg width={size.width} height={HEIGHT} role="img" aria-label={label} className="block">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={AXIS_LEFT} x2={size.width} y1={y(tick)} y2={y(tick)} stroke="var(--color-line)" strokeDasharray={tick === 0 ? undefined : '2 4'} />
              <text x={AXIS_LEFT - 8} y={y(tick)} textAnchor="end" dominantBaseline="central" fontSize={10} fill="var(--color-ink-3)" className="num">
                {formatInteger(tick)}
              </text>
            </g>
          ))}
          {activity.map((m, i) => {
            const x = AXIS_LEFT + i * slot + (slot - barWidth) / 2
            const text = axisLabel(m.month, i, activity.length, slot)
            const active = hover?.index === i
            return (
              <g key={m.month}>
                <rect x={AXIS_LEFT + i * slot} y={TOP_ROOM} width={slot} height={plotHeight} fill={active ? 'var(--color-raised)' : 'transparent'} opacity={SLOT_HIGHLIGHT} />
                <motion.path
                  d={roundedTopPath(x, y(m.commits), barWidth, plotHeight + TOP_ROOM - y(m.commits), RADIUS)}
                  fill={COLOR}
                  opacity={hover === null || active ? 1 : BAR_DIM}
                  style={{ transformOrigin: `0px ${TOP_ROOM + plotHeight}px` }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.5, delay: i * STAGGER_S, ease: EASE }}
                />
                {text ? (
                  <text x={x + barWidth / 2} y={HEIGHT - 6} textAnchor="middle" fontSize={10} fill="var(--color-ink-3)">
                    {text}
                  </text>
                ) : null}
                <rect
                  x={AXIS_LEFT + i * slot}
                  y={0}
                  width={slot}
                  height={HEIGHT}
                  fill="transparent"
                  onMouseMove={(event) => {
                    const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
                    setHover({ index: i, x: event.clientX - (box?.left ?? 0), y: y(m.commits) - TOOLTIP_LIFT })
                  }}
                />
              </g>
            )
          })}
        </svg>
      ) : null}
      {hover && hovered ? (
        <ChartTooltip x={hover.x} y={hover.y} containerWidth={size.width}>
          <p className="mb-1 font-[600] text-ink">{formatMonthLong(hovered.month)}</p>
          <TooltipRow label={t.view.commits} value={formatInteger(hovered.commits)} swatch={COLOR} />
        </ChartTooltip>
      ) : null}
    </div>
  )
}
