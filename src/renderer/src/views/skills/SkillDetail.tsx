import { useMemo } from 'react'
import { FolderOpen, Sparkles, WandSparkles } from 'lucide-react'
import type { SkillEntry, SkillRelation, SkillRelationKind } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt } from '@renderer/api/call'
import { Button, IconButton } from '@renderer/components/Button'
import { HostBadge } from '@renderer/components/Host'
import { useT } from '@renderer/i18n/useT'
import type { Messages } from '@shared/i18n/messages'
import { AI_LABEL, relationsFor, type RelationDirection, type RelationItem } from '@renderer/lib/skills'
import { useSkills } from '@renderer/stores/skillsStore'
import { useAgents } from '@renderer/stores/agentsStore'
import { useNav } from '@renderer/stores/navStore'
import { EntryTags, KindIcon } from './skillMarks'

/** Reihenfolge der Beziehungsgruppen im Detail. */
const RELATION_ORDER: readonly (readonly [SkillRelationKind, RelationDirection])[] = [
  ['contains', 'in'],
  ['uses-skill', 'out'],
  ['mentions', 'out'],
  ['uses-skill', 'in'],
  ['mentions', 'in'],
  ['uses-tool', 'out']
]

function originText(entry: SkillEntry, t: Messages['skills']): string {
  if (entry.scope === 'plugin' && entry.plugin) return t.pluginOrigin(entry.plugin)
  if (entry.scope === 'project' && entry.project) return t.projectOrigin(entry.project)
  return t.scope[entry.scope]
}

interface SkillDetailProps {
  readonly entry: SkillEntry
  readonly relations: readonly SkillRelation[]
  readonly byId: ReadonlyMap<string, SkillEntry>
}

export function SkillDetail({ entry, relations, byId }: SkillDetailProps): React.JSX.Element {
  const t = useT().skills
  const summary = useSkills((s) => s.summaries[entry.hash])
  const busy = useSkills((s) => s.progress !== null)
  const summarize = useSkills((s) => s.summarize)
  const selectSkill = useSkills((s) => s.select)
  /** Agents öffnen sich im eigenen Bereich. */
  const select = (id: string): void => {
    if (byId.get(id)?.kind !== 'agent') return selectSkill(id)
    useAgents.getState().select(id)
    useNav.getState().go('agents')
  }
  const items = useMemo(() => relationsFor(entry, relations, byId), [entry, relations, byId])
  const toolCount = items.filter((i) => i.kind === 'uses-tool').length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-raised text-accent">
            <KindIcon kind={entry.kind} className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <h2 className="truncate text-[1.0625rem] font-[640] tracking-[-0.01em] text-ink">{entry.name}</h2>
              <EntryTags entry={entry} />
            </div>
            <p className="text-xs text-ink-3">
              {t.kindSingular[entry.kind]} · {originText(entry, t)}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          <HostBadge host={entry.host} />
          <p className="min-w-0 flex-1 truncate font-mono text-2xs text-ink-3" title={entry.path}>
            {entry.path}
          </p>
          {entry.host === 'local' ? <IconButton size="sm" icon={FolderOpen} label={t.showInFolder} onClick={() => void attempt(api.app.showInFolder(entry.path))} /> : null}
        </div>
      </div>

      <dl className="grid grid-cols-3 border-y border-line py-3.5 text-xs">
        <div>
          <dt className="text-ink-3">{t.factAi}</dt>
          <dd className="mt-1 text-[0.8125rem] font-[600] text-ink">{AI_LABEL[entry.ai]}</dd>
        </div>
        <div>
          <dt className="text-ink-3">{t.factModel}</dt>
          <dd className="mt-1 truncate text-[0.8125rem] font-[600] text-ink" title={entry.model ?? undefined}>
            {entry.model ?? <span className="font-[500] text-ink-3">{t.factModelDefault}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-ink-3">{t.factOrigin}</dt>
          <dd className="mt-1 truncate text-[0.8125rem] font-[600] text-ink" title={originText(entry, t)}>
            {entry.plugin ?? entry.project ?? t.scope[entry.scope]}
          </dd>
        </div>
      </dl>

      <section aria-label={t.summaryTitle}>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-[600] text-ink-2">
          <Sparkles className="size-3.5 text-accent" aria-hidden strokeWidth={1.75} />
          {t.summaryTitle}
        </h3>
        {summary ? (
          <p className="text-[0.8125rem] leading-relaxed text-ink">{summary}</p>
        ) : (
          <div className="flex flex-col items-start gap-2.5 rounded-lg border border-dashed border-line-strong px-3.5 py-3">
            <p className="text-xs leading-relaxed text-ink-3">{t.summaryNone}</p>
            <Button size="sm" variant="soft" icon={WandSparkles} disabled={busy} onClick={() => void summarize([entry.id])}>
              {t.summaryCreate}
            </Button>
          </div>
        )}
      </section>

      <section aria-label={t.descriptionTitle}>
        <h3 className="mb-2 text-xs font-[600] text-ink-2">{t.descriptionTitle}</h3>
        {entry.description ? (
          <p className="text-[0.8125rem] leading-relaxed text-ink-2">{entry.description}</p>
        ) : (
          <p className="text-xs text-ink-3">{t.descriptionNone}</p>
        )}
      </section>

      {entry.kind === 'agent' || entry.tools.length > 0 ? (
        <section aria-label={t.toolsTitle}>
          <h3 className="mb-2 flex items-baseline gap-1.5 text-xs font-[600] text-ink-2">
            {t.toolsTitle}
            {entry.tools.length ? <span className="num font-[500] text-ink-3">{entry.tools.length}</span> : null}
          </h3>
          {entry.tools.length ? (
            <ul className="flex flex-wrap gap-1">
              {entry.tools.map((tool) => (
                <li key={tool} className="inline-flex h-6 max-w-full items-center truncate rounded-full border border-line bg-canvas px-2 font-mono text-2xs text-ink-2">
                  {tool}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-3">{t.toolsInherit}</p>
          )}
        </section>
      ) : null}

      <Relations items={items.filter((i) => i.kind !== 'uses-tool')} toolCount={toolCount} onSelect={select} />

      {entry.bodyExcerpt ? (
        <section aria-label={t.bodyStart}>
          <h3 className="mb-2 text-xs font-[600] text-ink-2">{t.bodyStart}</h3>
          <pre className="max-h-72 overflow-auto rounded-md border border-line bg-canvas px-3 py-2.5 font-mono text-2xs leading-relaxed whitespace-pre-wrap text-ink-3">
            {entry.bodyExcerpt}
          </pre>
        </section>
      ) : null}
    </div>
  )
}

interface RelationsProps {
  readonly items: readonly RelationItem[]
  readonly toolCount: number
  onSelect(id: string): void
}

function Relations({ items, toolCount, onSelect }: RelationsProps): React.JSX.Element {
  const t = useT().skills
  const groups = RELATION_ORDER.map(([kind, direction]) => ({ kind, direction, items: items.filter((i) => i.kind === kind && i.direction === direction) })).filter((g) => g.items.length)
  return (
    <section aria-label={t.relationsTitle}>
      <h3 className="mb-2 text-xs font-[600] text-ink-2">{t.relationsTitle}</h3>
      {groups.length === 0 ? (
        <p className="text-xs text-ink-3">{toolCount ? t.relationsOnlyTools : t.relationsNone}</p>
      ) : (
        <dl className="divide-y divide-line">
          {groups.map((g) => (
            <div key={`${g.kind}-${g.direction}`} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2">
              <dt className="pt-0.5 text-xs text-ink-3">{t.relation[g.kind][g.direction]}</dt>
              <dd className="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
                {g.items.map((item) =>
                  item.entry ? (
                    <button
                      key={item.entry.id}
                      type="button"
                      onClick={() => item.entry && onSelect(item.entry.id)}
                      className="inline-flex min-w-0 items-center gap-1.5 text-[0.8125rem] font-[540] text-ink hover:text-accent-text hover:underline hover:decoration-accent/50 hover:underline-offset-4"
                    >
                      <KindIcon kind={item.entry.kind} className="size-3.5 text-ink-3" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  ) : (
                    <span key={item.label} className="truncate text-[0.8125rem] text-ink-2">
                      {item.label}
                    </span>
                  )
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
