import { useMemo } from 'react'
import { motion } from 'motion/react'
import { FolderClock, ListTodo, Plus, RotateCcw, SquarePlus } from 'lucide-react'
import type { AnalyticsResult, Favorite, HostId, ProjectTasks, ProjectUsage, SessionSummary, TerminalInfo, TerminalStatus } from '@shared/types'
import { Button } from '@renderer/components/Button'
import { HostBadge } from '@renderer/components/Host'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { EmptyState, Skeleton } from '@renderer/components/States'
import { STATUS_LABEL, StatusDot } from '@renderer/components/StatusDot'
import { formatMetric, type ChartSeries } from '@renderer/lib/analytics'
import { formatDayShort, formatRelative } from '@renderer/lib/format'
import { liveTerminalFor, topProjects } from '@renderer/lib/home'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useNav } from '@renderer/stores/navStore'
import { useTerminals, type LaunchTarget } from '@renderer/stores/terminalStore'
import { useUsage } from '@renderer/stores/usageStore'
import { SERIES_STYLE } from '@renderer/views/analytics/seriesStyle'

const WINDOW_DAYS = 14
const CARD_LIMIT = 6
const FAVORITE_PREFIX = 'fav-'
const KEY_SEPARATOR = '|'
const STAGGER_S = 0.04

/** Kurzform für die enge Karte; die volle Beschreibung steht im Tooltip. */
const SHORT_STATUS: Readonly<Record<TerminalStatus, string>> = {
  working: 'arbeitet',
  review: 'fertig',
  idle: 'bereit',
  question: 'Frage',
  permission: 'Erlaubnis',
  exited: 'beendet'
}

interface Card {
  readonly key: string
  readonly name: string
  readonly color: string
  readonly icon: string | null
  readonly host: HostId
  readonly path: string
  readonly hours: number
  readonly lastText: string | null
  readonly openTasks: number
  readonly terminal: TerminalInfo | null
}

function splitKey(key: string): { readonly host: HostId; readonly path: string } {
  const at = key.indexOf(KEY_SEPARATOR)
  return { host: key.slice(0, at), path: key.slice(at + 1) }
}

function locate(series: ChartSeries, favorites: readonly Favorite[]): { readonly host: HostId; readonly path: string; readonly fav: Favorite | undefined } {
  const fav = series.key.startsWith(FAVORITE_PREFIX) ? favorites.find((f) => `${FAVORITE_PREFIX}${f.id}` === series.key) : undefined
  if (fav) return { host: fav.host, path: fav.path, fav }
  return { ...splitKey(series.memberKeys[0] ?? series.key), fav: undefined }
}

interface Activity {
  readonly projects: readonly ProjectUsage[]
  readonly sessions: readonly SessionSummary[]
  readonly now: number
}

/** „zuletzt vor …“ aus Verbrauch und Sessions, sonst der letzte Tag mit aktiver Zeit. */
function lastText(series: ChartSeries, buckets: readonly string[], activity: Activity): string | null {
  const keys = new Set(series.memberKeys)
  const stamps = [
    ...activity.projects.filter((p) => keys.has(`${p.host}${KEY_SEPARATOR}${p.project}`)).map((p) => p.lastActive),
    ...activity.sessions.filter((s) => keys.has(`${s.host}${KEY_SEPARATOR}${s.project}`)).map((s) => s.endedAt)
  ]
  if (stamps.length) return `zuletzt ${formatRelative(Math.max(...stamps), activity.now)}`
  const recent = buckets.slice(-series.values.length)
  const index = series.values.findLastIndex((v) => v > 0)
  const day = recent[index]
  return day ? `zuletzt am ${formatDayShort(day)}` : null
}

function useCards(result: AnalyticsResult | null, tasks: readonly ProjectTasks[] | null, now: number): Card[] | null {
  const favorites = useFavorites((s) => s.favorites)
  const terminals = useTerminals((s) => s.terminals)
  const projects7d = useUsage((s) => s.projects7d)
  const sessions = useUsage((s) => s.overview?.recentSessions)
  return useMemo(() => {
    if (!result) return null
    const activity: Activity = { projects: projects7d, sessions: sessions ?? [], now }
    return topProjects(result, favorites, WINDOW_DAYS, CARD_LIMIT, SERIES_STYLE).map((s) => {
      const { host, path, fav } = locate(s, favorites)
      return {
        key: s.key,
        name: s.label,
        color: fav?.color ?? s.color,
        icon: fav?.icon ?? null,
        host,
        path,
        hours: s.total,
        lastText: lastText(s, result.buckets, activity),
        openTasks: fav ? (tasks ?? []).filter((t) => t.favoriteId === fav.id).reduce((sum, t) => sum + t.tasks.length, 0) : 0,
        terminal: liveTerminalFor(terminals, host, path)
      }
    })
  }, [result, tasks, favorites, terminals, projects7d, sessions, now])
}

function CardStatus({ terminal, status }: { readonly terminal: TerminalInfo | null; readonly status: TerminalStatus | undefined }): React.JSX.Element {
  if (!terminal) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-2xs font-[560] text-ink-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
        <RotateCcw className="size-3" aria-hidden strokeWidth={2.25} />
        Fortsetzen
      </span>
    )
  }
  const shown: TerminalStatus = status ?? (terminal.running ? 'idle' : 'exited')
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-2xs font-[560] text-ink-2" title={`Terminal: ${STATUS_LABEL[shown]}`}>
      <StatusDot status={shown} size="sm" />
      {SHORT_STATUS[shown]}
    </span>
  )
}

function ContinueCard({ card, index }: { readonly card: Card; readonly index: number }): React.JSX.Element {
  const status = useTerminals((s) => (card.terminal ? s.statuses[card.terminal.id] : undefined))
  const target: LaunchTarget = { host: card.host, path: card.path, name: card.name }
  const open = (): void => {
    const { activate, launch } = useTerminals.getState()
    if (card.terminal) {
      activate(card.terminal.id)
      useNav.getState().go('terminal')
    } else {
      void launch(target, 'continue')
    }
  }
  const startNew = (): void => {
    void useTerminals.getState().launch(target, 'new')
  }
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * STAGGER_S, ease: [0.16, 1, 0.3, 1] }}
      className="group/card relative"
    >
      <button
        type="button"
        onClick={open}
        title={card.terminal ? `Zum Terminal in ${card.name}` : `Letzte Claude-Session in ${card.name} fortsetzen
${card.path}`}
        className="group flex h-full w-full flex-col gap-3 rounded-lg border border-line bg-raised/35 px-4 py-3.5 text-left transition-[background-color,border-color,transform] duration-150 group-hover/card:border-line-strong group-hover/card:bg-raised active:translate-y-px focus-visible:border-accent/60"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <ProjectMark color={card.color} icon={card.icon} size="md" />
          <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-[600] text-ink">{card.name}</span>
          <CardStatus terminal={card.terminal} status={status} />
        </span>
        <span className="flex min-w-0 items-center gap-2 text-2xs text-ink-3">
          <HostBadge host={card.host} subtle />
          {card.lastText ? <span className="truncate">· {card.lastText}</span> : null}
        </span>
        {/* Rechts unten bleibt Platz für den Neu-Knopf, der als Geschwister über der Karte liegt. */}
        <span className="mt-auto flex min-h-6 items-center justify-between gap-3 pr-[4.25rem]">
          <span className="flex items-baseline gap-1.5">
            <span className="num text-[1.0625rem] leading-none font-[620] text-ink">{formatMetric('hours', card.hours)}</span>
            <span className="text-2xs text-ink-3">in {WINDOW_DAYS} Tagen</span>
          </span>
          {card.openTasks > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-2xs font-[560] text-accent-text">
              <ListTodo className="size-3" aria-hidden strokeWidth={2} />
              {card.openTasks} offen
            </span>
          ) : null}
        </span>
      </button>
      <button
        type="button"
        onClick={startNew}
        aria-label={`Neue Claude-Session in ${card.name} starten`}
        title={`Neue Claude-Session in ${card.name} starten`}
        className="absolute right-3 bottom-3 inline-flex h-6 items-center gap-1 rounded-md border border-line bg-base/70 pr-2 pl-1.5 text-2xs font-[560] text-ink-2 transition-[background-color,border-color,color,transform] duration-150 hover:border-accent/50 hover:bg-accent-soft hover:text-accent-text active:scale-[0.96]"
      >
        <Plus className="size-3" aria-hidden strokeWidth={2.5} />
        Neu
      </button>
    </motion.li>
  )
}

function openNewTerminal(): void {
  useTerminals.getState().openDialog()
  useNav.getState().go('terminal')
}

interface ContinueCardsProps {
  readonly result: AnalyticsResult | null
  readonly tasks: readonly ProjectTasks[] | null
  readonly now: number
}

/** Bis zu sechs Projekte mit der meisten aktiven Zeit: Klick springt ins laufende Terminal oder setzt die letzte Session fort, „Neu“ startet eine frische Session. */
export function ContinueCards({ result, tasks, now }: ContinueCardsProps): React.JSX.Element {
  const cards = useCards(result, tasks, now)
  if (!cards) {
    return (
      <div className="grid grid-cols-1 gap-3 @min-[36rem]/main:grid-cols-2 @min-[54rem]/main:grid-cols-3" aria-busy="true" aria-label="Projekte werden geladen">
        {Array.from({ length: CARD_LIMIT }, (_, i) => (
          <Skeleton key={i} className="h-[7.25rem] rounded-lg" />
        ))}
      </div>
    )
  }
  if (!cards.length) {
    return (
      <EmptyState
        icon={FolderClock}
        title="Noch keine aktive Zeit erfasst"
        compact
        action={
          <Button size="sm" icon={SquarePlus} onClick={openNewTerminal}>
            Neues Terminal
          </Button>
        }
      >
        Sobald du in einem Projekt mit Claude arbeitest, erscheinen hier die Projekte der letzten {WINDOW_DAYS} Tage zum Weitermachen.
      </EmptyState>
    )
  }
  return (
    <ul className="grid grid-cols-1 gap-3 @min-[36rem]/main:grid-cols-2 @min-[54rem]/main:grid-cols-3">
      {cards.map((c, i) => (
        <ContinueCard key={c.key} card={c} index={i} />
      ))}
    </ul>
  )
}
