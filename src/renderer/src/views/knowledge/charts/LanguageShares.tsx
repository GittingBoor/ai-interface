import { useState } from 'react'
import { motion } from 'motion/react'
import { OTHER_LANGUAGE, type LanguageShare } from '@shared/knowledge'
import { formatInteger, formatPercentPoints, formatPercentPointsFine } from '@renderer/lib/format'
import { useT } from '@renderer/i18n/useT'
import { OTHER_COLOR, seriesColor } from '../knowledgePalette'

const PERCENT = 100
/** Unter einem Prozent zeigt die Legende eine Nachkommastelle, sonst stünde dort „0 %“. */
const FINE_BELOW = 0.95
const DIM = 0.3
const LEGEND_DIM = 0.55
const EASE = [0.16, 1, 0.3, 1] as const

interface Share {
  readonly name: string
  readonly lines: number
  readonly files: number
  readonly percent: number
  readonly color: string
}

function shares(languages: readonly LanguageShare[], otherName: string): Share[] {
  const total = languages.reduce((a, b) => a + b.lines, 0)
  const ranked = languages.filter((l) => l.name !== OTHER_LANGUAGE && l.lines > 0).sort((a, b) => b.lines - a.lines)
  const other = languages.find((l) => l.name === OTHER_LANGUAGE && l.lines > 0)
  const share = (l: LanguageShare, color: string, name: string = l.name): Share => ({ name, lines: l.lines, files: l.files, percent: total > 0 ? (l.lines / total) * PERCENT : 0, color })
  return [...ranked.map((l, i) => share(l, seriesColor(i))), ...(other ? [share(other, OTHER_COLOR, otherName)] : [])]
}

const formatShare = (percent: number): string => (percent < FINE_BELOW ? formatPercentPointsFine(percent) : formatPercentPoints(percent))

/** Sprachanteile als gestapelter Balken mit Legende; Überfahren hebt eine Sprache in beiden hervor. */
export function LanguageShares({ languages }: { readonly languages: readonly LanguageShare[] }): React.JSX.Element {
  const t = useT().knowledge
  const items = shares(languages, t.view.other)
  const [active, setActive] = useState<string | null>(null)
  const description = items.map((s) => `${s.name} ${formatShare(s.percent)}`).join(', ')
  return (
    <div>
      <div role="img" aria-label={t.view.languagesLabel(description)} className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
        {items.map((s, i) => (
          <motion.span
            key={s.name}
            onMouseEnter={() => setActive(s.name)}
            onMouseLeave={() => setActive(null)}
            className="h-full origin-left transition-opacity duration-150 first:rounded-l-full last:rounded-r-full"
            style={{ width: `${s.percent}%`, background: s.color, opacity: active === null || active === s.name ? 1 : DIM }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: i * 0.04, ease: EASE }}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-0.5 @lg:grid-cols-2">
        {items.map((s) => (
          <li
            key={s.name}
            onMouseEnter={() => setActive(s.name)}
            onMouseLeave={() => setActive(null)}
            className="grid grid-cols-[0.625rem_minmax(0,1fr)_auto_3.25rem] items-center gap-x-2.5 rounded-md px-1.5 py-1 text-[0.8125rem] transition-[background-color,opacity] duration-150 hover:bg-raised"
            style={{ opacity: active === null || active === s.name ? 1 : LEGEND_DIM }}
          >
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
            <span className="truncate text-ink-2">{s.name}</span>
            <span className="num text-2xs text-ink-3">{formatInteger(s.lines)}</span>
            <span className="num text-right font-[560] text-ink">{formatShare(s.percent)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
