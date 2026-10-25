import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import type { DailyUsage, HostId } from '@shared/types'
import { useElementSize } from '@renderer/lib/hooks'
import { hostColor, hostLabel, useHostIds } from '@renderer/lib/hosts'
import { formatDayLong, formatDayShort, formatTokens, formatUsd, parseDay } from '@renderer/lib/format'
import { ChartTooltip, TooltipRow } from './ChartTooltip'
import { niceTicks, roundedTopPath } from './geometry'

interface DayColumn {
  readonly day: string
  readonly values: Readonly<Record<HostId, number>>
  readonly total: number
  readonly cost: number
}

const PLOT_HEIGHT = 196
const AXIS_BAND = 26
const Y_LABEL_WIDTH = 52
const MAX_BAR = 24
const GAP = 2
const LABEL_EVERY_DAYS = 7

function toColumns(daily: readonly DailyUsage[]): DayColumn[] {
  const byDay = new Map<string, { values: Record<HostId, number>; total: number; cost: number }>()
  for (const row of daily) {
    const entry = byDay.get(row.day) ?? { values: {}, total: 0, cost: 0 }
    entry.values[row.host] = (entry.values[row.host] ?? 0) + row.totalTokens
    entry.total += row.totalTokens
    entry.cost += row.costUsd
    byDay.set(row.day, entry)
  }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v }))
}

/** Eingeschaltete Rechner plus Rechner, die in den Daten vorkommen (auch entfernte Geräte). */
function useChartHosts(daily: readonly DailyUsage[]): HostId[] {
  const enabled = useHostIds()
  return useMemo(() => [...new Set([...enabled, ...daily.map((d) => d.host)])], [enabled, daily])
}

const valueOf = (column: DayColumn, host: HostId): number => column.values[host] ?? 0

/** Tagesverbrauch der letzten 30 Tage, gestapelt nach Rechner. */
export function DailyChart({ daily }: { readonly daily: readonly DailyUsage[] }): React.JSX.Element {
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const columns = useMemo(() => toColumns(daily), [daily])
  const hosts = useChartHosts(daily)
  const max = Math.max(1, ...columns.map((c) => c.total))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1] ?? max
  const plotWidth = Math.max(0, width - Y_LABEL_WIDTH)
  const slot = columns.length ? plotWidth / columns.length : 0
  const bar = Math.max(2, Math.min(MAX_BAR, slot - Math.max(GAP, slot * 0.3)))
  const y = (v: number): number => PLOT_HEIGHT - (v / top) * PLOT_HEIGHT
  const active = hover !== null ? columns[hover] : undefined

  return (
    <div
      ref={ref}
      className="relative outline-none"
      tabIndex={0}
      role="group"
      aria-label="Tagesverbrauch der letzten 30 Tage. Pfeiltasten wählen einen Tag."
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') setHover((h) => Math.min((h ?? -1) + 1, columns.length - 1))
        if (e.key === 'ArrowLeft') setHover((h) => Math.max((h ?? columns.length) - 1, 0))
        if (e.key === 'Escape') setHover(null)
      }}
      onBlur={() => setHover(null)}
    >
      {width > 0 ? (
        <svg width={width} height={PLOT_HEIGHT + AXIS_BAND} className="block overflow-visible" onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={Y_LABEL_WIDTH} x2={width} y1={y(t) + 0.5} y2={y(t) + 0.5} stroke="var(--color-line)" strokeWidth={1} />
              <text x={Y_LABEL_WIDTH - 10} y={y(t)} dy="0.32em" textAnchor="end" className="num fill-ink-3 text-[10.5px]">
                {t === 0 ? '0' : formatTokens(t)}
              </text>
            </g>
          ))}
          {columns.map((c, i) => {
            const x = Y_LABEL_WIDTH + i * slot + (slot - bar) / 2
            let base = PLOT_HEIGHT
            const stack = hosts.filter((h) => valueOf(c, h) > 0)
            const dim = hover !== null && hover !== i
            return (
              <g key={c.day}>
                <motion.g
                  style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1, opacity: dim ? 0.45 : 1 }}
                  transition={{ scaleY: { duration: 0.55, delay: i * 0.012, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.12 } }}
                >
                  {stack.map((h, si) => {
                    const height = (valueOf(c, h) / top) * PLOT_HEIGHT - (si > 0 ? GAP : 0)
                    const yTop = base - (valueOf(c, h) / top) * PLOT_HEIGHT
                    const d = roundedTopPath(x, yTop, bar, Math.max(0, height), si === stack.length - 1 ? 4 : 0)
                    base = yTop
                    return <path key={h} d={d} fill={hostColor(h)} />
                  })}
                </motion.g>
                {(columns.length - 1 - i) % LABEL_EVERY_DAYS === 0 ? (
                  <text x={x + bar / 2} y={PLOT_HEIGHT + 17} textAnchor="middle" className="num fill-ink-3 text-[10.5px]">
                    {i === columns.length - 1 ? 'heute' : formatDayShort(c.day)}
                  </text>
                ) : null}
                <rect
                  x={Y_LABEL_WIDTH + i * slot}
                  y={0}
                  width={slot}
                  height={PLOT_HEIGHT}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                />
              </g>
            )
          })}
          <line x1={Y_LABEL_WIDTH} x2={width} y1={PLOT_HEIGHT + 0.5} y2={PLOT_HEIGHT + 0.5} stroke="var(--color-line-strong)" strokeWidth={1} />
        </svg>
      ) : (
        <div style={{ height: PLOT_HEIGHT + AXIS_BAND }} />
      )}
      {active && hover !== null ? (
        <ChartTooltip x={Y_LABEL_WIDTH + hover * slot + slot / 2} y={8} containerWidth={width}>
          <p className="mb-1.5 font-[600] text-ink">{isToday(active.day) ? 'Heute' : formatDayLong(active.day)}</p>
          {hosts.map((h) => (
            <TooltipRow key={h} label={hostLabel(h)} value={formatTokens(valueOf(active, h))} swatch={hostColor(h)} />
          ))}
          <div className="mt-1.5 border-t border-line pt-1.5">
            <TooltipRow label="Gesamt" value={formatTokens(active.total)} />
            <TooltipRow label="API-Gegenwert" value={formatUsd(active.cost)} />
          </div>
        </ChartTooltip>
      ) : null}
    </div>
  )
}

function isToday(day: string): boolean {
  const d = parseDay(day)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

/** Tabellenansicht als zugängliche Alternative zum Diagramm. */
export function DailyTable({ daily }: { readonly daily: readonly DailyUsage[] }): React.JSX.Element {
  const columns = useMemo(() => toColumns(daily).reverse(), [daily])
  const hosts = useChartHosts(daily)
  return (
    <div className="max-h-[222px] overflow-y-auto">
      <table className="num w-full text-xs">
        <thead className="sticky top-0 bg-base text-ink-3">
          <tr>
            <th className="py-1.5 text-left font-[560]">Tag</th>
            {hosts.map((h) => (
              <th key={h} className="py-1.5 text-right font-[560]">
                {hostLabel(h)}
              </th>
            ))}
            <th className="py-1.5 text-right font-[560]">Gesamt</th>
            <th className="py-1.5 text-right font-[560]">USD</th>
          </tr>
        </thead>
        <tbody className="text-ink-2">
          {columns.map((c) => (
            <tr key={c.day} className="border-t border-line">
              <td className="py-1.5">{formatDayShort(c.day)}</td>
              {hosts.map((h) => (
                <td key={h} className="py-1.5 text-right">
                  {formatTokens(valueOf(c, h))}
                </td>
              ))}
              <td className="py-1.5 text-right text-ink">{formatTokens(c.total)}</td>
              <td className="py-1.5 text-right">{formatUsd(c.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
