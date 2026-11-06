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
import { formatMetric, groupSeries, metricLabel, REST_SERIES_KEY, TOP_SERIES, topWithRestSeries, type ChartSeries } from '@renderer/lib/analytics'
import { AnalyticsTabs } from './AnalyticsTabs'
import { FilterPanel } from './FilterPanel'
import { MetricTiles } from './MetricTiles'
import { OverviewView } from './overview/OverviewView'
import { SERIES_STYLE } from './seriesStyle'
import { useLocale, useT } from '@renderer/i18n/useT'
import type { Messages } from '@shared/i18n/messages'

const NOW_TICK_MS = 30_000
const SESSION_LIMIT = 12

type HeatMetric = 'tokens' | 'hours' | 'prompts'

const heatMetricOf = (metric: AnalyticsMetric): HeatMetric => (metric === 'hours' || metric === 'prompts' ? metric : 'tokens')

function formatHeat(metric: HeatMetric, value: number, t: Messages['usage']): string {
  if (metric === 'tokens') return t.tokensValue(formatMetric('tokens', value))
  if (metric === 'prompts') return t.promptsValue(formatMetric('prompts', value))
  return formatMetric('hours', value)
}

function AnalyticsSkeleton(): React.JSX.Element {
  const t = useT().usage.analytics
  return (
    <div className="space-y-8" aria-busy="true" aria-label={t.loadingAria}>
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
  const locale = useLocale()
  return useMemo(() => {
    const ranking = groupSeries(result, query.split, metric, favorites, SERIES_STYLE)
    return { ranking, trend: topWithRestSeries(ranking, TOP_SERIES) }
  }, [result, query.split, metric, favorites, locale])
}

function Charts({ result, query }: ChartsProps): React.JSX.Element {
  const t = useT().usage
  const metric = useAnalytics((s) => s.metric)
  const chartMode = useAnalytics((s) => s.chartMode)
  const drill = useAnalytics((s) => s.drill)
  const { drillInto, clearDrill } = useAnalytics.getState()
  const { ranking, trend } = useSeries({ result, query })
  const heatMetric = heatMetricOf(metric)
  const heatCells = useMemo<HeatValue[]>(() => result.heatmap.map((c) => ({ weekday: c.weekday, hour: c.hour, value: c[heatMetric] })), [result.heatmap, heatMetric])
  const splitText = query.split === 'none' ? '' : t.analytics.splitsInline[query.split]
  const rangeText = t.analytics.ranges[query.range]
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
        title={t.analytics.trendTitle(metricLabel(metric), t.analytics.resolutions[query.resolution])}
        description={`${splitText ? t.analytics.splitBy(splitText) : t.analytics.noSplit}${trend.some((s) => s.key === REST_SERIES_KEY) ? t.analytics.restNote(TOP_SERIES) : ''} · ${rangeText}`}
      >
        <TrendChart buckets={result.buckets} series={trend} mode={chartMode} metric={metric} resolution={query.resolution} />
      </Section>
      <div className="grid grid-cols-12 gap-x-10 gap-y-10">
        <Section
          className="col-span-12 @min-[64rem]/content:col-span-7"
          title={t.analytics.rankingTitle(metricLabel(metric))}
          description={canDrill ? t.analytics.rankingDrillHint : `${t.analytics.rankingCount(ranking.length)} · ${rangeText}`}
        >
          <RankingBars series={ranking} metric={metric} selected={drill?.split === query.split ? drill.key : null} onSelect={canDrill ? select : undefined} restFrom={restFrom} />
        </Section>
        <Section
          className="col-span-12 @min-[64rem]/content:col-span-5"
          title={t.analytics.whenTitle}
          description={`${t.analytics.heatDesc(t.analytics.heatUnits[heatMetric])}${heatMetric !== metric ? t.analytics.heatNoPerHour(metricLabel(metric)) : ''}`}
        >
          <Heatmap cells={heatCells} format={(v) => formatHeat(heatMetric, v, t)} />
        </Section>
      </div>
    </>
  )
}

function DrillChip(): React.JSX.Element | null {
  const t = useT().usage.analytics
  const drill = useAnalytics((s) => s.drill)
  const clearDrill = useAnalytics((s) => s.clearDrill)
  if (!drill) return null
  return (
    <button
      type="button"
      onClick={clearDrill}
      className="inline-flex h-8 max-w-64 items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft pr-2 pl-3 text-xs font-[560] text-accent-text transition-colors duration-150 hover:border-accent/70 hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
      title={t.clearFilter}
    >
      <span className="truncate">{t.filterChip(drill.label)}</span>
      <X className="size-3.5 shrink-0" aria-hidden strokeWidth={2.25} />
      <span className="sr-only">{t.clearSr}</span>
    </button>
  )
}

function isEmpty(result: AnalyticsResult): boolean {
  return result.totals.tokens === 0 && result.totals.prompts === 0 && result.totals.sessions === 0
}

function Body(): React.JSX.Element {
  const messages = useT()
  const t = messages.usage
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
          {t.analytics.reloadFailed} {error}{' '}
          <button type="button" className="font-[600] underline underline-offset-2" onClick={() => void load()}>
            {messages.common.retry}
          </button>
        </p>
      ) : null}
      <MetricTiles result={result} range={query.range} metric={metric} onSelect={setMetric} />
      {noneSelected ? (
        <EmptyState icon={FolderX} title={t.analytics.noProjectTitle} action={<Button size="sm" onClick={() => setExcluded([])}>{t.analytics.showAllProjects}</Button>}>
          {t.analytics.noProjectBody}
        </EmptyState>
      ) : isEmpty(result) ? (
        <EmptyState icon={ChartArea} title={t.analytics.noDataTitle}>
          {query.host === 'all' ? t.analytics.noDataAll : t.analytics.noDataHost(hostLabel(query.host))}
        </EmptyState>
      ) : (
        <Charts result={result} query={query} />
      )}
      <Section title={t.lastSessions} description={query.host === 'all' && query.projects === null && query.excludedProjects.length === 0 && query.models === null ? undefined : t.analytics.sessionsFilterDesc}>
        {visibleSessions.length ? (
          <SessionTable sessions={visibleSessions} favorites={favorites} now={now} />
        ) : (
          <p className="py-4 text-[0.8125rem] text-ink-3">{sessions?.length ? t.analytics.noSessionsMatch : t.noSessionsYet}</p>
        )}
      </Section>
    </div>
  )
}

/** Analyse des Verbrauchs: Filter links, Kennzahlen und drei verknüpfte Diagramme rechts. */
function AnalysisPage(): React.JSX.Element {
  const t = useT().usage
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
        title={t.analytics.title}
        actions={
          <>
            <DrillChip />
            <AnalyticsTabs />
            <Button icon={RefreshCw} onClick={() => void refresh()} loading={refreshing}>
              {t.refresh}
            </Button>
          </>
        }
      >
        {dataSince !== null ? t.analytics.sinceDate(formatDateMedium(dataSince)) : t.analytics.overTime}
        {query.host !== 'all' ? t.analytics.onlyHost(hostLabel(query.host)) : ''}
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
