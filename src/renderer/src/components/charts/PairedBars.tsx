import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { hostLabel } from '@renderer/lib/hosts'
import { formatInteger, formatUsd } from '@renderer/lib/format'
import { formatMeasure, MEASURE_LABEL, REST_KEY, type ActivityGroup, type ComparisonMetric } from '@renderer/lib/projectActivity'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { useElementSize } from '@renderer/lib/hooks'
import { ChartTooltip, TooltipRow } from './ChartTooltip'

interface PairedBarsProps {
  readonly groups: readonly ActivityGroup[]
  readonly metric: ComparisonMetric
}

/** Deckkraft der Kennzahl-Balken: gleiche Projektfarbe, heller als die Arbeitszeit. */
const METRIC_TINT_PERCENT = 55
const MIN_BAR_PERCENT = 1.2
const BAR_EASE = [0.16, 1, 0.3, 1] as const
const BAR_DURATION_S = 0.6
const BAR_STAGGER_S = 0.035
const TOOLTIP_X_REM = 13.5
const REM_PX = 14
const TOOLTIP_Y_OFFSET = 30

const tint = (color: string): string => `color-mix(in oklch, ${color} ${METRIC_TINT_PERCENT}%, transparent)`

function Bar({ value, max, color, index }: { readonly value: number; readonly max: number; readonly color: string; readonly index: number }): React.JSX.Element {
  const width = value > 0 ? Math.max(MIN_BAR_PERCENT, (value / max) * 100) : 0
  return (
    <div className="h-1.5 overflow-hidden">
      <motion.div
        className="h-full origin-left rounded-r-[3px]"
        style={{ background: color, width: `${width}%` }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: BAR_DURATION_S, delay: 0.05 + index * BAR_STAGGER_S, ease: BAR_EASE }}
      />
    </div>
  )
}

export function PairedLegend({ metric }: { readonly metric: ComparisonMetric }): React.JSX.Element {
  const swatch = 'var(--color-ink-3)'
  return (
    <span className="flex items-center gap-4 text-xs text-ink-3">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-1.5 w-3 rounded-r-[2px]" style={{ background: swatch }} />
        {MEASURE_LABEL.time}
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-1.5 w-3 rounded-r-[2px]" style={{ background: tint(swatch) }} />
        {MEASURE_LABEL[metric]}
      </span>
    </span>
  )
}

/** Je Projekt zwei Balken: Arbeitszeit (voll) und Token bzw. $ (aufgehellt), jede Reihe auf ihr eigenes Maximum skaliert. */
export function PairedBars({ groups, metric }: PairedBarsProps): React.JSX.Element {
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const rows = useRef<(HTMLLIElement | null)[]>([])
  const maxTime = Math.max(1, ...groups.map((g) => g.activeMs))
  const maxMetric = Math.max(Number.EPSILON, ...groups.map((g) => (metric === 'tokens' ? g.totalTokens : g.costUsd)))
  const active = hover !== null ? groups[hover] : undefined

  return (
    <div
      ref={ref}
      className="relative outline-none"
      tabIndex={0}
      role="group"
      aria-label={`Arbeitszeit und ${MEASURE_LABEL[metric]} je Projekt. Pfeiltasten wählen ein Projekt.`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') setHover((h) => Math.min((h ?? -1) + 1, groups.length - 1))
        if (e.key === 'ArrowUp') setHover((h) => Math.max((h ?? groups.length) - 1, 0))
        if (e.key === 'Escape') setHover(null)
      }}
      onBlur={() => setHover(null)}
      onMouseLeave={() => setHover(null)}
    >
      <ul className="space-y-1">
        {groups.map((g, i) => {
          const metricValue = metric === 'tokens' ? g.totalTokens : g.costUsd
          const dim = hover !== null && hover !== i
          return (
            <li
              key={g.key}
              ref={(el) => {
                rows.current[i] = el
              }}
              onMouseEnter={() => setHover(i)}
              className={`grid grid-cols-[minmax(0,12.5rem)_minmax(0,1fr)_6.5rem] items-center gap-x-5 rounded-md px-2 py-1.5 transition-[background-color,opacity] duration-150 ${hover === i ? 'bg-raised' : ''} ${dim ? 'opacity-55' : ''}`}
            >
              <span className="flex min-w-0 items-center gap-2 text-[0.8125rem] text-ink-2">
                <ProjectMark color={g.color} icon={g.icon} size="sm" />
                <span className={`truncate ${g.isProject ? 'text-ink' : ''}`}>{g.label}</span>
                {g.key === REST_KEY ? <span className="num shrink-0 text-2xs text-ink-3">{g.mergedCount}</span> : null}
              </span>
              <span className="space-y-[3px]">
                <Bar value={g.activeMs} max={maxTime} color={g.color} index={i} />
                <Bar value={metricValue} max={maxMetric} color={tint(g.color)} index={i} />
              </span>
              <span className="num flex flex-col items-end text-xs leading-[1.15rem]">
                <span className="font-[560] text-ink">{formatMeasure(g.activeMs, 'time')}</span>
                <span className="text-ink-3">{formatMeasure(metricValue, metric)}</span>
              </span>
            </li>
          )
        })}
      </ul>
      {active ? (
        <ChartTooltip x={Math.min(TOOLTIP_X_REM * REM_PX, width)} y={(hover !== null ? (rows.current[hover]?.offsetTop ?? 0) : 0) + TOOLTIP_Y_OFFSET} containerWidth={width}>
          <p className="mb-1.5 truncate font-[600] text-ink">{active.key === REST_KEY ? `Weitere (${active.mergedCount})` : active.label}</p>
          <TooltipRow label={MEASURE_LABEL.time} value={formatMeasure(active.activeMs, 'time')} />
          <TooltipRow label="Token" value={formatMeasure(active.totalTokens, 'tokens')} />
          <TooltipRow label="API-Gegenwert" value={formatUsd(active.costUsd)} />
          <div className="mt-1.5 border-t border-line pt-1.5">
            <TooltipRow label="Sessions" value={formatInteger(active.sessions)} />
            <TooltipRow label="Rechner" value={active.hosts.map((h) => hostLabel(h)).join(', ')} />
          </div>
        </ChartTooltip>
      ) : null}
    </div>
  )
}
