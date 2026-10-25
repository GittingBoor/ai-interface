import { useEffect, useId, useRef } from 'react'
import { motion } from 'motion/react'
import { CircleCheck, CircleSlash, ShieldQuestion } from 'lucide-react'
import { confirmTitle, type ConfirmMessage } from '@renderer/lib/assistantMessages'
import { Button } from '../Button'

interface ConfirmCardProps {
  readonly message: ConfirmMessage
  onDecide(requestId: string, allowed: boolean): void
}

function ResolvedStatus({ allowed }: { readonly allowed: boolean }): React.JSX.Element {
  const Icon = allowed ? CircleCheck : CircleSlash
  return (
    <motion.p
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-1.5 text-xs font-[560] text-ink-3"
    >
      <Icon className={`size-3.5 ${allowed ? 'text-accent-text' : 'text-ink-3'}`} aria-hidden strokeWidth={2} />
      {allowed ? 'Freigegeben' : 'Abgelehnt'}
    </motion.p>
  )
}

/** Vorschau einer schreibenden Aktion. Ausgeführt wird nur per Klick oder Enter auf dem Knopf selbst. */
export function ConfirmCard({ message, onDecide }: ConfirmCardProps): React.JSX.Element {
  const titleId = useId()
  const waiting = message.status === 'pending' || message.status === 'sending'
  const sending = message.status === 'sending'
  const card = useRef<HTMLElement>(null)
  const wasWaiting = useRef(waiting)

  // Der geklickte Knopf verschwindet nach der Entscheidung; der Fokus bleibt dann auf der Karte statt im Nichts.
  useEffect(() => {
    const decided = wasWaiting.current && !waiting
    wasWaiting.current = waiting
    if (decided && (document.activeElement === document.body || card.current?.contains(document.activeElement))) card.current?.focus()
  }, [waiting])
  return (
    <motion.section
      ref={card}
      role="group"
      aria-labelledby={titleId}
      tabIndex={0}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-lg border bg-raised transition-colors duration-200 ${waiting ? 'border-accent/45 shadow-[0_8px_24px_-12px_oklch(0_0_0/0.6)]' : 'border-line'}`}
    >
      <header className="flex items-center gap-2 px-3 pt-2.5 pb-2">
        <ShieldQuestion className={`size-3.5 shrink-0 ${waiting ? 'text-accent' : 'text-ink-3'}`} aria-hidden strokeWidth={2} />
        <h3 id={titleId} className="flex-1 truncate text-[0.8125rem] font-[620] text-ink">
          {confirmTitle(message.tool)}
        </h3>
        {waiting ? <span className="text-2xs font-[560] text-accent-text">Wartet auf dich</span> : null}
      </header>
      <pre
        tabIndex={0}
        aria-label="Vorschau"
        className="mx-3 max-h-52 overflow-auto rounded-md border border-line bg-canvas px-2.5 py-2 font-mono text-2xs leading-[1.6] whitespace-pre-wrap break-words text-ink-2"
      >
        {message.preview}
      </pre>
      <footer className="flex min-h-11 items-center gap-2 px-3 py-2.5">
        {waiting ? (
          <>
            <Button size="sm" variant="primary" loading={sending} onClick={() => onDecide(message.id, true)}>
              Ausführen
            </Button>
            <Button size="sm" variant="ghost" disabled={sending} onClick={() => onDecide(message.id, false)}>
              Ablehnen
            </Button>
          </>
        ) : (
          <ResolvedStatus allowed={message.status === 'allowed'} />
        )}
      </footer>
    </motion.section>
  )
}
