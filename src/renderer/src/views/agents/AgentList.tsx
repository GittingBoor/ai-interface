import { useMemo, type KeyboardEvent } from 'react'
import { FolderGit2, Puzzle, UserRound, Wand2, type LucideIcon } from 'lucide-react'
import { isProactive } from '@shared/agents'
import type { SkillEntry } from '@shared/types'
import { HostBadge } from '@renderer/components/Host'
import { groupAgents, modelLabel, type AgentGroup } from '@renderer/lib/agents'
import { useT } from '@renderer/i18n/useT'
import { useAgents } from '@renderer/stores/agentsStore'
import { AgentSigil, Chip } from './agentMarks'

const ROW_SELECTOR = '[data-agent-row]'

interface AgentListProps {
  readonly entries: readonly SkillEntry[]
  readonly summaries: Readonly<Record<string, string>>
  readonly selectedId: string | null
  readonly showHost: boolean
}

const groupIcon = (id: string): LucideIcon => (id.startsWith('project:') ? FolderGit2 : id.startsWith('plugin:') ? Puzzle : UserRound)

function moveFocus(e: KeyboardEvent<HTMLDivElement>): void {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
  const rows = [...e.currentTarget.querySelectorAll<HTMLButtonElement>(ROW_SELECTOR)]
  const index = rows.findIndex((r) => r === document.activeElement)
  if (index < 0) return
  e.preventDefault()
  const next = rows[Math.max(0, Math.min(rows.length - 1, index + (e.key === 'ArrowDown' ? 1 : -1)))]
  next?.focus()
  next?.click()
}

export function AgentList({ entries, ...rest }: AgentListProps): React.JSX.Element {
  const t = useT().agents
  const groups = useMemo(() => groupAgents(entries, t), [entries, t])
  return (
    <div className="space-y-6" onKeyDown={moveFocus}>
      {groups.map((g) => (
        <Group key={g.id} group={g} {...rest} />
      ))}
    </div>
  )
}

function Group({ group, ...rest }: Omit<AgentListProps, 'entries'> & { readonly group: AgentGroup }): React.JSX.Element {
  const Icon = groupIcon(group.id)
  return (
    <section aria-label={group.label}>
      <h2 className="flex items-baseline gap-2 border-t border-line pt-3.5 pb-2 pl-1.5">
        <Icon className="size-4 translate-y-[3px] self-start text-ink-3" aria-hidden strokeWidth={1.75} />
        <span className="text-[0.8125rem] font-[620] text-ink">{group.label}</span>
        <span className="num text-xs text-ink-3">{group.entries.length}</span>
        {group.hint ? <span className="text-xs text-ink-3">· {group.hint}</span> : null}
      </h2>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-1.5">
        {group.entries.map((e) => (
          <li key={e.id}>
            <Row entry={e} {...rest} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Row({ entry, summaries, selectedId, showHost }: Omit<AgentListProps, 'entries'> & { readonly entry: SkillEntry }): React.JSX.Element {
  const t = useT().agents
  const active = entry.id === selectedId
  const text = summaries[entry.hash] ?? entry.description
  const proactive = isProactive(entry.description)
  return (
    <button
      type="button"
      data-agent-row
      aria-pressed={active}
      onClick={() => useAgents.getState().select(entry.id)}
      className={`group flex h-full w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-[background-color,border-color] duration-150 ${
        active ? 'border-accent/45 bg-accent-soft/60' : 'border-transparent hover:border-line hover:bg-raised'
      }`}
    >
      <AgentSigil color={entry.color} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[0.8125rem] font-[620] text-ink">{entry.name}</span>
          {showHost ? <HostBadge host={entry.host} subtle /> : null}
        </span>
        <span className="line-clamp-2 text-xs leading-relaxed text-ink-3">{text || t.list.noDescription}</span>
        <span className="mt-0.5 flex flex-wrap gap-1">
          <Chip>{modelLabel(entry.model, t)}</Chip>
          <Chip tone={entry.tools.length ? 'plain' : 'muted'}>{entry.tools.length ? t.list.tools(entry.tools.length) : t.list.allTools}</Chip>
          {entry.skills.length ? <Chip>{t.list.skills(entry.skills.length)}</Chip> : null}
          {proactive ? (
            <Chip tone="accent" title={t.list.proactiveTitle}>
              <Wand2 className="size-3" aria-hidden strokeWidth={2} />
              {t.list.proactive}
            </Chip>
          ) : null}
        </span>
      </span>
    </button>
  )
}
