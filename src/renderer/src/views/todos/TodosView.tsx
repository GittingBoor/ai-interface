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
import { activeTag } from '@renderer/i18n/activeLocale'
import { currentT, useT } from '@renderer/i18n/useT'

/** React-Schlüssel für TODOs ohne Abschnitt; unabhängig von der Anzeigesprache. */
const NO_SECTION_KEY = '__no-section__'

type StatusFilter = 'open' | 'done' | 'all'
type PriorityFilter = Priority | 'all'

function groupBySection(items: readonly TodoItem[], order: readonly string[]): [string, TodoItem[]][] {
  const groups = new Map<string, TodoItem[]>()
  for (const section of order) groups.set(section, [])
  for (const item of items) groups.set(item.section, [...(groups.get(item.section) ?? []), item])
  return [...groups.entries()].filter(([, list]) => list.length > 0)
}

export function TodosView(): React.JSX.Element {
  const t = useT()
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
  const isDone = (todo: TodoItem): boolean => optimistic[todo.id] ?? todo.done
  const counts = { open: items.filter((todo) => !isDone(todo)).length, done: items.filter(isDone).length, all: items.length }
  const overdue = items.filter((todo) => !todo.done && todo.due && daysUntil(todo.due) < 0).length

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(activeTag())
    return items.filter((todo) => {
      const done = optimistic[todo.id] ?? todo.done
      if (status === 'open' && done && optimistic[todo.id] === undefined) return false
      if (status === 'done' && !done) return false
      if (priority !== 'all' && todo.priority !== priority) return false
      return !q || `${todo.text} ${todo.section} ${todo.notes}`.toLocaleLowerCase(activeTag()).includes(q)
    })
  }, [items, status, priority, query, optimistic])

  const groups = groupBySection(visible, state?.sections ?? [])
  const filtered = query !== '' || priority !== 'all'

  const toggle = async (item: TodoItem): Promise<void> => {
    setOptimistic((o) => ({ ...o, [item.id]: !item.done }))
    await apply({ kind: 'toggle', id: item.id, today: todayIso() })
    setOptimistic((o) => {
      const { [item.id]: _removed, ...rest } = o
      return rest
    })
  }

  const remove = async (item: TodoItem): Promise<void> => {
    const messages = currentT()
    const ok = await confirmAction({ title: messages.todos.deleteTitle, message: messages.todos.deleteMessage(item.text), confirmLabel: messages.common.delete, danger: true })
    if (ok) await apply({ kind: 'delete', id: item.id })
  }

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={t.frame.views.todos}
        actions={<IconButton icon={RefreshCw} label={t.todos.reload} onClick={() => void load()} />}
      >
        {state?.exists ? (
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-mono text-2xs" title={state.path}>
              {state.path}
            </span>
            <span className="shrink-0 text-ink-3">
              {state.modifiedAt ? t.todos.syncedModified(formatRelative(state.modifiedAt)) : t.todos.synced}
            </span>
          </span>
        ) : (
          t.todos.description
        )}
      </ViewHeader>

      <div className="@container/main flex-1 overflow-y-auto px-8 pb-10">
        <div>
          {noVault ? <NoVault what={t.frame.views.todos} /> : null}
          {error && !noVault ? <ErrorState message={error} onRetry={() => void load()} /> : null}
          {!state && !error && !noVault ? <SkeletonRows rows={6} /> : null}
          {state && !state.exists ? (
            <EmptyState
              icon={FilePlus2}
              title={t.todos.missingTitle}
              action={
                <Button variant="primary" icon={FilePlus2} onClick={() => void create()}>
                  {t.todos.createFile}
                </Button>
              }
            >
              {t.todos.expectedBefore}
              <span className="font-mono text-2xs text-ink-2">{state.path}</span>
              {t.todos.expectedAfter(hostLabel(state.host))}
            </EmptyState>
          ) : null}

          {state?.exists ? (
            <>
              <TodoComposer sections={state.sections} />

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Segmented<StatusFilter>
                  label={t.todos.status}
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: 'open', label: t.todos.statusOpen, count: counts.open },
                    { value: 'done', label: t.todos.statusDone, count: counts.done },
                    { value: 'all', label: t.todos.statusAll, count: counts.all }
                  ]}
                />
                <Segmented<PriorityFilter>
                  label={t.todos.priority}
                  value={priority}
                  onChange={setPriority}
                  options={[
                    { value: 'all', label: t.todos.priorityAny },
                    { value: 'high', label: t.todos.high },
                    { value: 'normal', label: t.todos.normal },
                    { value: 'low', label: t.todos.low }
                  ]}
                />
                <label className="relative ml-auto">
                  <span className="sr-only">{t.todos.searchLabel}</span>
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.todos.search} className="field w-56 pl-8" type="search" />
                </label>
              </div>
              {overdue > 0 && status !== 'done' ? (
                <p className="mt-3 text-xs text-danger-ink">{t.todos.overdue(overdue)}</p>
              ) : null}

              <div className="mt-6 grid items-start gap-x-12 gap-y-7 @min-[100rem]/main:grid-cols-2">
                {groups.map(([section, list]) => (
                  <section key={section || NO_SECTION_KEY} aria-label={section || t.todos.noSection}>
                    <h2 className="mb-1.5 flex items-baseline gap-2 px-2.5 text-xs font-[620] text-ink-2">
                      {section || t.todos.noSection}
                      <span className="num font-[500] text-ink-3">{list.filter((todo) => !isDone(todo)).length}</span>
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
                  <EmptyState icon={ListChecks} illustration={filtered ? undefined : <EmptyTodosIllustration />} title={filtered ? t.todos.noMatchesTitle : status === 'open' ? t.todos.allDoneTitle : t.todos.nothingDoneTitle} compact>
                    {filtered ? t.todos.noMatchesBody : status === 'open' ? t.todos.allDoneBody(t.frame.shortcut('K')) : t.todos.nothingDoneBody}
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
