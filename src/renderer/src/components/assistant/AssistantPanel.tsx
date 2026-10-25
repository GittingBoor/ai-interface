import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { motion } from 'motion/react'
import { SquarePen, X } from 'lucide-react'
import { useAssistant } from '@renderer/stores/assistantStore'
import { ASSISTANT_DEFAULT_WIDTH, hasPendingConfirm } from '@renderer/lib/assistantMessages'
import { IconButton } from '../Button'
import { MessageList } from './MessageList'
import { Composer } from './Composer'

export const ASSISTANT_PANEL_ID = 'assistant-panel'
const RESIZE_KEY_STEP_PX = 16
const PANEL_TRANSITION = { duration: 0.28, ease: [0.16, 1, 0.3, 1] } as const
const NO_TRANSITION = { duration: 0 } as const
const SUGGESTIONS = ['Neues Projekt anlegen', 'Wie steht mein Kontingent?', 'Was läuft gerade auf meinen Geräten?'] as const

function Suggestions({ onPick }: { onPick(text: string): void }): React.JSX.Element {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto px-4 pb-4">
      <p className="text-sm font-[600] text-ink">Was steht an?</p>
      <p className="mt-1 max-w-[34ch] text-[0.8125rem] leading-relaxed text-ink-3">
        Der Assistent kennt deine Projekte, TODOs und das Kontingent. Bevor er etwas anlegt oder schreibt, fragt er nach.
      </p>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s, i) => (
          <motion.li key={s} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ ...PANEL_TRANSITION, delay: 0.04 * i }}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="h-7 rounded-full border border-line bg-base px-3 text-xs text-ink-2 transition-colors duration-150 hover:border-accent/50 hover:bg-accent-soft hover:text-accent-text"
            >
              {s}
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

/** Griff am linken Rand: Ziehen, Pfeiltasten oder Doppelklick (Standardbreite). */
function ResizeHandle({ onDragChange }: { onDragChange(dragging: boolean): void }): React.JSX.Element {
  const width = useAssistant((s) => s.width)
  const setWidth = useAssistant((s) => s.setWidth)
  const start = useRef<{ readonly x: number; readonly width: number } | null>(null)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    if (e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { x: e.clientX, width }
    onDragChange(true)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>): void => {
    if (start.current) setWidth(start.current.width + start.current.x - e.clientX)
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>): void => {
    if (!start.current) return
    setWidth(start.current.width + start.current.x - e.clientX, true)
    start.current = null
    onDragChange(false)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    const delta = e.key === 'ArrowLeft' ? RESIZE_KEY_STEP_PX : e.key === 'ArrowRight' ? -RESIZE_KEY_STEP_PX : 0
    if (!delta) return
    e.preventDefault()
    setWidth(width + delta, true)
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Breite des Assistenten"
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => setWidth(ASSISTANT_DEFAULT_WIDTH, true)}
      onKeyDown={onKeyDown}
      title="Ziehen zum Ändern der Breite"
      className="group absolute inset-y-0 left-0 z-10 w-2 cursor-col-resize touch-none focus-visible:outline-none"
    >
      <span className="absolute inset-y-0 left-0 w-px bg-transparent transition-colors duration-150 group-hover:bg-accent/60 group-focus-visible:bg-accent group-active:bg-accent" />
    </div>
  )
}

/** Assistent rechts neben dem Inhalt; schiebt den Inhalt beim Öffnen schmaler statt ihn zu überdecken. */
export function AssistantPanel(): React.JSX.Element {
  const open = useAssistant((s) => s.open)
  const width = useAssistant((s) => s.width)
  const messages = useAssistant((s) => s.messages)
  const running = useAssistant((s) => s.running)
  const { setOpen, send, stop, newChat, decide } = useAssistant.getState()
  const [dragging, setDragging] = useState(false)
  const panel = useRef<HTMLElement>(null)
  const composer = useRef<HTMLTextAreaElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      composer.current?.focus()
      return
    }
    if (panel.current?.contains(document.activeElement)) returnFocus.current?.focus()
  }, [open])

  return (
    <motion.aside
      ref={panel}
      id={ASSISTANT_PANEL_ID}
      aria-label="Assistent"
      aria-hidden={!open}
      inert={!open}
      initial={false}
      animate={{ width: open ? width : 0 }}
      transition={dragging ? NO_TRANSITION : PANEL_TRANSITION}
      className={`relative shrink-0 overflow-hidden border-line/70 bg-canvas ${open ? 'border-l' : ''} ${dragging ? 'select-none' : ''}`}
    >
      {open ? <ResizeHandle onDragChange={setDragging} /> : null}
      <div className="absolute inset-y-0 left-0 flex flex-col overflow-hidden" style={{ width }}>
        <header className="flex h-14 shrink-0 items-center gap-1 border-b border-line/70 pr-2 pl-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[0.875rem] leading-tight font-[640] tracking-[-0.01em] text-ink [font-stretch:110%]">Assistent</h2>
            <p className="text-2xs text-ink-3">Opus 5.5 · Abo</p>
          </div>
          <IconButton icon={SquarePen} label="Neuer Chat" onClick={() => void newChat()} disabled={messages.length === 0 && !running} />
          <IconButton icon={X} label="Schließen (Strg+J)" onClick={() => setOpen(false)} />
        </header>
        {messages.length === 0 ? (
          <Suggestions onPick={(text) => void send(text)} />
        ) : (
          <MessageList messages={messages} running={running} waitingForDecision={hasPendingConfirm(messages)} onDecide={(id, allowed) => void decide(id, allowed)} />
        )}
        <Composer ref={composer} running={running} onSend={(text) => void send(text)} onStop={() => void stop()} />
      </div>
    </motion.aside>
  )
}
