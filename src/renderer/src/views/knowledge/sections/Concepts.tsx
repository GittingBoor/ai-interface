import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import type { KnowledgeConcept, KnowledgeProject } from '@shared/knowledge'
import { useT } from '@renderer/i18n/useT'
import { ExternalChip, FileLink } from '../KnowledgeLinks'
import { SectionFrame } from './SectionFrame'

const EASE = [0.16, 1, 0.3, 1] as const

function Explanation({ text }: { readonly text: string }): React.JSX.Element {
  return <p className="text-[0.8125rem] leading-relaxed text-ink-2 [text-wrap:pretty]">{text}</p>
}

interface ConceptProps {
  readonly concept: KnowledgeConcept
  readonly project: KnowledgeProject
}

function ConceptCard({ concept, project }: ConceptProps): React.JSX.Element {
  const t = useT().knowledge
  const [open, setOpen] = useState(false)
  const panelId = `concept-${useId().replace(/:/g, '')}`
  const links = concept.links ?? []
  const files = concept.files ?? []
  return (
    <li className="flex flex-col rounded-lg border border-line bg-base px-3.5 py-3">
      <p className="text-[0.875rem] font-[620] text-ink">{concept.term}</p>
      {concept.short ? (
        <>
          <p className="mt-1 text-[0.8125rem] leading-snug text-ink-2">{concept.short}</p>
          <AnimatePresence initial={false}>
            {open ? (
              <motion.div id={panelId} key="more" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: EASE }} className="overflow-hidden">
                <div className="mt-2.5 border-t border-line pt-2.5">
                  <Explanation text={concept.explanation} />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      ) : (
        <div className="mt-1">
          <Explanation text={concept.explanation} />
        </div>
      )}
      {links.length || files.length || concept.short ? (
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          {concept.short ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={open ? panelId : undefined}
              onClick={() => setOpen((v) => !v)}
              className="mr-1 inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-2xs font-[560] text-accent-text transition-colors duration-150 hover:bg-accent-soft"
            >
              <ChevronDown aria-hidden className={`size-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} strokeWidth={2} />
              {t.view.explanation}
            </button>
          ) : null}
          {links.map((l) => (
            <ExternalChip key={l.url} href={l.url} label={l.title} title={t.view.openLink(l.title)} />
          ))}
          {files.map((f) => (
            <FileLink key={f} project={project} path={f} />
          ))}
        </div>
      ) : null}
    </li>
  )
}

interface ConceptsProps {
  readonly concepts: readonly KnowledgeConcept[]
  readonly project: KnowledgeProject
}

/** Begriffe und Technik zum Überfliegen; die ausführliche Erklärung klappt bei Bedarf auf. */
export function ConceptsSection({ concepts, project }: ConceptsProps): React.JSX.Element {
  return (
    <SectionFrame id="concepts">
      <ul className="grid items-start gap-2.5 @3xl:grid-cols-2 @6xl:grid-cols-3">
        {concepts.map((c) => (
          <ConceptCard key={c.term} concept={c} project={project} />
        ))}
      </ul>
    </SectionFrame>
  )
}
