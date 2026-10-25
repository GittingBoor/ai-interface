import type { ReactNode } from 'react'
import { motion } from 'motion/react'

interface ChartTooltipProps {
  /** Position relativ zum Diagramm-Container. */
  readonly x: number
  readonly y: number
  readonly containerWidth: number
  readonly children: ReactNode
}

const TOOLTIP_WIDTH = 188
const OFFSET = 14

/** Schwebende Wertanzeige; klappt am rechten Rand nach links. */
export function ChartTooltip({ x, y, containerWidth, children }: ChartTooltipProps): React.JSX.Element {
  const flip = x + OFFSET + TOOLTIP_WIDTH > containerWidth
  const left = flip ? x - OFFSET - TOOLTIP_WIDTH : x + OFFSET
  return (
    <motion.div
      role="status"
      className="pointer-events-none absolute z-10 rounded-lg border border-line-strong/70 bg-raised-2/95 px-3 py-2.5 text-xs shadow-[0_10px_28px_-6px_oklch(0_0_0/0.65)]"
      style={{ width: TOOLTIP_WIDTH, top: Math.max(0, y) }}
      initial={false}
      animate={{ left }}
      transition={{ type: 'spring', stiffness: 700, damping: 45 }}
    >
      {children}
    </motion.div>
  )
}

export function TooltipRow({ label, value, swatch }: { readonly label: string; readonly value: string; readonly swatch?: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 py-0.5">
      {swatch ? <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ background: swatch }} /> : null}
      <span className="flex-1 text-ink-3">{label}</span>
      <span className="num font-[560] text-ink">{value}</span>
    </div>
  )
}
