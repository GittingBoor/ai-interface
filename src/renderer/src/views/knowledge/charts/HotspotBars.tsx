import { motion } from 'motion/react'
import type { Hotspot } from '@shared/knowledge'
import { formatInteger } from '@renderer/lib/format'
import { useT } from '@renderer/i18n/useT'
import type { FileOpener } from '../KnowledgeLinks'

const PERCENT = 100
/** Wie heiß eine Datei wirkt: von Gelb (selten geändert) nach Rot (am häufigsten). */
const COOL = 'var(--color-warn)'
const HOT = 'var(--color-danger)'
const MIN_BAR = 2
const EASE = [0.16, 1, 0.3, 1] as const
const STAGGER_S = 0.035

const heat = (ratio: number): string => `color-mix(in oklch, ${HOT} ${Math.round(ratio * PERCENT)}%, ${COOL})`

function splitPath(path: string): { readonly dir: string; readonly name: string } {
  const cut = path.lastIndexOf('/')
  return cut < 0 ? { dir: '', name: path } : { dir: path.slice(0, cut + 1), name: path.slice(cut + 1) }
}

interface HotspotProps {
  readonly hotspots: readonly Hotspot[]
  readonly opener: FileOpener
}

/** Dateien, die am häufigsten geändert wurden; Klick öffnet die Datei. */
export function HotspotBars({ hotspots, opener }: HotspotProps): React.JSX.Element {
  const t = useT().knowledge
  const max = Math.max(1, ...hotspots.map((h) => h.changes))
  return (
    <ol className="space-y-0.5">
      {hotspots.map((h, i) => {
        const { dir, name } = splitPath(h.path)
        const ratio = h.changes / max
        return (
          <li key={h.path}>
            <button
              type="button"
              onClick={() => opener.open(h.path)}
              title={opener.title(h.path)}
              className="group block w-full rounded-md px-1.5 py-1.5 text-left transition-colors duration-150 hover:bg-raised"
            >
              <span className="flex items-baseline gap-3">
                <span className="min-w-0 flex-1 truncate font-mono text-xs">
                  <span className="text-ink-3">{dir}</span>
                  <span className="text-ink group-hover:text-accent-text">{name}</span>
                </span>
                <span className="num shrink-0 text-2xs text-ink-3">{t.view.linesValue(formatInteger(h.lines))}</span>
                <span className="num w-10 shrink-0 text-right text-xs font-[600] text-ink">{formatInteger(h.changes)}×</span>
              </span>
              <span className="mt-1 block h-1 overflow-hidden rounded-full bg-raised group-hover:bg-raised-2">
                <motion.span
                  className="block h-full origin-left rounded-full"
                  style={{ width: `${Math.max(MIN_BAR, ratio * PERCENT)}%`, background: heat(ratio) }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.55, delay: i * STAGGER_S, ease: EASE }}
                />
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
