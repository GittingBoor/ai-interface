import type { ReactNode } from 'react'
import { Section } from '@renderer/components/Section'
import { useT } from '@renderer/i18n/useT'
import { sectionAnchor, type KnowledgeSectionId } from '../knowledgeSections'

interface FrameProps {
  readonly id: KnowledgeSectionId
  readonly description?: ReactNode
  readonly actions?: ReactNode
  readonly children: ReactNode
}

/** Abschnitt mit Sprungmarke für das Inhaltsverzeichnis. */
export function SectionFrame({ id, description, actions, children }: FrameProps): React.JSX.Element {
  const t = useT().knowledge
  return (
    <div id={sectionAnchor(id)} data-knowledge-section={id} className="scroll-mt-6">
      <Section title={t.view.section[id]} id={sectionAnchor(id)} description={description} actions={actions}>
        {children}
      </Section>
    </div>
  )
}

interface BlockProps {
  readonly title: string
  readonly hint?: string
  readonly children: ReactNode
  readonly className?: string
}

/** Teil eines Abschnitts mit eigener Überschrift; misst seine eigene Breite für Container-Abfragen. */
export function ChartBlock({ title, hint, children, className = '' }: BlockProps): React.JSX.Element {
  return (
    <div className={`@container min-w-0 ${className}`}>
      <h3 className="mb-3 flex flex-wrap items-baseline gap-x-2 text-xs font-[600] text-ink-2">
        {title}
        {hint ? <span className="font-normal text-ink-3">{hint}</span> : null}
      </h3>
      {children}
    </div>
  )
}
