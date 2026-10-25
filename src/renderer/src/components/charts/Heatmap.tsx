import { useMemo, useState } from 'react'
import { useElementSize } from '@renderer/lib/hooks'
import { ChartTooltip } from './ChartTooltip'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const
const WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] as const
const HOURS = 24
const LABEL_WIDTH = 28
const GAP = 3
const MAX_CELL = 19
const HOUR_LABELS = [0, 6, 12, 18]
/** Stufen der Einfärbung (sequenziell, ein Farbton). */
const LEVELS = [0.16, 0.34, 0.55, 0.78, 1] as const

const levelOf = (value: number, max: number): number => {
  if (value <= 0 || max <= 0) return -1
  const ratio = value / max
  return LEVELS.findIndex((l) => ratio <= l)
}

const fillFor = (level: number): string =>
  level < 0 ? 'var(--color-raised)' : `color-mix(in oklch, var(--color-accent) ${Math.round(14 + level * 17)}%, var(--color-raised))`

/** Ein Feld der Heatmap: Wert einer Kennzahl je Wochentag (0 = Montag) und Stunde. */
export interface HeatValue {
  readonly weekday: number
  readonly hour: number
  readonly value: number
}

interface HeatmapProps {
  readonly cells: readonly HeatValue[]
  /** Wert mit Einheit für den Tooltip, z. B. „1,2 Mio. Token“. */
  readonly format: (value: number) => string
}

/** Aktivität nach Wochentag × Stunde für eine Kennzahl. */
export function Heatmap({ cells, format }: HeatmapProps): React.JSX.Element {
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const [hover, setHover] = useState<HeatValue | null>(null)
  const grid = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of cells) map.set(`${c.weekday}-${c.hour}`, (map.get(`${c.weekday}-${c.hour}`) ?? 0) + c.value)
    return map
  }, [cells])
  const max = Math.max(0, ...grid.values())
  const cell = Math.max(8, Math.min(MAX_CELL, (width - LABEL_WIDTH - GAP * (HOURS - 1)) / HOURS))
  const height = WEEKDAYS.length * (cell + GAP) + 18
  const peak = cells.reduce<HeatValue | null>((best, c) => (!best || c.value > best.value ? c : best), null)

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label={peak ? `Aktivität je Wochentag und Stunde. Spitze: ${WEEKDAYS_LONG[peak.weekday]}, ${peak.hour} Uhr.` : 'Keine Aktivität'}>
          {WEEKDAYS.map((label, d) => (
            <text key={label} x={0} y={d * (cell + GAP) + cell / 2} dy="0.34em" className="fill-ink-3 text-[10.5px]">
              {label}
            </text>
          ))}
          {WEEKDAYS.map((_, d) =>
            Array.from({ length: HOURS }, (_, h) => {
              const value = grid.get(`${d}-${h}`) ?? 0
              const isHover = hover?.weekday === d && hover.hour === h
              return (
                <rect
                  key={`${d}-${h}`}
                  x={LABEL_WIDTH + h * (cell + GAP)}
                  y={d * (cell + GAP)}
                  width={cell}
                  height={cell}
                  rx={3}
                  fill={fillFor(levelOf(value, max))}
                  stroke={isHover ? 'var(--color-ink)' : 'none'}
                  strokeWidth={1.5}
                  onMouseEnter={() => setHover({ weekday: d, hour: h, value })}
                  className="transition-[fill] duration-300"
                />
              )
            })
          )}
          {HOUR_LABELS.map((h) => (
            <text key={h} x={LABEL_WIDTH + h * (cell + GAP)} y={WEEKDAYS.length * (cell + GAP) + 12} className="num fill-ink-3 text-[10.5px]">
              {String(h).padStart(2, '0')}
            </text>
          ))}
        </svg>
      ) : (
        <div style={{ height: 220 }} />
      )}
      <div className="mt-2 flex max-w-full items-center justify-between gap-4 text-2xs text-ink-3" style={{ width: LABEL_WIDTH + HOURS * (cell + GAP) - GAP }}>
        <span>{peak && peak.value > 0 ? `Meiste Aktivität: ${WEEKDAYS_LONG[peak.weekday]}, ${peak.hour}–${peak.hour + 1} Uhr` : 'Noch keine Aktivität'}</span>
        <span className="flex items-center gap-1.5" aria-hidden>
          wenig
          {[-1, 0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="size-2.5 rounded-[2px]" style={{ background: fillFor(l) }} />
          ))}
          viel
        </span>
      </div>
      {hover ? (
        <ChartTooltip x={LABEL_WIDTH + hover.hour * (cell + GAP) + cell / 2} y={hover.weekday * (cell + GAP) + cell + 6} containerWidth={width}>
          <p className="font-[600] text-ink">
            {WEEKDAYS_LONG[hover.weekday]}, {hover.hour}–{hover.hour + 1} Uhr
          </p>
          <p className="num mt-0.5 text-ink-2">{hover.value > 0 ? format(hover.value) : 'keine Aktivität'}</p>
        </ChartTooltip>
      ) : null}
    </div>
  )
}
