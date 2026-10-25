import { motion } from 'motion/react'
import { RefreshCw } from 'lucide-react'
import type { HostId, HostStatus, QuotaWindow } from '@shared/types'
import { useQuota } from '@renderer/stores/quotaStore'
import { useUsage } from '@renderer/stores/usageStore'
import { useNow } from '@renderer/lib/hooks'
import { hostIds, hostLabel } from '@renderer/lib/hosts'
import { formatAge, formatCountdown, formatInteger, formatRelative } from '@renderer/lib/format'
import { orderedWindows, QUOTA_LABEL, QUOTA_STALE_MS, quotaLevel, type QuotaLevel } from '@renderer/lib/quota'
import { HostDot } from './Host'
import { Skeleton } from './States'
import { Button } from './Button'

const TICK_MS = 1_000
const MAX_PERCENT = 100

const LEVEL_FILL: Readonly<Record<QuotaLevel, string>> = {
  normal: 'bg-accent',
  warn: 'bg-warn',
  danger: 'bg-danger'
}

const LEVEL_TEXT: Readonly<Record<QuotaLevel, string>> = {
  normal: 'text-ink',
  warn: 'text-warn',
  danger: 'text-danger-ink'
}

function resetText(window: QuotaWindow, now: number): string {
  if (window.resetsAt === null) return 'kein Reset-Zeitpunkt bekannt'
  if (window.resetsAt <= now) return 'wird zurückgesetzt …'
  return `Reset in ${formatCountdown(window.resetsAt - now)}`
}

function QuotaBar({ window, now }: { readonly window: QuotaWindow; readonly now: number }): React.JSX.Element {
  const percent = Math.min(MAX_PERCENT, Math.max(0, window.percent))
  const level = quotaLevel(percent)
  const label = QUOTA_LABEL[window.kind]
  return (
    <li>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-ink-2">{label}</span>
        <span className={`num font-[600] ${LEVEL_TEXT[level]}`}>{formatInteger(percent)} %</span>
      </div>
      <div
        className="mt-1 h-1 overflow-hidden rounded-full bg-raised"
        role="meter"
        aria-label={`Kontingent ${label}`}
        aria-valuemin={0}
        aria-valuemax={MAX_PERCENT}
        aria-valuenow={percent}
      >
        <motion.div
          className={`h-full rounded-full ${LEVEL_FILL[level]}`}
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <p className="num mt-1 text-2xs text-ink-3">{resetText(window, now)}</p>
    </li>
  )
}

/** Kontingentbalken mit Stand und Neu-Abfrage (auch auf der Startseite). */
export function QuotaBlock({ now }: { readonly now: number }): React.JSX.Element {
  const state = useQuota((s) => s.state)
  const refreshing = useQuota((s) => s.refreshing)
  const refresh = useQuota((s) => s.refresh)

  if (state.status === 'loading') {
    return (
      <div className="space-y-2.5" aria-busy="true" aria-label="Kontingent wird geladen">
        <Skeleton className="h-7" />
        <Skeleton className="h-7" />
      </div>
    )
  }

  if (state.status !== 'ok') {
    return (
      <div className="space-y-2">
        <p className="text-xs font-[560] text-ink-2">Kontingent: keine Quelle</p>
        <p className="line-clamp-2 text-2xs text-ink-3" title={`${state.reason}\n${state.hint}`}>
          {state.reason}
        </p>
        <Button size="sm" variant="secondary" icon={RefreshCw} loading={refreshing} onClick={() => void refresh()}>
          Erneut
        </Button>
      </div>
    )
  }

  const stale = now - state.fetchedAt > QUOTA_STALE_MS
  return (
    <div>
      <ul className={`space-y-2.5 transition-opacity ${stale ? 'opacity-45' : ''}`} aria-describedby="quota-age">
        {orderedWindows(state.windows).map((w) => (
          <QuotaBar key={w.kind} window={w} now={now} />
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p id="quota-age" className={`num text-2xs ${stale ? 'text-warn' : 'text-ink-3'}`}>
          {stale ? `Veraltet · Stand ${formatAge(state.fetchedAt, now)}` : `Stand ${formatAge(state.fetchedAt, now)}`}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          aria-label="Kontingent neu abfragen"
          title="Kontingent neu abfragen"
          className="grid size-5 place-items-center rounded text-ink-3 transition-colors hover:bg-raised-2 hover:text-ink disabled:opacity-50"
        >
          <RefreshCw className={`size-3 ${refreshing ? 'animate-spin' : ''}`} aria-hidden strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

type HostState = 'unbekannt' | 'deaktiviert' | 'online' | 'offline'

function hostState(status: HostStatus | undefined): HostState {
  return !status ? 'unbekannt' : !status.enabled ? 'deaktiviert' : status.online ? 'online' : 'offline'
}

function HostLine({ host, status }: { readonly host: HostId; readonly status: HostStatus | undefined }): React.JSX.Element {
  const state = hostState(status)
  const detail = status?.lastCollect ? formatRelative(status.lastCollect.finishedAt) : null
  return (
    <li className="flex items-center gap-2.5 py-0.5" title={status?.error ?? undefined}>
      <HostDot host={host} />
      <span className="flex-1 truncate text-xs text-ink-2">{hostLabel(host)}</span>
      <span className={`text-2xs font-[560] ${state === 'offline' ? 'text-danger-ink' : 'text-ink-3'}`}>{state === 'online' && detail ? detail : state}</span>
    </li>
  )
}

/** Unten in der Seitenleiste: Kontingent des Claude-Abos, aktive Sessions, Rechnerstatus. */
export function QuotaPanel(): React.JSX.Element {
  const now = useNow(TICK_MS)
  const hosts = useUsage((s) => s.hosts)
  const activeSessions = useUsage((s) => s.overview?.activeSessions ?? null)

  return (
    <div className="border-t border-line/70 px-4 pt-3 pb-4">
      <p className="mb-2 text-2xs font-[600] text-ink-3">Kontingent</p>
      <QuotaBlock now={now} />
      <div className="mt-3 border-t border-line/70 pt-2.5">
        {activeSessions !== null ? (
          <p className="mb-1 flex items-center gap-2.5 text-xs text-ink-2">
            <span
              aria-hidden
              className={`inline-block size-2 shrink-0 rounded-full ${activeSessions > 0 ? 'animate-pulse-dot bg-accent text-accent' : 'bg-line-strong'}`}
            />
            <span className="num">
              {activeSessions === 0 ? 'Keine aktive Session' : activeSessions === 1 ? '1 aktive Session' : `${formatInteger(activeSessions)} aktive Sessions`}
            </span>
          </p>
        ) : null}
        <ul>
          {hostIds().map((id) => (
            <HostLine key={id} host={id} status={hosts.find((h) => h.id === id)} />
          ))}
        </ul>
      </div>
    </div>
  )
}

function RailQuotaBar({ window, now }: { readonly window: QuotaWindow; readonly now: number }): React.JSX.Element {
  const percent = Math.min(MAX_PERCENT, Math.max(0, window.percent))
  const level = quotaLevel(percent)
  const label = QUOTA_LABEL[window.kind]
  return (
    <li title={`${label}: ${formatInteger(percent)} % · ${resetText(window, now)}`} className="flex flex-col items-center gap-1">
      <span className={`num text-2xs font-[600] ${LEVEL_TEXT[level]}`}>
        {formatInteger(percent)}
        <span className="sr-only"> % Kontingent {label}</span>
      </span>
      <span aria-hidden className="block h-1 w-7 overflow-hidden rounded-full bg-raised">
        <span className={`block h-full rounded-full ${LEVEL_FILL[level]}`} style={{ width: `${percent}%` }} />
      </span>
    </li>
  )
}

/** Schmale Fassung von {@link QuotaPanel} für die eingeklappte Seitenleiste: Prozentwerte und Rechnerpunkte, Details im Tooltip. */
export function QuotaRail(): React.JSX.Element {
  const now = useNow(TICK_MS)
  const state = useQuota((s) => s.state)
  const hosts = useUsage((s) => s.hosts)
  const stale = state.status === 'ok' && now - state.fetchedAt > QUOTA_STALE_MS

  return (
    <div className="flex flex-col items-center gap-3 border-t border-line/70 px-1 pt-3 pb-4">
      {state.status === 'ok' ? (
        <ul aria-label="Kontingent" className={`flex flex-col items-center gap-2 transition-opacity ${stale ? 'opacity-45' : ''}`}>
          {orderedWindows(state.windows).map((w) => (
            <RailQuotaBar key={w.kind} window={w} now={now} />
          ))}
        </ul>
      ) : null}
      <ul aria-label="Rechner" className="flex flex-col items-center gap-1.5">
        {hostIds().map((id) => {
          const hostStatus = hostState(hosts.find((h) => h.id === id))
          return (
            <li key={id} title={`${hostLabel(id)}: ${hostStatus}`} className="grid size-4 place-items-center">
              <HostDot host={id} className={hostStatus === 'online' ? '' : 'opacity-35'} />
              <span className="sr-only">
                {hostLabel(id)}: {hostStatus}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
