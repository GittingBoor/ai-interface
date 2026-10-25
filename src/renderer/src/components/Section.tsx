import type { ReactNode } from 'react'

interface SectionProps {
  readonly title: string
  readonly description?: ReactNode
  readonly actions?: ReactNode
  readonly children: ReactNode
  readonly className?: string
  readonly id?: string
}

/** Inhaltsbereich mit Haarlinie oben statt schwebender Karte. */
export function Section({ title, description, actions, children, className = '', id }: SectionProps): React.JSX.Element {
  const headingId = id ? `${id}-title` : undefined
  return (
    <section aria-labelledby={headingId} className={`min-w-0 border-t border-line pt-4 ${className}`}>
      <header className="mb-4 flex min-h-7 flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-48 flex-1">
          <h2 id={headingId} className="text-[0.8125rem] font-[620] tracking-[0.005em] text-ink">
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-xs text-ink-3">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
      </header>
      {children}
    </section>
  )
}

interface ViewHeaderProps {
  readonly title: string
  readonly children?: ReactNode
  readonly actions?: ReactNode
}

export function ViewHeader({ title, children, actions }: ViewHeaderProps): React.JSX.Element {
  return (
    <header className="flex min-h-[4.25rem] shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 px-8 pt-5 pb-4">
      <div className="min-w-48 flex-1">
        <h1 className="text-[1.375rem] leading-tight font-[640] tracking-[-0.012em] text-ink [font-stretch:108%]">{title}</h1>
        {children ? <div className="mt-1 text-[0.8125rem] text-ink-3">{children}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}
