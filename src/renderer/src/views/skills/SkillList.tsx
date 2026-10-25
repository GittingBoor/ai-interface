import { useMemo, type KeyboardEvent } from 'react'
import type { SkillEntry } from '@shared/types'
import { HostBadge } from '@renderer/components/Host'
import { groupEntries, SCOPE_LABEL, type SkillGroup, type SkillSubgroup } from '@renderer/lib/skills'
import { EntryTags, KindIcon, SCOPE_ICON } from './skillMarks'

const ROW_SELECTOR = '[data-skill-row]'

interface SkillListProps {
  readonly entries: readonly SkillEntry[]
  readonly summaries: Readonly<Record<string, string>>
  readonly selectedId: string | null
  /** Rechner-Kennzeichen nur, wenn mehrere Rechner gezeigt werden. */
  readonly showHost: boolean
  onSelect(id: string): void
}

/** Pfeiltasten springen zwischen den Zeilen der ganzen Liste. */
function moveFocus(e: KeyboardEvent<HTMLDivElement>): void {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
  const rows = [...e.currentTarget.querySelectorAll<HTMLButtonElement>(ROW_SELECTOR)]
  const index = rows.findIndex((r) => r === document.activeElement)
  if (index < 0) return
  e.preventDefault()
  rows[Math.max(0, Math.min(rows.length - 1, index + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus()
}

export function SkillList({ entries, summaries, selectedId, showHost, onSelect }: SkillListProps): React.JSX.Element {
  const groups = useMemo(() => groupEntries(entries), [entries])
  return (
    <div className="space-y-5" onKeyDown={moveFocus}>
      {groups.map((g) => (
        <Group key={g.scope} group={g} summaries={summaries} selectedId={selectedId} showHost={showHost} onSelect={onSelect} />
      ))}
    </div>
  )
}

interface GroupProps extends Omit<SkillListProps, 'entries'> {
  readonly group: SkillGroup
}

function Group({ group, ...rest }: GroupProps): React.JSX.Element {
  const Icon = SCOPE_ICON[group.scope]
  return (
    <section aria-label={SCOPE_LABEL[group.scope]}>
      <h2 className="flex items-center gap-2 border-t border-line pt-3.5 pb-1.5 pl-1.5">
        <Icon className="size-4 text-ink-3" aria-hidden strokeWidth={1.75} />
        <span className="text-[0.8125rem] font-[620] text-ink">{SCOPE_LABEL[group.scope]}</span>
        <span className="num text-xs text-ink-3">{group.count}</span>
      </h2>
      <div className="space-y-2">
        {group.subgroups.map((sub) => (
          <Subgroup key={sub.label ?? '-'} sub={sub} {...rest} />
        ))}
      </div>
    </section>
  )
}

function Subgroup({ sub, summaries, selectedId, showHost, onSelect }: Omit<GroupProps, 'group'> & { readonly sub: SkillSubgroup }): React.JSX.Element {
  return (
    <div>
      {sub.label ? (
        <h3 className="flex items-center gap-1.5 pt-1.5 pb-1 pl-8 text-xs font-[600] text-ink-2">
          {sub.label}
          <span className="num font-[500] text-ink-3">{sub.entries.length}</span>
        </h3>
      ) : null}
      <ul className="space-y-px">
        {sub.entries.map((entry) => (
          <SkillRow key={entry.id} entry={entry} summary={summaries[entry.hash]} selected={entry.id === selectedId} showHost={showHost} onSelect={() => onSelect(entry.id)} />
        ))}
      </ul>
    </div>
  )
}

interface SkillRowProps {
  readonly entry: SkillEntry
  readonly summary: string | undefined
  readonly selected: boolean
  readonly showHost: boolean
  onSelect(): void
}

function SkillRow({ entry, summary, selected, showHost, onSelect }: SkillRowProps): React.JSX.Element {
  const disabled = entry.scope === 'disabled'
  return (
    <li>
      <button
        type="button"
        data-skill-row
        aria-pressed={selected}
        onClick={onSelect}
        className={`group flex h-9 w-full min-w-0 items-center gap-3 rounded-md pr-2.5 pl-2 text-left transition-colors duration-150 ${selected ? 'bg-raised' : 'hover:bg-raised/50'}`}
      >
        <span className={`grid size-5 shrink-0 place-items-center ${selected ? 'text-accent' : 'text-ink-3 group-hover:text-ink-2'}`}>
          <KindIcon kind={entry.kind} />
        </span>
        <span className="flex w-[13.5rem] shrink-0 items-center gap-1.5 max-[1180px]:w-[11rem]">
          <span className={`truncate text-[0.8125rem] font-[580] ${disabled ? 'text-ink-3 line-through decoration-line-strong' : 'text-ink'}`}>{entry.name}</span>
          <EntryTags entry={entry} />
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-ink-3" title={summary ?? entry.description}>
          {summary ?? (entry.description || 'Ohne Beschreibung')}
        </span>
        {showHost ? <HostBadge host={entry.host} subtle /> : null}
      </button>
    </li>
  )
}
