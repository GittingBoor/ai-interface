import { CircleDashed } from 'lucide-react'
import type { KnowledgeEvent, KnowledgeProject } from '@shared/knowledge'
import { formatDateMedium, parseDay } from '@renderer/lib/format'
import { useT } from '@renderer/i18n/useT'
import { KnowledgeLinkChip } from '../KnowledgeLinks'
import { SectionFrame } from './SectionFrame'

const newestFirst = (a: KnowledgeEvent, b: KnowledgeEvent): number => b.date.localeCompare(a.date)

interface HistoryProps {
  readonly events: readonly KnowledgeEvent[]
  readonly project: KnowledgeProject
}

/** Meilensteine, neueste zuerst; eine Zeile je Ereignis, Belege als Chips. */
export function HistorySection({ events, project }: HistoryProps): React.JSX.Element {
  return (
    <SectionFrame id="history">
      <ol className="relative before:absolute before:top-2 before:bottom-2 before:left-[0.3125rem] before:w-px before:bg-line-strong/70">
        {[...events].sort(newestFirst).map((e, i) => (
          <li key={`${e.date}-${i}`} className="relative grid grid-cols-[0.75rem_minmax(0,1fr)] gap-x-3 py-1.5">
            <span aria-hidden className={`mt-1.5 size-2.5 rounded-full border-2 border-canvas ${i === 0 ? 'bg-accent' : 'bg-line-strong'}`} />
            <div className="grid min-w-0 gap-x-4 gap-y-1 @3xl:grid-cols-[6.5rem_minmax(0,1fr)_auto]">
              <time dateTime={e.date} className="num pt-px text-xs text-ink-3">
                {formatDateMedium(parseDay(e.date).getTime())}
              </time>
              <p className="min-w-0 text-[0.8125rem] leading-snug">
                <span className="font-[600] text-ink">{e.title}</span>
                {e.detail ? <span className="text-ink-3"> · {e.detail}</span> : null}
              </p>
              {e.links.length ? (
                <div className="flex flex-wrap gap-1.5 @3xl:justify-end">
                  {e.links.map((l) => (
                    <KnowledgeLinkChip key={`${l.kind}-${l.ref}`} link={l} project={project} />
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </SectionFrame>
  )
}

/** Was der Agent nicht klären konnte; bewusst klein am Ende. */
export function GapsSection({ gaps }: { readonly gaps: readonly string[] }): React.JSX.Element {
  const t = useT().knowledge
  return (
    <SectionFrame id="gaps" description={t.view.gapsHint}>
      <ul className="grid gap-x-8 gap-y-1.5 @3xl:grid-cols-2">
        {gaps.map((g) => (
          <li key={g} className="flex gap-2 text-xs leading-relaxed text-ink-3">
            <CircleDashed aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
            {g}
          </li>
        ))}
      </ul>
    </SectionFrame>
  )
}
