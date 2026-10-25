import type { ReactNode } from 'react'
import { motion } from 'motion/react'

export interface BarItem {
  readonly key: string
  readonly label: ReactNode
  readonly value: number
  readonly valueText: string
  readonly detail?: ReactNode
  /** Füllfarbe (CSS), z. B. Host-Farbe. */
  readonly color?: string
  readonly title?: string
}

/** Horizontale Balkenliste: Beschriftung, Wert rechts, dünner Balken darunter. */
export function BarList({ items, emptyText }: { readonly items: readonly BarItem[]; readonly emptyText: string }): React.JSX.Element {
  const max = Math.max(1, ...items.map((i) => i.value))
  if (!items.length) return <p className="py-4 text-[0.8125rem] text-ink-3">{emptyText}</p>
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={item.key} title={item.title}>
          <div className="flex items-baseline gap-3 text-[0.8125rem]">
            <span className="min-w-0 flex-1 truncate text-ink-2">{item.label}</span>
            {item.detail ? <span className="num shrink-0 text-xs text-ink-3">{item.detail}</span> : null}
            <span className="num w-[4.75rem] shrink-0 text-right font-[560] text-ink">{item.valueText}</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-raised">
            <motion.div
              className="h-full origin-left rounded-full"
              style={{ background: item.color ?? 'var(--color-ink-3)', width: `${Math.max(1.5, (item.value / max) * 100)}%` }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
