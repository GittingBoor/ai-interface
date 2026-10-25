import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle, Wrench } from 'lucide-react'
import { renderMarkdown } from '@renderer/lib/markdown'
import { toolLabel, type AssistantMessage, type ChatMessage, type ErrorMessage, type ToolMessage, type UserMessage } from '@renderer/lib/assistantMessages'
import { ConfirmCard } from './ConfirmCard'

/** Abstand zum Ende, unter dem die Liste als „ganz unten“ gilt und mitscrollt. */
const STICK_THRESHOLD_PX = 48
const ENTER = { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } } as const
const TYPING_DOTS = [0, 1, 2] as const
const TYPING_DOT_DELAY_S = 0.16

interface MessageListProps {
  readonly messages: readonly ChatMessage[]
  readonly running: boolean
  readonly waitingForDecision: boolean
  onDecide(requestId: string, allowed: boolean): void
}

function UserBubble({ message }: { readonly message: UserMessage }): React.JSX.Element {
  return (
    <motion.div {...ENTER} className="flex justify-end pl-10">
      <p className="rounded-lg rounded-br-sm border border-line bg-raised-2 px-3 py-2 text-[0.8125rem] leading-relaxed whitespace-pre-wrap break-words text-ink">
        {message.text}
      </p>
    </motion.div>
  )
}

const AssistantText = memo(function AssistantText({ message }: { readonly message: AssistantMessage }): React.JSX.Element {
  const html = useMemo(() => renderMarkdown(message.text), [message.text])
  return <motion.div {...ENTER} className="prose-log prose-compact" dangerouslySetInnerHTML={{ __html: html }} />
})

function ToolLine({ message, live }: { readonly message: ToolMessage; readonly live: boolean }): React.JSX.Element {
  return (
    <motion.p {...ENTER} className="flex items-center gap-2 text-2xs text-ink-3" title={message.summary === '{}' ? message.name : `${message.name} ${message.summary}`}>
      <Wrench className="size-3 shrink-0" aria-hidden strokeWidth={2} />
      <span className="truncate">{toolLabel(message.name)}
        {live ? ' …' : ''}
      </span>
    </motion.p>
  )
}

function ErrorLine({ message }: { readonly message: ErrorMessage }): React.JSX.Element {
  return (
    <motion.div {...ENTER} role="alert" className="flex items-start gap-2 text-xs leading-snug">
      <AlertTriangle className="mt-px size-3.5 shrink-0 text-danger-ink" aria-hidden strokeWidth={2} />
      <div className="min-w-0">
        <p className="text-ink-2">{message.message}</p>
        {message.hint ? <p className="mt-0.5 text-ink-3">{message.hint}</p> : null}
      </div>
    </motion.div>
  )
}

function TypingIndicator(): React.JSX.Element {
  return (
    <motion.div {...ENTER} role="status" className="flex h-5 items-center gap-1 text-ink-3">
      <span className="sr-only">Der Assistent antwortet …</span>
      {TYPING_DOTS.map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="size-1.5 rounded-full bg-current"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * TYPING_DOT_DELAY_S, ease: 'easeInOut' }}
        />
      ))}
    </motion.div>
  )
}

interface EntryProps {
  readonly message: ChatMessage
  /** Gehört zur laufenden Antwort. */
  readonly live: boolean
  onDecide(requestId: string, allowed: boolean): void
}

function Entry({ message, live, onDecide }: EntryProps): React.JSX.Element {
  switch (message.kind) {
    case 'user':
      return <UserBubble message={message} />
    case 'assistant':
      return <AssistantText message={message} />
    case 'tool':
      return <ToolLine message={message} live={live} />
    case 'confirm':
      return <ConfirmCard message={message} onDecide={onDecide} />
    case 'error':
      return <ErrorLine message={message} />
  }
}

/** Verlauf; scrollt mit, solange der Nutzer nicht hochgescrollt hat. */
export function MessageList({ messages, running, waitingForDecision, onDecide }: MessageListProps): React.JSX.Element {
  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)

  useLayoutEffect(() => {
    const el = scroller.current
    // Eine eigene, gerade gesendete Nachricht holt die Liste immer ans Ende.
    if (messages.at(-1)?.kind === 'user') stick.current = true
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [messages, running])

  const lastUser = messages.findLastIndex((m) => m.kind === 'user')

  const onScroll = (): void => {
    const el = scroller.current
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX
  }

  return (
    <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite" aria-relevant="additions">
      <div className="flex flex-col gap-3.5">
        {messages.map((m, i) => (
          <Entry key={m.id} message={m} live={running && i > lastUser} onDecide={onDecide} />
        ))}
        {running && !waitingForDecision ? <TypingIndicator /> : null}
      </div>
    </div>
  )
}
