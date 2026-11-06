import type { ReactNode } from 'react'
import { Bot } from 'lucide-react'
import { agentColor } from '@renderer/lib/agents'

const SIGIL_SIZE = {
  sm: { box: 'size-7 rounded-md', icon: 'size-3.5' },
  md: { box: 'size-9 rounded-lg', icon: 'size-4.5' },
  lg: { box: 'size-12 rounded-xl', icon: 'size-6' }
} as const

/** Tönung der Kachel. Gemischt wird mit `transparent`, damit der Farbton erhalten bleibt (eine Mischung mit dem fast
 * unbunten Hintergrund dreht den Farbton in oklch Richtung Orange, und alle Kacheln sähen gleich aus). */
const SIGIL_FILL_PERCENT = 16
const SIGIL_BORDER_PERCENT = 38

/** Erkennungszeichen eines Agents: seine Farbe aus dem Frontmatter als getönte Kachel. */
export function AgentSigil({ color, size = 'md' }: { readonly color: string | null; readonly size?: keyof typeof SIGIL_SIZE }): React.JSX.Element {
  const hex = agentColor(color)
  const s = SIGIL_SIZE[size]
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center border ${s.box}`}
      style={{
        color: hex,
        background: `color-mix(in oklch, ${hex} ${SIGIL_FILL_PERCENT}%, transparent)`,
        borderColor: `color-mix(in oklch, ${hex} ${SIGIL_BORDER_PERCENT}%, transparent)`
      }}
    >
      <Bot className={s.icon} strokeWidth={1.75} />
    </span>
  )
}

/** Kleines Merkmal in Listen (Modell, Toolzahl, „von selbst“). */
export function Chip({ children, tone = 'plain', title }: { readonly children: ReactNode; readonly tone?: 'plain' | 'accent' | 'muted'; readonly title?: string }): React.JSX.Element {
  const toneClass =
    tone === 'accent' ? 'border-accent/30 bg-accent-soft text-accent-text' : tone === 'muted' ? 'border-dashed border-line-strong text-ink-3' : 'border-line bg-canvas text-ink-2'
  return (
    <span title={title} className={`inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-2 text-2xs font-[540] ${toneClass}`}>
      {children}
    </span>
  )
}

/** Überschrift eines Detail-Abschnitts. */
export function DetailHeading({ children, count }: { readonly children: ReactNode; readonly count?: number }): React.JSX.Element {
  return (
    <h3 className="mb-2.5 flex items-baseline gap-1.5 text-xs font-[620] text-ink-2">
      {children}
      {count !== undefined ? <span className="num font-[500] text-ink-3">{count}</span> : null}
    </h3>
  )
}
