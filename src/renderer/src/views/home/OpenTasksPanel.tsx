import { useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, ListChecks, NotebookText } from 'lucide-react'
import type { OpenTask, ProjectTasks } from '@shared/types'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { EmptyState, ErrorState, SkeletonRows } from '@renderer/components/States'
import { formatRelative } from '@renderer/lib/format'
import { useNav } from '@renderer/stores/navStore'
import type { OpenTasks } from './useHomeData'

/** Ab so vielen Aufgaben wird die Liste eingeklappt. */
const COLLAPSED_TASKS = 8
const FALLBACK_COLOR = 'var(--color-line-strong)'
const EASE = [0.16, 1, 0.3, 1] as const

/** Gruppen so kürzen, dass höchstens `limit` Aufgaben sichtbar sind. */
function limitTasks(groups: readonly ProjectTasks[], limit: number): ProjectTasks[] {
  const shown: ProjectTasks[] = []
  let left = limit
  for (const g of groups) {
    if (left <= 0) break
    shown.push({ ...g, tasks: g.tasks.slice(0, left) })
    left -= g.tasks.length
  }
  return shown
}

/** Ob der Text im eingeklappten Zustand abgeschnitten ist; misst bei jeder Größenänderung neu. */
function useClamped(ref: React.RefObject<HTMLElement | null>, open: boolean): boolean {
  const [clamped, setClamped] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || open) return
    const measure = (): void => setClamped(el.scrollHeight > el.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, open])
  return clamped
}

function TaskRow({ task, onCheck }: { readonly task: OpenTask; readonly onCheck: () => void }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)
  const clamped = useClamped(textRef, open)
  const expandable = clamped || open
  const toggle = (): void => setOpen((v) => !v)
  return (
    <motion.li
      layout="position"
      initial={false}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.22, ease: EASE } }}
      className="overflow-hidden"
    >
      <div className="group flex items-start gap-1 rounded-md py-1 pr-1 pl-0.5 transition-colors duration-150 hover:bg-raised">
        <button
          type="button"
          role="checkbox"
          aria-checked={false}
          aria-label={`Erledigt: ${task.text}`}
          onClick={onCheck}
          className="group/check grid size-6 shrink-0 place-items-center rounded-md"
        >
          <span
            aria-hidden
            className="grid size-3.5 place-items-center rounded-[4px] border border-line-strong transition-colors duration-150 group-hover:border-ink-3 group-hover/check:border-accent group-focus-visible/check:border-accent"
          >
            <Check className="size-2.5 text-accent opacity-0 transition-opacity duration-150 group-hover/check:opacity-60" strokeWidth={3.5} />
          </span>
        </button>
        <p
          ref={textRef}
          title={task.text}
          onClick={expandable ? toggle : undefined}
          className={`min-w-0 flex-1 my-[3px] text-[0.8125rem] leading-snug text-ink-2 group-hover:text-ink ${open ? '' : 'line-clamp-2'} ${expandable ? 'cursor-pointer' : ''}`}
        >
          {task.text}
        </p>
        {expandable ? (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-label={open ? 'Aufgabe einklappen' : 'Ganze Aufgabe anzeigen'}
            title={open ? 'Einklappen' : 'Ganzen Text anzeigen'}
            className="grid size-6 shrink-0 place-items-center rounded-md text-ink-3 transition-colors duration-150 hover:bg-raised-2 hover:text-ink"
          >
            <ChevronDown className={`size-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
          </button>
        ) : null}
      </div>
    </motion.li>
  )
}

function GroupBlock({ group, now, onCheck }: { readonly group: ProjectTasks; readonly now: number; readonly onCheck: (task: OpenTask) => void }): React.JSX.Element {
  return (
    <motion.li layout="position" exit={{ opacity: 0, transition: { duration: 0.18 } }} className="py-3 first:pt-0 @min-[60rem]/main:pt-0 @min-[60rem]/main:pb-5">
      <div className="mb-1 flex min-w-0 items-center gap-2 px-2">
        <ProjectMark color={group.color ?? FALLBACK_COLOR} icon={group.icon} size="sm" />
        <span className="min-w-0 truncate text-xs font-[600] text-ink">{group.label}</span>
        <span className="num shrink-0 text-2xs text-ink-3">· {formatRelative(group.protocolDate, now)}</span>
        <button
          type="button"
          onClick={() => useNav.getState().openProtocol(group.protocolPath)}
          className="ml-auto inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-[560] text-ink-3 transition-colors hover:bg-raised-2 hover:text-ink focus-visible:bg-raised-2 focus-visible:outline-none"
          title={group.protocolPath}
        >
          <NotebookText className="size-3" aria-hidden strokeWidth={2} />
          Protokoll
        </button>
      </div>
      <ul>
        <AnimatePresence initial={false}>
          {group.tasks.map((t) => (
            <TaskRow key={t.key} task={t} onCheck={() => onCheck(t)} />
          ))}
        </AnimatePresence>
      </ul>
    </motion.li>
  )
}

/** Offene Punkte aus dem neuesten Protokoll je Projekt, neuestes Protokoll zuerst. */
export function OpenTasksPanel({ tasks, now }: { readonly tasks: OpenTasks; readonly now: number }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const { groups, error, retry, check } = tasks
  if (!groups) return error ? <ErrorState message={error} onRetry={retry} /> : <SkeletonRows rows={4} />
  const total = groups.reduce((sum, g) => sum + g.tasks.length, 0)
  if (total === 0) {
    return (
      <EmptyState icon={ListChecks} title="Keine offenen Aufgaben" compact>
        Hier erscheinen die Punkte unter „Offen:“ aus dem neuesten Protokoll jedes Projekts.
      </EmptyState>
    )
  }
  const collapsible = total > COLLAPSED_TASKS
  const shown = collapsible && !expanded ? limitTasks(groups, COLLAPSED_TASKS) : groups
  return (
    <div>
      {error ? <p role="alert" className="mb-2 text-xs text-danger-ink">Neu laden fehlgeschlagen: {error}</p> : null}
      <ul className="-mx-2 grid grid-cols-1 divide-y divide-line/70 @min-[60rem]/main:grid-cols-2 @min-[60rem]/main:gap-x-10 @min-[60rem]/main:divide-y-0">
        <AnimatePresence initial={false}>
          {shown.map((g) => (
            <GroupBlock key={g.groupId} group={g} now={now} onCheck={(t) => check(g, t)} />
          ))}
        </AnimatePresence>
      </ul>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-2 inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-[560] text-ink-3 transition-colors hover:bg-raised-2 hover:text-ink"
        >
          <ChevronDown className={`size-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} aria-hidden />
          {expanded ? 'Weniger anzeigen' : `Alle ${total} Aufgaben anzeigen`}
        </button>
      ) : null}
    </div>
  )
}
