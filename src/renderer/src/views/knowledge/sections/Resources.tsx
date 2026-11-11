import { ArrowUpRight } from 'lucide-react'
import type { KnowledgeResource } from '@shared/knowledge'
import { useT } from '@renderer/i18n/useT'
import { SectionFrame } from './SectionFrame'

const WWW = /^www\./

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(WWW, '')
  } catch {
    return url
  }
}

/** Offizielle Dokumentation und gute Erklärungen zu den Themen des Projekts. */
export function ResourcesSection({ resources }: { readonly resources: readonly KnowledgeResource[] }): React.JSX.Element {
  const t = useT().knowledge
  return (
    <SectionFrame id="resources">
      <ul className="grid gap-2 @3xl:grid-cols-2 @6xl:grid-cols-3">
        {resources.map((r) => (
          <li key={r.url}>
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              title={t.view.openLink(r.title)}
              className="group flex h-full flex-col rounded-lg border border-line px-3.5 py-3 transition-colors duration-150 hover:border-line-strong hover:bg-raised"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="text-[0.8125rem] font-[620] text-ink group-hover:text-accent-text">{r.title}</span>
                <ArrowUpRight aria-hidden className="size-3.5 shrink-0 text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-text" strokeWidth={1.75} />
              </span>
              <span className="mt-0.5 font-mono text-2xs text-ink-3">{domainOf(r.url)}</span>
              <span className="mt-1.5 text-[0.8125rem] leading-snug text-ink-2">{r.about}</span>
            </a>
          </li>
        ))}
      </ul>
    </SectionFrame>
  )
}
