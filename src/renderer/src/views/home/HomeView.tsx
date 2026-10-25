import { RefreshCw, ScanSearch } from 'lucide-react'
import type { HostId, HostStatus } from '@shared/types'
import { Button } from '@renderer/components/Button'
import { HostDot } from '@renderer/components/Host'
import { Section, ViewHeader } from '@renderer/components/Section'
import { ErrorState } from '@renderer/components/States'
import { useNow } from '@renderer/lib/hooks'
import { hostLabel, useHostIds } from '@renderer/lib/hosts'
import { formatRelative } from '@renderer/lib/format'
import { useTerminals } from '@renderer/stores/terminalStore'
import { useUsage } from '@renderer/stores/usageStore'
import { ContinueCards } from './ContinueCards'
import { OpenTasksPanel } from './OpenTasksPanel'
import { WeekTiles } from './WeekTiles'
import { useHomeUsage, useOpenTasks } from './useHomeData'

const NOW_TICK_MS = 30_000
const MORNING_FROM = 5
const DAY_FROM = 11
const EVENING_FROM = 18

const today = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

function greeting(date: Date): string {
  const hour = date.getHours()
  if (hour >= MORNING_FROM && hour < DAY_FROM) return 'Guten Morgen'
  if (hour >= DAY_FROM && hour < EVENING_FROM) return 'Guten Tag'
  return 'Guten Abend'
}

function hostDetail(status: HostStatus | undefined, now: number): string {
  if (!status) return 'unbekannt'
  if (!status.enabled) return 'deaktiviert'
  if (!status.online) return 'offline'
  return status.lastCollect ? `abgerufen ${formatRelative(status.lastCollect.finishedAt, now)}` : 'online'
}

function HostLine({ id, status, now }: { readonly id: HostId; readonly status: HostStatus | undefined; readonly now: number }): React.JSX.Element {
  const offline = status?.enabled === true && !status.online
  return (
    <li className="flex items-center gap-1.5" title={status?.error ?? undefined}>
      <HostDot host={id} className={`size-1.5 ${offline ? 'opacity-40' : ''}`} />
      <span className="text-ink-2">{status?.label ?? hostLabel(id)}</span>
      <span className={offline ? 'text-danger-ink' : 'text-ink-3'}>{hostDetail(status, now)}</span>
    </li>
  )
}

function HostLines({ now }: { readonly now: number }): React.JSX.Element {
  const ids = useHostIds()
  const hosts = useUsage((s) => s.hosts)
  return (
    <ul aria-label="Rechnerstatus" className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
      {ids.map((id) => (
        <HostLine key={id} id={id} status={hosts.find((h) => h.id === id)} now={now} />
      ))}
    </ul>
  )
}

/** Startseite: weiterarbeiten, offene Aufgaben, Wochenzahlen. */
export function HomeView(): React.JSX.Element {
  const now = useNow(NOW_TICK_MS)
  const refreshing = useUsage((s) => s.refreshing)
  const refresh = useUsage((s) => s.refresh)
  const usage = useHomeUsage()
  const tasks = useOpenTasks()
  const date = new Date(now)

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={greeting(date)}
        actions={
          <Button icon={RefreshCw} onClick={() => void refresh()} loading={refreshing}>
            Aktualisieren
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span>{today.format(date)}</span>
          <HostLines now={now} />
        </div>
      </ViewHeader>
      <div className="flex-1 overflow-y-auto px-8 pt-2 pb-12">
        {usage.error && !usage.week ? (
          <div className="mb-8">
            <ErrorState message={usage.error} onRetry={usage.retry} />
          </div>
        ) : null}
        <div className="@container/main min-w-0 space-y-10">
          <Section title="Weiterarbeiten" description="Projekte mit der meisten aktiven Zeit der letzten 14 Tage">
            <ContinueCards result={usage.projects} tasks={tasks.groups} now={now} />
          </Section>
          <Section
            title="Offene Aufgaben"
            description="Aus dem neuesten Protokoll je Projekt"
            actions={
              <Button size="sm" variant="ghost" icon={ScanSearch} onClick={() => void useTerminals.getState().openTaskReview()} disabled={!tasks.groups?.length}>
                Mit Claude prüfen
              </Button>
            }
          >
            <OpenTasksPanel tasks={tasks} now={now} />
          </Section>
          <Section title="Diese Woche" description="Letzte 7 Tage gegenüber den 7 Tagen davor">
            <WeekTiles result={usage.week} />
          </Section>
        </div>
      </div>
    </div>
  )
}
