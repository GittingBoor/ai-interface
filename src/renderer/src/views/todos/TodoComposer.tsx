import { useEffect, useRef, useState } from 'react'
import { CornerDownLeft } from 'lucide-react'
import type { Priority } from '@shared/types'
import { Button } from '@renderer/components/Button'
import { Segmented } from '@renderer/components/Controls'
import { useTodos } from '@renderer/stores/todoStore'
import { useNav } from '@renderer/stores/navStore'

export const PRIORITY_OPTIONS: readonly { readonly value: Priority; readonly label: string }[] = [
  { value: 'high', label: 'Hoch' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Niedrig' }
]

const LAST_SECTION_KEY = 'ai-interface.todo.section'

export function TodoComposer({ sections }: { readonly sections: readonly string[] }): React.JSX.Element {
  const apply = useTodos((s) => s.apply)
  const pending = useTodos((s) => s.pending)
  const request = useNav((s) => s.todoComposerRequest)
  const draft = useNav((s) => s.todoDraft)
  const input = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [section, setSection] = useState(() => localStorage.getItem(LAST_SECTION_KEY) ?? sections[0] ?? '')
  const [priority, setPriority] = useState<Priority>('normal')
  const [due, setDue] = useState('')

  useEffect(() => {
    if (request === 0) return
    setText(draft)
    requestAnimationFrame(() => input.current?.focus())
  }, [request, draft])

  const submit = async (): Promise<void> => {
    if (!text.trim()) {
      input.current?.focus()
      return
    }
    const ok = await apply({ kind: 'add', section: section.trim(), text: text.trim(), priority, due: due || null })
    if (ok) {
      localStorage.setItem(LAST_SECTION_KEY, section.trim())
      setText('')
      setDue('')
      setPriority('normal')
      input.current?.focus()
    }
  }

  return (
    <form
      className="rounded-xl border border-line bg-raised/60 p-1.5 transition-colors focus-within:border-line-strong focus-within:bg-raised"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <input
        ref={input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Neues TODO"
        placeholder="Neues TODO …"
        className="h-10 w-full bg-transparent px-3 text-[0.9375rem] text-ink outline-none"
      />
      <div className="flex flex-wrap items-center gap-2 px-1.5 pb-0.5">
        <label className="flex items-center gap-2 text-xs text-ink-3">
          Abschnitt
          <input
            list="todo-sections"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="ohne"
            className="field h-7 w-44 text-xs"
          />
          <datalist id="todo-sections">
            {sections.filter(Boolean).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <Segmented<Priority> label="Priorität" value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} />
        <label className="flex items-center gap-2 text-xs text-ink-3">
          Fällig
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="field h-7 w-36 text-xs" />
        </label>
        <Button type="submit" variant="primary" size="sm" loading={pending} className="ml-auto" disabled={!text.trim()}>
          Anlegen <CornerDownLeft className="size-3 opacity-70" aria-hidden />
        </Button>
      </div>
    </form>
  )
}
