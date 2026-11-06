import { RefreshCw } from 'lucide-react'
import { IconButton } from './Button'
import { useKnowledge } from '@renderer/stores/knowledgeStore'
import { useT } from '@renderer/i18n/useT'
import type { Messages } from '@shared/i18n/messages'

type RefreshSize = 'xs' | 'sm'

interface KnowledgeRefreshButtonProps {
  readonly size: RefreshSize
  readonly className?: string
}

function tooltip(t: Messages['knowledge'], active: boolean, done: number, total: number, deferred: number): string {
  if (!active) return t.refresh
  const base = t.refreshing(done, total)
  return deferred > 0 ? t.refreshingDeferred(base, deferred) : base
}

/** Startet im Hintergrund einen Wissensdurchgang; dreht sich, solange einer läuft. */
export function KnowledgeRefreshButton({ size, className = '' }: KnowledgeRefreshButtonProps): React.JSX.Element {
  const progress = useKnowledge((s) => s.progress)
  const refresh = useKnowledge((s) => s.refresh)
  const t = useT().knowledge
  const title = tooltip(t, progress.active, progress.done, progress.total, progress.deferred)
  const onClick = (event: React.MouseEvent): void => {
    event.stopPropagation()
    void refresh()
  }
  if (size === 'sm') {
    return <SmallButton active={progress.active} label={t.refresh} title={title} onClick={onClick} className={className} />
  }
  return (
    <button
      type="button"
      aria-label={t.refresh}
      title={title}
      disabled={progress.active}
      onClick={onClick}
      className={`inline-flex size-5 shrink-0 items-center justify-center rounded text-ink-3 transition-colors duration-150 hover:bg-raised-2 hover:text-ink disabled:hover:bg-transparent disabled:hover:text-ink-3 ${progress.active ? 'text-accent' : ''} ${className}`}
    >
      <RefreshCw aria-hidden strokeWidth={1.75} className={`size-3 ${progress.active ? 'animate-spin motion-reduce:animate-none' : ''}`} />
    </button>
  )
}

interface SmallButtonProps {
  readonly active: boolean
  readonly label: string
  readonly title: string
  readonly className: string
  onClick(event: React.MouseEvent): void
}

function SmallButton({ active, label, title, className, onClick }: SmallButtonProps): React.JSX.Element {
  return (
    <IconButton
      size="sm"
      icon={RefreshCw}
      label={label}
      title={title}
      disabled={active}
      onClick={onClick}
      className={`${active ? 'text-accent [&>svg]:animate-spin motion-reduce:[&>svg]:animate-none' : ''} ${className}`}
    />
  )
}
