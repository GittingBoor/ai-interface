import type { Favorite, SessionSummary } from '@shared/types'
import { ProjectMark } from './ProjectMark'
import { findFavorite } from '@renderer/lib/projects'
import { baseName, formatDateTime, formatDuration, formatRelative, formatTokens, formatUsd } from '@renderer/lib/format'
import { HostBadge } from './Host'
import { useT } from '@renderer/i18n/useT'

interface SessionTableProps {
  readonly sessions: readonly SessionSummary[]
  readonly favorites: readonly Favorite[]
  readonly now: number
  /** Projektspalte ausblenden (z. B. in der Projektansicht). */
  readonly hideProject?: boolean
}

/** Sessions als dichte Tabelle: Projekt, Rechner, Beginn, Dauer, Token, Kosten. */
export function SessionTable({ sessions, favorites, now, hideProject = false }: SessionTableProps): React.JSX.Element {
  const t = useT()
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full min-w-[34rem] border-separate border-spacing-0 text-[0.8125rem]">
        <thead>
          <tr className="text-left text-xs text-ink-3">
            {hideProject ? null : <th className="w-[30%] px-2 pb-2 font-[520]">{t.frame.sessions.project}</th>}
            <th className="px-2 pb-2 font-[520]">{t.frame.sessions.computer}</th>
            <th className="px-2 pb-2 font-[520]">{t.frame.sessions.start}</th>
            <th className="px-2 pb-2 text-right font-[520]">{t.frame.sessions.activeDuration}</th>
            <th className="px-2 pb-2 text-right font-[520]">{t.frame.sessions.tokens}</th>
            <th className="px-2 pb-2 text-right font-[520]">{t.frame.sessions.cost}</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => {
            const fav = findFavorite(favorites, s.host, s.project)
            return (
              <tr key={`${s.host}-${s.sessionId}`} className="group" title={t.frame.sessions.rowTitle(s.project, s.models.join(', '), s.messages)}>
                {hideProject ? null : (
                  <td className="max-w-0 border-t border-line px-2 py-2 group-hover:bg-raised/60">
                    <span className="flex min-w-0 items-center gap-2">
                      <ProjectMark color={fav?.color ?? 'var(--color-line-strong)'} icon={fav?.icon ?? null} size="sm" />
                      <span className="truncate text-ink">{fav?.name ?? baseName(s.project)}</span>
                    </span>
                  </td>
                )}
                <td className="border-t border-line px-2 py-2 group-hover:bg-raised/60">
                  <HostBadge host={s.host} subtle />
                </td>
                <td className="border-t border-line px-2 py-2 whitespace-nowrap text-ink-2 group-hover:bg-raised/60" title={formatDateTime(s.startedAt)}>
                  {formatRelative(s.startedAt, now)}
                </td>
                <td className="num border-t border-line px-2 py-2 text-right whitespace-nowrap text-ink-2 group-hover:bg-raised/60">
                  {formatDuration(s.activeMs)} <span className="text-ink-3">/ {formatDuration(s.endedAt - s.startedAt)}</span>
                </td>
                <td className="num border-t border-line px-2 py-2 text-right whitespace-nowrap text-ink group-hover:bg-raised/60">{formatTokens(s.totalTokens)}</td>
                <td className="num border-t border-line px-2 py-2 text-right whitespace-nowrap text-ink-2 group-hover:bg-raised/60">
                  {s.costUsd === null ? <span title={t.frame.sessions.noPrice}>–</span> : formatUsd(s.costUsd)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
