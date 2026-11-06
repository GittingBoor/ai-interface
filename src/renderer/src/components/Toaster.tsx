import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useT } from '@renderer/i18n/useT'
import { useToasts, type ToastKind } from '@renderer/stores/toastStore'

const ICON = { error: CircleAlert, success: CircleCheck, info: Info } as const
const ICON_COLOR: Readonly<Record<ToastKind, string>> = { error: 'text-danger-ink', success: 'text-mini-ink', info: 'text-ink-2' }

export function Toaster(): React.JSX.Element {
  const t = useT()
  const toasts = useToasts((s) => s.toasts)
  const dismiss = useToasts((s) => s.dismiss)
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-5 bottom-5 z-[60] flex w-[22rem] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = ICON[toast.kind]
          return (
            <motion.div
              key={toast.id}
              layout
              role={toast.kind === 'error' ? 'alert' : 'status'}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.16 } }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex items-start gap-3 rounded-lg border border-line-strong/70 bg-raised-2 py-3 pr-2 pl-3.5 shadow-[0_12px_32px_-8px_oklch(0_0_0/0.6)]"
            >
              <Icon className={`mt-px size-4 shrink-0 ${ICON_COLOR[toast.kind]}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] leading-snug font-[560] text-ink">{toast.title}</p>
                {toast.hint ? <p className="mt-1 text-xs leading-snug text-ink-3">{toast.hint}</p> : null}
              </div>
              {toast.action ? (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.run()
                    dismiss(toast.id)
                  }}
                  className="h-6 shrink-0 rounded px-2 text-xs font-[600] text-accent-text transition-colors hover:bg-accent-soft"
                >
                  {toast.action.label}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label={t.frame.toast.dismiss}
                className="grid size-6 shrink-0 place-items-center rounded text-ink-3 transition-colors hover:bg-line hover:text-ink"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
