import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'

interface ModalProps {
  readonly open: boolean
  readonly label: string
  readonly onClose: () => void
  readonly children: ReactNode
  /** Klassen für den Inhaltsrahmen (Breite, Position). */
  readonly className?: string
  readonly align?: 'center' | 'top'
  readonly backdrop?: string
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

/** Offene Dialoge, oberster zuletzt: nur er reagiert auf Esc und Tab (verschachtelte Dialoge). */
const openStack: symbol[] = []

/** Überlagerung mit Fokusfalle, Esc zum Schließen und Fokus-Rückgabe. */
export function Modal({ open, label, onClose, children, className = '', align = 'center', backdrop = 'bg-canvas/70' }: ModalProps): React.JSX.Element {
  const panel = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const token = Symbol('modal')
    openStack.push(token)
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = requestAnimationFrame(() => {
      const target = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE)
      target?.focus()
    })
    const onKey = (e: KeyboardEvent): void => {
      if (openStack[openStack.length - 1] !== token) return
      if (e.key === 'Escape') {
        // Felder mit eigener Esc-Bedeutung (z. B. Umbenennen abbrechen) schließen den Dialog nicht.
        if (e.target instanceof Element && e.target.closest('[data-own-escape]')) return
        e.stopPropagation()
        closeRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel.current) return
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey, true)
      openStack.splice(openStack.indexOf(token), 1)
      previous?.focus()
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="modal"
          className={`fixed inset-0 z-50 flex justify-center px-6 ${align === 'top' ? 'items-start pt-[14vh]' : 'items-center'} ${backdrop}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={className}
            initial={{ opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.99 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}
