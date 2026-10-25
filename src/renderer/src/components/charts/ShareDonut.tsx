import { useState } from 'react'
import { motion } from 'motion/react'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { formatMeasure, measureOf, MEASURE_LABEL, REST_KEY, type ActivityGroup, type ActivityMeasure } from '@renderer/lib/projectActivity'
import { ChartTooltip, TooltipRow } from './ChartTooltip'
import { ringSegmentPath } from './geometry'

interface ShareDonutProps {
  readonly groups: readonly ActivityGroup[]
  readonly measure: ActivityMeasure
}

const SIZE = 176
const OUTER = 84
const INNER = 58
const HOVER_GROW = 4
/** Abstand zwischen Segmenten in px, als Winkel am mittleren Radius. */
const GAP_PX = 2
const FULL_TURN = Math.PI * 2
const MIN_VISIBLE_PERCENT = 1
/** Tooltip unter dem Ring, linksbündig (ChartTooltip rückt 14 px ein). */
const TOOLTIP_X = -14
const TOOLTIP_GAP = 10
const TOOLTIP_ROOM = 400
const percentFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 })

interface Segment {
  readonly group: ActivityGroup
  readonly value: number
  readonly share: number
  readonly start: number
  readonly end: number
}

function toSegments(groups: readonly ActivityGroup[], measure: ActivityMeasure): Segment[] {
  const total = groups.reduce((sum, g) => sum + measureOf(g, measure), 0)
  if (total <= 0) return []
  let angle = 0
  return groups.map((group) => {
    const value = measureOf(group, measure)
    const share = value / total
    const start = angle
    angle += share * FULL_TURN
    return { group, value, share, start, end: angle }
  })
}

const formatShare = (share: number): string => (share * 100 < MIN_VISIBLE_PERCENT ? '< 1 %' : `${percentFormat.format(share * 100)} %`)

/** Ringdiagramm: Anteil je Projekt an Arbeitszeit oder Kennzahl, mit Legende. */
export function ShareDonut({ groups, measure }: ShareDonutProps): React.JSX.Element {
  const [hover, setHover] = useState<number | null>(null)
  const segments = toSegments(groups, measure)
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const pad = GAP_PX / ((OUTER + INNER) / 2)
  const center = SIZE / 2
  const active = hover !== null ? segments[hover] : undefined

  return (
    <div className="flex items-start gap-7" onMouseLeave={() => setHover(null)}>
      <div
        className="relative shrink-0 outline-none"
        style={{ width: SIZE, height: SIZE }}
        tabIndex={0}
        role="group"
        aria-label={`Anteil je Projekt an ${MEASURE_LABEL[measure]}. Pfeiltasten wählen ein Segment.`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setHover((h) => ((h ?? -1) + 1) % segments.length)
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setHover((h) => ((h ?? segments.length) - 1 + segments.length) % segments.length)
          if (e.key === 'Escape') setHover(null)
        }}
        onBlur={() => setHover(null)}
      >
        <motion.svg
          width={SIZE}
          height={SIZE}
          className="block overflow-visible"
          initial={{ opacity: 0, rotate: -24, scale: 0.94 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {segments.map((s, i) => {
            const grow = hover === i ? HOVER_GROW : 0
            const halfPad = segments.length > 1 ? pad / 2 : 0
            return (
              <path
                key={s.group.key}
                d={ringSegmentPath(center, center, OUTER + grow, INNER, s.start + halfPad, s.end - halfPad)}
                fill={s.group.color}
                className="transition-opacity duration-150"
                opacity={hover !== null && hover !== i ? 0.4 : 1}
                onMouseEnter={() => setHover(i)}
              />
            )
          })}
        </motion.svg>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="num text-[1.0625rem] leading-tight font-[640] tracking-[-0.01em] text-ink [font-stretch:106%]">
            {active ? formatShare(active.share) : formatMeasure(total, measure)}
          </span>
          <span className="mx-auto mt-0.5 max-w-[6.5rem] truncate text-2xs text-ink-3">{active ? active.group.label : MEASURE_LABEL[measure]}</span>
        </div>
        {active ? (
          <ChartTooltip x={TOOLTIP_X} y={SIZE + TOOLTIP_GAP} containerWidth={SIZE + TOOLTIP_ROOM}>
            <p className="mb-1.5 truncate font-[600] text-ink">{active.group.key === REST_KEY ? `Weitere (${active.group.mergedCount})` : active.group.label}</p>
            <TooltipRow label={MEASURE_LABEL[measure]} value={formatMeasure(active.value, measure)} swatch={active.group.color} />
            <TooltipRow label="Anteil" value={formatShare(active.share)} />
          </ChartTooltip>
        ) : null}
      </div>

      <ul className="min-w-0 flex-1 space-y-px pt-1">
        {segments.map((s, i) => (
          <li
            key={s.group.key}
            onMouseEnter={() => setHover(i)}
            className={`flex items-center gap-2 rounded-md px-2 py-[0.3125rem] text-[0.8125rem] transition-[background-color,opacity] duration-150 ${hover === i ? 'bg-raised' : ''} ${hover !== null && hover !== i ? 'opacity-55' : ''}`}
          >
            <ProjectMark color={s.group.color} icon={s.group.icon} size="sm" />
            <span className={`min-w-0 flex-1 truncate ${s.group.isProject ? 'text-ink' : 'text-ink-2'}`}>
              {s.group.label}
              {s.group.key === REST_KEY ? <span className="num ml-1.5 text-2xs text-ink-3">{s.group.mergedCount}</span> : null}
            </span>
            <span className="num shrink-0 text-xs font-[560] text-ink">{formatShare(s.share)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
