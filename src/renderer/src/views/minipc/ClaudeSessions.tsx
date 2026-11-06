import type { ClaudeProcess } from '@shared/types'
import type { Messages } from '@shared/i18n/messages'
import { useT } from '@renderer/i18n/useT'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useMiniPc } from '@renderer/stores/miniPcStore'
import { findFavorite } from '@renderer/lib/projects'
import { baseName, formatDateTime } from '@renderer/lib/format'
import { formatUptime } from '@renderer/lib/miniPc'
import { LaunchButtons } from './LaunchButtons'

const MS_PER_SECOND = 1_000

interface StatusStyle {
  readonly label: string
  readonly badge: string
  readonly dot: string
}

const statusOf = (status: string | null, t: Messages['device']): StatusStyle => {
  if (status === 'busy') return { label: t.sessionBusy, badge: 'bg-accent-soft text-accent-text', dot: 'bg-accent animate-pulse-dot text-accent' }
  if (status === 'idle') return { label: t.sessionIdle, badge: 'bg-raised text-ink-3', dot: 'bg-ink-3' }
  return { label: status ?? t.sessionUnknown, badge: 'bg-raised text-ink-3', dot: 'bg-line-strong' }
}

function SessionRow({ session, now }: { readonly session: ClaudeProcess; readonly now: number }): React.JSX.Element {
  const t = useT().device
  const favorites = useFavorites((s) => s.favorites)
  const host = useMiniPc((s) => s.device) ?? ''
  const favorite = session.cwd ? findFavorite(favorites, host, session.cwd) : undefined
  const style = statusOf(session.status, t)
  const folder = session.cwd ? baseName(session.cwd) : null
  const title = session.name ?? folder ?? `PID ${session.pid}`
  return (
    <li className="flex items-center gap-3 py-2.5">
      {favorite ? <ProjectMark color={favorite.color} icon={favorite.icon} size="sm" /> : <span className="size-4 shrink-0" aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[0.8125rem] font-[560] text-ink">{title}</span>
          <span className={`inline-flex h-4.5 shrink-0 items-center gap-1 rounded-full px-1.5 text-2xs font-[600] ${style.badge}`}>
            <span className={`size-1.5 rounded-full ${style.dot}`} aria-hidden />
            {style.label}
          </span>
        </p>
        <p className="mt-0.5 truncate font-mono text-2xs text-ink-3" title={session.cwd ?? undefined}>
          {session.cwd ?? t.sessionFolderUnknown}
        </p>
      </div>
      {session.startedAt ? (
        <span className="num shrink-0 text-xs text-ink-3" title={t.sessionStarted(formatDateTime(session.startedAt))}>
          {t.sessionSince(formatUptime(Math.max(0, now - session.startedAt) / MS_PER_SECOND))}
        </span>
      ) : null}
      {session.cwd ? <LaunchButtons path={session.cwd} name={favorite?.name ?? folder ?? title} /> : null}
    </li>
  )
}

/** Laufende Claude-Code-Sitzungen auf dem Gerät. */
export function ClaudeSessions({ sessions, now }: { readonly sessions: readonly ClaudeProcess[]; readonly now: number }): React.JSX.Element {
  const t = useT().device
  if (!sessions.length) return <p className="text-[0.8125rem] text-ink-3">{t.sessionsEmpty}</p>
  return (
    <ul className="divide-y divide-line border-y border-line">
      {sessions.map((s) => (
        <SessionRow key={s.pid} session={s} now={now} />
      ))}
    </ul>
  )
}
