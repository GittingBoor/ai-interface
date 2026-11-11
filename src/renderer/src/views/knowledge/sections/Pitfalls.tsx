import { TriangleAlert } from 'lucide-react'
import type { KnowledgePitfall, KnowledgeProject } from '@shared/knowledge'
import { FileLink } from '../KnowledgeLinks'
import { SectionFrame } from './SectionFrame'

interface PitfallsProps {
  readonly pitfalls: readonly KnowledgePitfall[]
  readonly project: KnowledgeProject
}

/** Was man wissen muss, um beim Arbeiten nichts kaputtzumachen. */
export function PitfallsSection({ pitfalls, project }: PitfallsProps): React.JSX.Element {
  return (
    <SectionFrame id="pitfalls">
      <ul className="grid gap-2.5 @3xl:grid-cols-2 @6xl:grid-cols-3">
        {pitfalls.map((p) => (
          <li key={p.title} className="flex gap-3 rounded-lg border border-warn/20 bg-warn-soft/40 px-3.5 py-3">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <p className="text-[0.8125rem] font-[620] text-ink">{p.title}</p>
              <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-2">{p.detail}</p>
              {p.where ? (
                <div className="mt-2">
                  <FileLink project={project} path={p.where} />
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </SectionFrame>
  )
}
