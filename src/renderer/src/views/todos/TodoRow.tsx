import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, ChevronsDown, ChevronsUp, Pencil, Trash2, X } from 'lucide-react'
import type { Priority, TodoItem } from '@shared/types'
import { IconButton } from '@renderer/components/Button'
import { Segmented } from '@renderer/components/Controls'
import { daysUntil, formatDayShort, formatDue } from '@renderer/lib/format'
import { PRIORITY_OPTIONS } from './TodoComposer'

type DueState = 'overdue' | 'today' | 'soon' | 'later'

const DUE_STYLE: Readonly<Record<DueState, string>> = {
  overdue: 'bg-danger-soft text-danger-ink',
  today: 'bg-accent-soft text-accent-text',
  soon: 'bg-raised-2 text-ink-2',
  later: 'text-ink-3'
}

const SOON_DAYS = 3

function dueState(due: string): DueState {
  const diff = daysUntil(due)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  return diff <= SOON_DAYS ? 'soon' : 'later'
}

function Checkbox({ checked, label, onToggle }: { readonly checked: boolean; readonly label: string; onToggle(): void }): React.JSX.Element {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={`mt-px grid size-[1.125rem] shrink-0 place-items-center rounded-[5px] border transition-[background-color,border-color] duration-200 ${checked ? 'border-accent bg-accent' : 'border-line-strong hover:border-ink-3'}`}
    >
      <motion.svg viewBox="0 0 16 16" className="size-3" aria-hidden>
        <motion.path
          d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
          fill="none"
          stroke="var(--color-accent-ink)"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        />
      </motion.svg>
    </button>
  )
}

interface TodoRowProps {
  readonly item: TodoItem
  readonly done: boolean
  onToggle(): void
  onEdit(text: string, priority: Priority, due: string | null): Promise<boolean>
  onDelete(): void
}

function EditForm({ item, onCancel, onSave }: { readonly item: TodoItem; onCancel(): void; onSave(text: string, priority: Priority, due: string | null): void }): React.JSX.Element {
  const [text, setText] = useState(item.text)
  const [priority, setPriority] = useState<Priority>(item.priority)
  const [due, setDue] = useState(item.due ?? '')
  return (
    <form
      className="flex flex-1 flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (text.trim()) onSave(text.trim(), priority, due || null)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
    >
      <input autoFocus aria-label="TODO-Text" value={text} onChange={(e) => setText(e.target.value)} className="field" />
      <div className="flex flex-wrap items-center gap-2">
        <Segmented<Priority> label="Priorität" value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} />
        <input type="date" aria-label="Fällig am" value={due} onChange={(e) => setDue(e.target.value)} className="field h-8 w-36 text-xs" />
        <div className="ml-auto flex gap-1">
          <IconButton size="sm" icon={X} label="Abbrechen" onClick={onCancel} />
          <IconButton size="sm" type="submit" icon={Check} label="Speichern" />
        </div>
      </div>
    </form>
  )
}

export function TodoRow({ item, done, onToggle, onEdit, onDelete }: TodoRowProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const due = item.due && !done ? dueState(item.due) : null

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 12, transition: { duration: 0.16 } }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="group flex items-start gap-3 rounded-lg px-2.5 py-2 hover:bg-raised/50"
    >
      {editing ? (
        <EditForm
          item={item}
          onCancel={() => setEditing(false)}
          onSave={(text, priority, dueDate) => {
            void onEdit(text, priority, dueDate).then((ok) => ok && setEditing(false))
          }}
        />
      ) : (
        <>
          <Checkbox checked={done} label={done ? `„${item.text}“ wieder öffnen` : `„${item.text}“ erledigen`} onToggle={onToggle} />
          <div className="min-w-0 flex-1" onDoubleClick={() => setEditing(true)}>
            <p className={`text-[0.8125rem] leading-snug transition-colors duration-200 ${done ? 'text-ink-3 line-through decoration-ink-3/60' : 'text-ink'}`}>
              {item.priority === 'high' ? <ChevronsUp className="mr-1 -mt-0.5 inline size-3.5 text-accent-text" aria-label="Hohe Priorität" /> : null}
              {item.priority === 'low' ? <ChevronsDown className="mr-1 -mt-0.5 inline size-3.5 text-ink-3" aria-label="Niedrige Priorität" /> : null}
              {item.text}
            </p>
            {item.notes ? <p className="mt-0.5 text-xs whitespace-pre-line text-ink-3">{item.notes}</p> : null}
            {done && item.doneDate ? <p className="num mt-0.5 text-2xs text-ink-3">erledigt am {formatDayShort(item.doneDate)}</p> : null}
          </div>
          {due && item.due ? (
            <span className={`num inline-flex h-5 shrink-0 items-center rounded-full px-2 text-2xs font-[600] ${DUE_STYLE[due]}`} title={`Fällig am ${formatDayShort(item.due)}`}>
              {formatDue(item.due)}
            </span>
          ) : null}
          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <IconButton size="sm" icon={Pencil} label="Bearbeiten" onClick={() => setEditing(true)} />
            <IconButton size="sm" icon={Trash2} tone="danger" label="Löschen" onClick={onDelete} />
          </div>
        </>
      )}
    </motion.li>
  )
}
