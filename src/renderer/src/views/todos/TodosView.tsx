import { useMemo, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { FilePlus2, ListChecks, RefreshCw, Search } from 'lucide-react'
import type { Priority, TodoItem } from '@shared/types'
import { Button, IconButton } from '@renderer/components/Button'
import { Segmented } from '@renderer/components/Controls'
import { ViewHeader } from '@renderer/components/Section'
import { EmptyState, ErrorState, SkeletonRows } from '@renderer/components/States'
import { EmptyTodosIllustration } from '@renderer/components/EmptyIllustrations'
import { NoVault, useNoVault } from '@renderer/components/NoVault'
import { useTodos } from '@renderer/stores/todoStore'
import { confirmAction } from '@renderer/stores/confirmStore'
import { hostLabel } from '@renderer/lib/hosts'
import { daysUntil, formatRelative, todayIso } from '@renderer/lib/format'
import { TodoComposer } from './TodoComposer'
import { TodoRow } from './TodoRow'

type StatusFilter = 'open' | 'done' | 'all'
type PriorityFilter = Priority | 'all'

const NO_SECTION = 'Ohne Abschnitt'

function groupBySection(items: readonly TodoItem[], order: readonly string[]): [string, TodoItem[]][] {
  const groups = new Map<string, TodoItem[]>()
  for (const section of order) groups.set(section, [])
  for (const item of items) groups.set(item.section, [...(groups.get(item.section) ?? []), item])
  return [...groups.entries()].filter(([, list]) => list.length > 0)
}

export function TodosView(): React.JSX.Element {
  const state = useTodos((s) => s.state)
  const error = useTodos((s) => s.error)
  const load = useTodos((s) => s.load)
  const apply = useTodos((s) => s.apply)
  const create = useTodos((s) => s.create)
  const noVault = useNoVault()
  const [status, setStatus] = useState<StatusFilter>('open')
  const [priority, setPriority] = useState<PriorityFilter>('all')
  const [query, setQuery] = useState('')
  const [optimistic, setOptimistic] = useState<Readonly<Record<string, boolean>>>({})

  const items = state?.items ?? []
  const isDone = (t: TodoItem): boolean => optimistic[t.id] ?? t.done
  const counts = { open: items.filter((t) => !isDone(t)).length, done: items.filter(isDone).length, all: items.length }
  const overdue = items.filter((t) => !t.done && t.due && daysUntil(t.due) < 0).length

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('de-DE')
    return items.filter((t) => {
      const done = optimistic[t.id] ?? t.done
      if (status === 'open' && done && optimistic[t.id] === undefined) return false
      if (status === 'done' && !done) return false
      if (priority !== 'all' && t.priority !== priority) return false
      return !q || `${t.text} ${t.section} ${t.notes}`.toLocaleLowerCase('de-DE').includes(q)
    })
  }, [items, status, priority, query, optimistic])

  const groups = groupBySection(visible, state?.sections ?? [])

  const toggle = async (item: TodoItem): Promise<void> => {
    setOptimistic((o) => ({ ...o, [item.id]: !item.done }))
    await apply({ kind: 'toggle', id: item.id, today: todayIso() })
    setOptimistic((o) => {
      const { [item.id]: _removed, ...rest } = o
      return rest
    })
  }

  const remove = async (item: TodoItem): Promise<void> => {
    const ok = await confirmAction({ title: 'TODO löschen?', message: `„${item.text}“ wird aus der Datei im Vault entfernt.`, confirmLabel: 'Löschen', danger: true })
    if (ok) await apply({ kind: 'delete', id: item.id })
  }

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title="TODOs"
        actions={<IconButton icon={RefreshCw} label="Neu laden" onClick={() => void load()} />}
      >
        {state?.exists ? (
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-mono text-2xs" title={state.path}>
              {state.path}
            </span>
            <span className="shrink-0 text-ink-3">
              · synchron mit Obsidian{state.modifiedAt ? `, geändert ${formatRelative(state.modifiedAt)}` : ''}
            </span>
          </span>
        ) : (
          'Aufgaben aus der TODO-Datei im Obsidian-Vault'
        )}
      </ViewHeader>

      <div className="@container/main flex-1 overflow-y-auto px-8 pb-10">
        <div>
          {noVault ? <NoVault what="TODOs" /> : null}
          {error && !noVault ? <ErrorState message={error} onRetry={() => void load()} /> : null}
          {!state && !error && !noVault ? <SkeletonRows rows={6} /> : null}
          {state && !state.exists ? (
            <EmptyState
              icon={FilePlus2}
              title="Die TODO-Datei gibt es noch nicht"
              action={
                <Button variant="primary" icon={FilePlus2} onClick={() => void create()}>
                  TODO-Datei anlegen
                </Button>
              }
            >
              Erwartet unter <span className="font-mono text-2xs text-ink-2">{state.path}</span> auf {hostLabel(state.host)}. Pfad und Vault lassen sich in den Einstellungen ändern.
            </EmptyState>
          ) : null}

          {state?.exists ? (
            <>
              <TodoComposer sections={state.sections} />

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Segmented<StatusFilter>
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: 'open', label: 'Offen', count: counts.open },
                    { value: 'done', label: 'Erledigt', count: counts.done },
                    { value: 'all', label: 'Alle', count: counts.all }
                  ]}
                />
                <Segmented<PriorityFilter>
                  label="Priorität"
                  value={priority}
                  onChange={setPriority}
                  options={[
                    { value: 'all', label: 'Jede' },
                    { value: 'high', label: 'Hoch' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'low', label: 'Niedrig' }
                  ]}
                />
                <label className="relative ml-auto">
                  <span className="sr-only">TODOs durchsuchen</span>
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Suchen" className="field w-56 pl-8" type="search" />
                </label>
              </div>
              {overdue > 0 && status !== 'done' ? (
                <p className="mt-3 text-xs text-danger-ink">
                  {overdue} {overdue === 1 ? 'Aufgabe ist' : 'Aufgaben sind'} überfällig.
                </p>
              ) : null}

              <div className="mt-6 grid items-start gap-x-12 gap-y-7 @min-[100rem]/main:grid-cols-2">
                {groups.map(([section, list]) => (
                  <section key={section || NO_SECTION} aria-label={section || NO_SECTION}>
                    <h2 className="mb-1.5 flex items-baseline gap-2 px-2.5 text-xs font-[620] text-ink-2">
                      {section || NO_SECTION}
                      <span className="num font-[500] text-ink-3">{list.filter((t) => !isDone(t)).length}</span>
                    </h2>
                    <ul>
                      <AnimatePresence initial={false}>
                        {list.map((item) => (
                          <TodoRow
                            key={item.id}
                            item={item}
                            done={isDone(item)}
                            onToggle={() => void toggle(item)}
                            onEdit={(text, p, due) => apply({ kind: 'edit', id: item.id, text, priority: p, due })}
                            onDelete={() => void remove(item)}
                          />
                        ))}
                      </AnimatePresence>
                    </ul>
                  </section>
                ))}
                {groups.length === 0 ? (
                  <EmptyState icon={ListChecks} illustration={query || priority !== 'all' ? undefined : <EmptyTodosIllustration />} title={query || priority !== 'all' ? 'Keine Treffer' : status === 'open' ? 'Alles erledigt' : 'Noch nichts erledigt'} compact>
                    {query || priority !== 'all' ? 'Filter oder Suche anpassen.' : status === 'open' ? 'Keine offenen TODOs. Neue Aufgaben oben eintragen oder mit Strg+K „todo: …“.' : 'Abgehakte TODOs erscheinen hier.'}
                  </EmptyState>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
