import { useEffect, useMemo } from 'react'
import { ChartArea, FolderX, RefreshCw, X } from 'lucide-react'
import type { AnalyticsMetric, AnalyticsQuery, AnalyticsResult, SessionSummary } from '@shared/types'
import { Button } from '@renderer/components/Button'
import { Section, ViewHeader } from '@renderer/components/Section'
import { EmptyState, ErrorState, Skeleton } from '@renderer/components/States'
import { SessionTable } from '@renderer/components/SessionTable'
import { TrendChart } from '@renderer/components/charts/TrendChart'
import { RankingBars } from '@renderer/components/charts/RankingBars'
import { Heatmap, type HeatValue } from '@renderer/components/charts/Heatmap'
import { useAnalytics, type AnalyticsDrill } from '@renderer/stores/analyticsStore'
import { useUsage } from '@renderer/stores/usageStore'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useNow } from '@renderer/lib/hooks'
import { hostLabel } from '@renderer/lib/hosts'
import { formatDateMedium } from '@renderer/lib/format'
import { formatMetric, groupSeries, METRIC_LABEL, REST_SERIES_KEY, TOP_SERIES, topWithRestSeries, type ChartSeries } from '@renderer/lib/analytics'
import { AnalyticsTabs } from './AnalyticsTabs'
import { FilterPanel } from './FilterPanel'
import { MetricTiles } from './MetricTiles'
import { OverviewView } from './overview/OverviewView'
import { SERIES_STYLE } from './seriesStyle'

const NOW_TICK_MS = 30_000
const SESSION_LIMIT = 12

const RANGE_TEXT: Readonly<Record<AnalyticsQuery['range'], string>> = { '7d': '7 Tage', '30d': '30 Tage', '90d': 'Quartal', '365d': 'Jahr', all: 'Gesamt' }
const RESOLUTION_TEXT: Readonly<Record<AnalyticsQuery['resolution'], string>> = { day: 'Tag', week: 'Woche', month: 'Monat' }
const SPLIT_TEXT: Readonly<Record<AnalyticsQuery['split'], string>> = { project: 'Projekt', host: 'Rechner', model: 'Modell', none: '' }
type HeatMetric = 'tokens' | 'hours' | 'prompts'
const HEAT_UNIT: Readonly<Record<HeatMetric, string>> = { tokens: 'Token', hours: 'aktive Zeit', prompts: 'Prompts' }

const heatMetricOf = (metric: AnalyticsMetric): HeatMetric => (metric === 'hours' || metric === 'prompts' ? metric : 'tokens')

function formatHeat(metric: HeatMetric, value: number): string {
  if (metric === 'tokens') return `${formatMetric('tokens', value)} Token`
  if (metric === 'prompts') return `${formatMetric('prompts', value)} Prompts`
  return formatMetric('hours', value)
}

function AnalyticsSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Auswertung wird geladen">
      <Skeleton className="h-[6.75rem]" />
      <Skeleton className="h-[17rem]" />
      <div className="grid grid-cols-12 gap-10">
        <Skeleton className="col-span-7 h-56" />
        <Skeleton className="col-span-5 h-56" />
      </div>
    </div>
  )
}

/** Sessions passend zu Rechner und Projektauswahl (inkl. Drilldown). */
function filterSessions(sessions: readonly SessionSummary[], query: AnalyticsQuery): SessionSummary[] {
  const projects = query.projects === null ? null : new Set(query.projects)
  const excluded = new Set(query.excludedProjects)
  const models = query.models
  return sessions
    .filter((s) => {
      const key = `${s.host}|${s.project}`
      const modelOk = models === null || s.models.some((m) => models.includes(m))
      return (query.host === 'all' || s.host === query.host) && (projects === null || projects.has(key)) && !excluded.has(key) && modelOk
    })
    .slice(0, SESSION_LIMIT)
}

interface ChartsProps {
  readonly result: AnalyticsResult
  readonly query: AnalyticsQuery
}

function useSeries({ result, query }: ChartsProps): { readonly ranking: ChartSeries[]; readonly trend: ChartSeries[] } {
  const favorites = useFavorites((s) => s.favorites)
  const metric = useAnalytics((s) => s.metric)
  return useMemo(() => {
    const ranking = groupSeries(result, query.split, metric, favorites, SERIES_STYLE)
    return { ranking, trend: topWithRestSeries(ranking, TOP_SERIES) }
  }, [result, query.split, metric, favorites])
}

function Charts({ result, query }: ChartsProps): React.JSX.Element {
  const metric = useAnalytics((s) => s.metric)
  const chartMode = useAnalytics((s) => s.chartMode)
  const drill = useAnalytics((s) => s.drill)
  const { drillInto, clearDrill } = useAnalytics.getState()
  const { ranking, trend } = useSeries({ result, query })
  const heatMetric = heatMetricOf(metric)
  const heatCells = useMemo<HeatValue[]>(() => result.heatmap.map((c) => ({ weekday: c.weekday, hour: c.hour, value: c[heatMetric] })), [result.heatmap, heatMetric])
  const splitText = SPLIT_TEXT[query.split]
  const canDrill = query.split !== 'none' && (ranking.length > 1 || drill !== null)
  const restFrom = ranking.length > TOP_SERIES + 1 ? TOP_SERIES : ranking.length

  const select = (s: ChartSeries): void => {
    if (drill?.key === s.key) return clearDrill()
    const target: AnalyticsDrill = { key: s.key, label: s.label, memberKeys: s.memberKeys, split: query.split }
    drillInto(target)
  }

  return (
    <>
      <Section
        title={`${METRIC_LABEL[metric]} je ${RESOLUTION_TEXT[query.resolution]}`}
        description={`${splitText ? `aufgeteilt nach ${splitText}` : 'ohne Aufteilung'}${trend.some((s) => s.key === REST_SERIES_KEY) ? `, die ${TOP_SERIES} größten plus Rest` : ''} · ${RANGE_TEXT[query.range]}`}
      >
        <TrendChart buckets={result.buckets} series={trend} mode={chartMode} metric={metric} resolution={query.resolution} />
      </Section>
      <div className="grid grid-cols-12 gap-x-10 gap-y-10">
        <Section
          className="col-span-12 @min-[64rem]/content:col-span-7"
          title={`Ranking nach ${METRIC_LABEL[metric]}`}
          description={canDrill ? 'Klick zeigt nur diesen Eintrag, erneuter Klick hebt den Filter auf' : `${ranking.length} ${ranking.length === 1 ? 'Eintrag' : 'Einträge'} · ${RANGE_TEXT[query.range]}`}
        >
          <RankingBars series={ranking} metric={metric} selected={drill?.split === query.split ? drill.key : null} onSelect={canDrill ? select : undefined} restFrom={restFrom} />
        </Section>
        <Section
          className="col-span-12 @min-[64rem]/content:col-span-5"
          title="Wann du arbeitest"
          description={`${HEAT_UNIT[heatMetric]} je Wochentag und Stunde${heatMetric !== metric ? ` (${METRIC_LABEL[metric]} gibt es nicht je Stunde)` : ''}`}
        >
          <Heatmap cells={heatCells} format={(v) => formatHeat(heatMetric, v)} />
        </Section>
      </div>
    </>
  )
}

function DrillChip(): React.JSX.Element | null {
  const drill = useAnalytics((s) => s.drill)
  const clearDrill = useAnalytics((s) => s.clearDrill)
  if (!drill) return null
  return (
    <button
      type="button"
      onClick={clearDrill}
      className="inline-flex h-8 max-w-64 items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft pr-2 pl-3 text-xs font-[560] text-accent-text transition-colors duration-150 hover:border-accent/70 hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
      title="Filter aufheben"
    >
      <span className="truncate">Filter: {drill.label}</span>
      <X className="size-3.5 shrink-0" aria-hidden strokeWidth={2.25} />
      <span className="sr-only">aufheben</span>
    </button>
  )
}

function isEmpty(result: AnalyticsResult): boolean {
  return result.totals.tokens === 0 && result.totals.prompts === 0 && result.totals.sessions === 0
}

function Body(): React.JSX.Element {
  const result = useAnalytics((s) => s.result)
  const error = useAnalytics((s) => s.error)
  const loading = useAnalytics((s) => s.loading)
  const query = useAnalytics((s) => s.active)
  const universe = useAnalytics((s) => s.universe)
  const metric = useAnalytics((s) => s.metric)
  const { load, setMetric, setExcluded } = useAnalytics.getState()
  const sessions = useUsage((s) => s.overview?.recentSessions)
  const favorites = useFavorites((s) => s.favorites)
  const now = useNow(NOW_TICK_MS)
  const visibleSessions = useMemo(() => filterSessions(sessions ?? [], query), [sessions, query])

  if (!result) return error ? <ErrorState message={error} onRetry={() => void load()} /> : <AnalyticsSkeleton />
  const excluded = new Set(query.excludedProjects)
  const noneSelected = excluded.size > 0 && (universe?.series ?? []).every((s) => excluded.has(s.key))
  return (
    <div className={`space-y-10 transition-opacity duration-200 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
      {error ? (
        <p role="alert" className="text-xs text-danger-ink">
          Neu laden fehlgeschlagen, gezeigt wird der letzte Stand: {error}{' '}
          <button type="button" className="font-[600] underline underline-offset-2" onClick={() => void load()}>
            Erneut versuchen
          </button>
        </p>
      ) : null}
      <MetricTiles result={result} range={query.range} metric={metric} onSelect={setMetric} />
      {noneSelected ? (
        <EmptyState icon={FolderX} title="Kein Projekt ausgewählt" action={<Button size="sm" onClick={() => setExcluded([])}>Alle Projekte zeigen</Button>}>
          Wähle links mindestens ein Projekt, damit die Diagramme etwas zeigen.
        </EmptyState>
      ) : isEmpty(result) ? (
        <EmptyState icon={ChartArea} title="Keine Daten in diesem Zeitraum">
          {query.host === 'all' ? 'Auf keinem Rechner' : `Auf ${hostLabel(query.host)}`} wurde im gewählten Zeitraum nicht gearbeitet. Wähle einen längeren Zeitraum oder einen anderen Rechner.
        </EmptyState>
      ) : (
        <Charts result={result} query={query} />
      )}
      <Section title="Letzte Sessions" description={query.host === 'all' && query.projects === null && query.excludedProjects.length === 0 && query.models === null ? undefined : 'passend zu Rechner und Projektauswahl'}>
        {visibleSessions.length ? (
          <SessionTable sessions={visibleSessions} favorites={favorites} now={now} />
        ) : (
          <p className="py-4 text-[0.8125rem] text-ink-3">{sessions?.length ? 'Keine der letzten Sessions passt zu diesem Filter.' : 'Noch keine Sessions erfasst. Starte Claude in einem Projekt, dann erscheinen sie hier.'}</p>
        )}
      </Section>
    </div>
  )
}

/** Analyse des Verbrauchs: Filter links, Kennzahlen und drei verknüpfte Diagramme rechts. */
function AnalysisPage(): React.JSX.Element {
  const query = useAnalytics((s) => s.query)
  const dataSince = useAnalytics((s) => s.result?.dataSince ?? null)
  const loadedAt = useUsage((s) => s.loadedAt)
  const refreshing = useUsage((s) => s.refreshing)
  const refresh = useUsage((s) => s.refresh)

  useEffect(() => {
    void useAnalytics.getState().load()
  }, [loadedAt])

  return (
    <div className="@container/analytics flex h-full flex-col">
      <ViewHeader
        title="Auswertung"
        actions={
          <>
            <DrillChip />
            <AnalyticsTabs />
            <Button icon={RefreshCw} onClick={() => void refresh()} loading={refreshing}>
              Aktualisieren
            </Button>
          </>
        }
      >
        {dataSince !== null ? `Daten seit ${formatDateMedium(dataSince)}` : 'Verbrauch über die Zeit'}
        {query.host !== 'all' ? ` · nur ${hostLabel(query.host)}` : ''}
      </ViewHeader>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto @min-[64rem]/analytics:flex-row @min-[64rem]/analytics:overflow-hidden">
        <FilterPanel />
        <div className="@container/content min-w-0 flex-1 px-8 pt-1 pb-10 @min-[64rem]/analytics:overflow-y-auto @max-[64rem]/analytics:pt-6">
          <Body />
        </div>
      </div>
    </div>
  )
}

/** Auswertung mit zwei Reitern: feste Übersicht und Analyse mit Filtern. */
export function AnalyticsView(): React.JSX.Element {
  const tab = useAnalytics((s) => s.tab)
  return tab === 'overview' ? <OverviewView /> : <AnalysisPage />
}
