import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { registerAssistantInserter } from '@renderer/lib/speechTargets'
import { insertAtCursor } from '@renderer/lib/speechText'
import { MicButton } from '../speech/MicButton'

/** Höchste Höhe des Textfelds, danach scrollt es. */
const MAX_TEXTAREA_PX = 176

interface ComposerProps {
  readonly running: boolean
  onSend(text: string): void
  onStop(): void
}

/** Eingabe: Enter sendet, Shift+Enter bricht um. Während der Antwort ersetzt Stopp den Senden-Knopf. */
export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer({ running, onSend, onStop }, ref) {
  const [text, setText] = useState('')
  const local = useRef<HTMLTextAreaElement | null>(null)
  const canSend = text.trim().length > 0 && !running

  useLayoutEffect(() => {
    const el = local.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_PX)}px`
  }, [text])

  useEffect(
    () =>
      registerAssistantInserter((spoken) => {
        const el = local.current
        setText((current) => {
          const start = el?.selectionStart ?? current.length
          const end = el?.selectionEnd ?? current.length
          const next = insertAtCursor(current, start, end, spoken)
          requestAnimationFrame(() => {
            el?.focus()
            el?.setSelectionRange(next.cursor, next.cursor)
          })
          return next.value
        })
      }),
    []
  )

  const submit = (): void => {
    if (!canSend) return
    onSend(text)
    setText('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
    e.preventDefault()
    submit()
  }

  const setRefs = (el: HTMLTextAreaElement | null): void => {
    local.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) ref.current = el
  }

  return (
    <form
      className="border-t border-line/70 p-3"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="flex items-end gap-2 rounded-lg border border-line bg-base p-1.5 pl-3 transition-[border-color,box-shadow] duration-150 focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--color-accent-soft)] hover:border-line-strong focus-within:hover:border-accent">
        <textarea
          ref={setRefs}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          aria-label="Nachricht an den Assistenten"
          placeholder={running ? 'Antwort läuft …' : 'Nachricht an den Assistenten'}
          className="min-h-7 flex-1 resize-none self-center bg-transparent py-1 text-[0.8125rem] leading-relaxed text-ink outline-none focus-visible:outline-none"
        />
        <MicButton target={{ kind: 'assistant' }} />
        {running ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Antwort stoppen"
            title="Antwort stoppen"
            className="grid size-7 shrink-0 place-items-center rounded-md bg-raised-2 text-ink transition-colors hover:bg-line-strong"
          >
            <Square className="size-3" aria-hidden fill="currentColor" strokeWidth={0} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Senden (Enter)"
            title="Senden (Enter)"
            className="grid size-7 shrink-0 place-items-center rounded-md bg-accent text-accent-ink transition-[background-color,color,transform] duration-150 hover:bg-accent-hover active:translate-y-px disabled:bg-raised-2 disabled:text-ink-3"
          >
            <ArrowUp className="size-4" aria-hidden strokeWidth={2.25} />
          </button>
        )}
      </div>
      <p className="mt-1.5 px-1 text-2xs text-ink-3">Enter senden · Shift+Enter neue Zeile · Mikrofon diktiert</p>
    </form>
  )
})
