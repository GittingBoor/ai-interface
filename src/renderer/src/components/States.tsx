import type { ReactNode } from 'react'
import { AlertTriangle, type LucideIcon } from 'lucide-react'
import { Button } from './Button'

interface EmptyStateProps {
  readonly icon: LucideIcon
  /** Ersetzt das Symbol durch eine Illustration (siehe EmptyIllustrations). */
  readonly illustration?: ReactNode
  readonly title: string
  readonly children?: ReactNode
  readonly action?: ReactNode
  readonly compact?: boolean
}

/** Leerzustand, der erklärt, was hier hingehört, und den nächsten Schritt anbietet. */
export function EmptyState({ icon: Icon, illustration, title, children, action, compact = false }: EmptyStateProps): React.JSX.Element {
  return (
    <div className={`flex flex-col items-start gap-3 ${compact ? 'py-6' : 'py-14'} max-w-md`}>
      {illustration ?? (
        <span className="grid size-9 place-items-center rounded-lg border border-line bg-raised text-ink-3">
          <Icon className="size-4.5" aria-hidden strokeWidth={1.75} />
        </span>
      )}
      <div className="space-y-1">
        <p className="text-sm font-[600] text-ink">{title}</p>
        {children ? <div className="text-[0.8125rem] leading-relaxed text-ink-3">{children}</div> : null}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { readonly message: string; readonly onRetry?: () => void }): React.JSX.Element {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger-ink" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-[600] text-ink">Laden fehlgeschlagen</p>
        <p className="mt-0.5 text-[0.8125rem] text-ink-2">{message}</p>
      </div>
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Erneut versuchen
        </Button>
      ) : null}
    </div>
  )
}

export function Skeleton({ className = '' }: { readonly className?: string }): React.JSX.Element {
  return <div aria-hidden className={`skeleton ${className}`} />
}

export function SkeletonRows({ rows = 4 }: { readonly rows?: number }): React.JSX.Element {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-label="Wird geladen">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9" />
      ))}
    </div>
  )
}
