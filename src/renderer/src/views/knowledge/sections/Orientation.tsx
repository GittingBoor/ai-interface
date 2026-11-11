import { Check, Copy, FileCode2 } from 'lucide-react'
import type { KnowledgeCommand, KnowledgeEntryPoint, KnowledgeOrientation, KnowledgeProject } from '@shared/knowledge'
import { useT } from '@renderer/i18n/useT'
import { useCopy, useFileOpener } from '../KnowledgeLinks'
import { ChartBlock, SectionFrame } from './SectionFrame'

function CommandRow({ command }: { readonly command: KnowledgeCommand }): React.JSX.Element {
  const { copied, copy } = useCopy()
  const t = useT().knowledge
  const Icon = copied ? Check : Copy
  return (
    <li>
      <button
        type="button"
        onClick={() => copy(command.command)}
        title={copied ? t.copied : t.view.copyCommand(command.command)}
        className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg border border-line bg-base px-3 py-2 text-left transition-colors duration-150 hover:border-line-strong hover:bg-raised"
      >
        <span className="min-w-0">
          <span className="block text-2xs text-ink-3">{command.label}</span>
          <code className="mt-0.5 block truncate font-mono text-xs text-ink">
            <span aria-hidden className="mr-1.5 text-accent-text select-none">$</span>
            {command.command}
          </code>
        </span>
        <Icon aria-hidden className={`size-3.5 ${copied ? 'text-status-idle' : 'text-ink-3 group-hover:text-ink-2'}`} strokeWidth={1.75} />
      </button>
      <span role="status" className="sr-only">
        {copied ? t.copied : ''}
      </span>
    </li>
  )
}

interface ReadFirstProps {
  readonly entries: readonly KnowledgeEntryPoint[]
  readonly project: KnowledgeProject
}

function ReadFirst({ entries, project }: ReadFirstProps): React.JSX.Element {
  const opener = useFileOpener(project)
  return (
    <ol className="space-y-1">
      {entries.map((e, i) => (
        <li key={e.path}>
          <button
            type="button"
            onClick={() => opener.open(e.path)}
            title={opener.title(e.path)}
            className="group grid w-full grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2.5 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 hover:bg-raised"
          >
            <span className="num mt-0.5 grid size-5 place-items-center rounded-full bg-raised-2 text-2xs font-[620] text-ink-2 group-hover:bg-accent group-hover:text-accent-ink">{i + 1}</span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-mono text-xs text-ink">
                <FileCode2 aria-hidden className="size-3 shrink-0 text-ink-3" strokeWidth={1.75} />
                <span className="truncate">{e.path}</span>
              </span>
              <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-3">{e.why}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}

interface OrientationProps {
  readonly orientation: KnowledgeOrientation
  readonly project: KnowledgeProject
}

/** Einstieg für übernommene Projekte: wie man es startet und welche Dateien man zuerst liest. */
export function OrientationSection({ orientation, project }: OrientationProps): React.JSX.Element {
  const t = useT().knowledge
  const { start, readFirst } = orientation
  return (
    <SectionFrame id="orientation">
      <div className="grid gap-x-10 gap-y-6 @4xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {start.length ? (
          <ChartBlock title={t.view.start}>
            <ul className="grid gap-1.5 @md:grid-cols-2">
              {start.map((c) => (
                <CommandRow key={`${c.label}-${c.command}`} command={c} />
              ))}
            </ul>
          </ChartBlock>
        ) : null}
        {readFirst.length ? (
          <ChartBlock title={t.view.readFirst}>
            <ReadFirst entries={readFirst} project={project} />
          </ChartBlock>
        ) : null}
      </div>
    </SectionFrame>
  )
}
