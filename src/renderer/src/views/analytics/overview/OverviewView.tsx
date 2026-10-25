import { useState } from 'react'
import { BarChart3, Check, LayoutGrid as LayoutIcon, RefreshCw, RotateCcw, Table2 } from 'lucide-react'
import { Button, IconButton } from '@renderer/components/Button'
import { Section, ViewHeader } from '@renderer/components/Section'
import { ErrorState, Skeleton } from '@renderer/components/States'
import { SessionTable } from '@renderer/components/SessionTable'
import { DailyChart, DailyTable } from '@renderer/components/charts/DailyChart'
import { Heatmap } from '@renderer/components/charts/Heatmap'
import { BarList } from '@renderer/components/charts/BarList'
import { useUsage } from '@renderer/stores/usageStore'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { openTodoCount, useTodos } from '@renderer/stores/todoStore'
import { useNow } from '@renderer/lib/hooks'
import { hostColor, hostLabel, useHostIds } from '@renderer/lib/hosts'
import { LayoutGrid, usePageLayout, type LayoutSection } from '@renderer/components/LayoutGrid'
import { groupByFavorite } from '@renderer/lib/projects'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { baseName, formatRelative, formatTokens, formatUsd } from '@renderer/lib/format'
import { MetricStrip } from './MetricStrip'
import { HostPanel } from './HostPanel'
import { ProjectComparison } from './ProjectComparison'
import { AnalyticsTabs } from '../AnalyticsTabs'

const TOP_PROJECTS = 6
const NOW_TICK_MS = 30_000
/** Schlüssel der gespeicherten Anordnung. */
const PAGE = 'overview'

function OverviewSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Übersicht wird geladen">
      <Skeleton className="h-[8.5rem]" />
      <div className="grid grid-cols-12 gap-10">
        <Skeleton className="col-span-8 h-64" />
        <Skeleton className="col-span-4 h-64" />
      </div>
    </div>
  )
}

export function OverviewView(): React.JSX.Element {
  const overview = useUsage((s) => s.overview)
  const hosts = useUsage((s) => s.hosts)
  const error = useUsage((s) => s.error)
  const refreshing = useUsage((s) => s.refreshing)
  const loadedAt = useUsage((s) => s.loadedAt)
  const load = useUsage((s) => s.load)
  const refresh = useUsage((s) => s.refresh)
  const favorites = useFavorites((s) => s.favorites)
  const todos = useTodos((s) => s.state)
  const legendHosts = useHostIds()
  const [tableView, setTableView] = useState(false)
  const [editing, setEditing] = useState(false)
  const { reset } = usePageLayout(PAGE)
  const now = useNow(NOW_TICK_MS)

  const sections: LayoutSection[] = overview
    ? [
        { id: 'metrics', label: 'Kennzahlen', width: 'full', render: () => <MetricStrip overview={overview} openTodos={todos?.exists ? openTodoCount(todos) : null} /> },
        {
          id: 'daily',
          label: 'Verlauf',
          width: 'wide',
          render: () => (
            <Section
              title="Verlauf · 30 Tage"
              description={
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {legendHosts.map((h) => (
                    <span key={h} className="flex items-center gap-1.5">
                      <span aria-hidden className="size-2 rounded-[2px]" style={{ background: hostColor(h) }} />
                      {hostLabel(h)}
                    </span>
                  ))}
                </span>
              }
              actions={
                <IconButton size="sm" icon={tableView ? BarChart3 : Table2} label={tableView ? 'Als Diagramm zeigen' : 'Als Tabelle zeigen'} onClick={() => setTableView((v) => !v)} />
              }
            >
              {tableView ? <DailyTable daily={overview.daily} /> : <DailyChart daily={overview.daily} />}
            </Section>
          )
        },
        {
          id: 'hosts',
          label: 'Rechner',
          width: 'narrow',
          render: () => (
            <Section title="Rechner" description="Abfrage alle 60 s und bei „Aktualisieren“">
              <HostPanel hosts={hosts} now={now} />
            </Section>
          )
        },
        {
          id: 'activity',
          label: 'Aktivität',
          width: 'half',
          render: () => (
            <Section title="Aktivität" description="Token je Wochentag und Stunde, letzte 12 Wochen">
              <Heatmap cells={overview.heatmap.map((c) => ({ weekday: c.weekday, hour: c.hour, value: c.totalTokens }))} format={(v) => `${formatTokens(v)} Token`} />
            </Section>
          )
        },
        {
          id: 'models',
          label: 'Modelle',
          width: 'half',
          render: () => (
            <Section title="Modelle · 30 Tage" description="Anteil am Verbrauch">
              <BarList
                emptyText="Noch keine Modellnutzung erfasst."
                items={[...overview.models]
                  .sort((a, b) => b.totalTokens - a.totalTokens)
                  .map((m) => ({
                    key: m.model,
                    label: <span className="font-mono text-xs">{m.model}</span>,
                    value: m.totalTokens,
                    valueText: formatTokens(m.totalTokens),
                    detail: m.costUsd === null ? 'ohne Preis' : formatUsd(m.costUsd),
                    color: 'var(--color-ink-3)'
                  }))}
              />
            </Section>
          )
        },
        { id: 'comparison', label: 'Projektvergleich', width: 'full', render: () => <ProjectComparison /> },
        {
          id: 'sessions',
          label: 'Letzte Sessions',
          width: 'wide',
          render: () => (
            <Section title="Letzte Sessions">
              {overview.recentSessions.length ? (
                <SessionTable sessions={overview.recentSessions} favorites={favorites} now={now} />
              ) : (
                <p className="py-4 text-[0.8125rem] text-ink-3">Noch keine Sessions erfasst. Starte Claude in einem Projekt, dann erscheinen sie hier.</p>
              )}
            </Section>
          )
        },
        {
          id: 'topProjects',
          label: 'Top-Projekte',
          width: 'narrow',
          render: () => (
            <Section title="Top-Projekte · 30 Tage">
              <BarList
                emptyText="Noch keine Projekte mit Verbrauch."
                items={groupByFavorite(favorites, overview.projects, baseName)
                  .slice(0, TOP_PROJECTS)
                  .map((g) => ({
                    key: g.key,
                    label:
                      g.color !== null ? (
                        <span className="flex min-w-0 items-center gap-2">
                          <ProjectMark color={g.color} icon={g.icon} size="sm" />
                          <span className="truncate">{g.label}</span>
                        </span>
                      ) : (
                        g.label
                      ),
                    title: `${g.paths.join('\n')} (${hostLabel(g.host)})`,
                    value: g.totalTokens,
                    valueText: formatTokens(g.totalTokens),
                    color: hostColor(g.host)
                  }))}
              />
            </Section>
          )
        }
      ]
    : []

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title="Auswertung"
        actions={
          editing ? (
            <>
              <Button variant="ghost" icon={RotateCcw} onClick={reset}>
                Standard
              </Button>
              <Button variant="primary" icon={Check} onClick={() => setEditing(false)}>
                Fertig
              </Button>
            </>
          ) : (
            <>
              <AnalyticsTabs />
              <Button variant="ghost" icon={LayoutIcon} onClick={() => setEditing(true)} disabled={!overview}>
                Anpassen
              </Button>
              <Button icon={RefreshCw} onClick={() => void refresh()} loading={refreshing}>
                Aktualisieren
              </Button>
            </>
          )
        }
      >
        {editing
          ? 'Abschnitte ziehen oder mit den Pfeilen verschieben, Breite umschalten, ausblenden'
          : loadedAt
            ? `Claude-Code-Verbrauch aller Rechner · Stand ${formatRelative(loadedAt, now)}`
            : 'Claude-Code-Verbrauch aller Rechner'}
      </ViewHeader>

      <div className="@container flex-1 overflow-y-auto px-8 pb-10">
        {error && !overview ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!overview && !error ? <OverviewSkeleton /> : null}
        {overview ? <LayoutGrid page={PAGE} sections={sections} editing={editing} /> : null}
      </div>
    </div>
  )
}
