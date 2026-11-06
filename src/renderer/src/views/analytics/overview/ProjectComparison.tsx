import { useEffect, useMemo, useState } from 'react'
import { ChartNoAxesColumn } from 'lucide-react'
import type { BreakdownRange, HostFilter, ProjectActivity } from '@shared/types'
import { api } from '@renderer/api/client'
import { errorMessage, unwrap } from '@renderer/api/call'
import { Section } from '@renderer/components/Section'
import { Segmented } from '@renderer/components/Controls'
import { EmptyState, ErrorState, Skeleton } from '@renderer/components/States'
import { PairedBars, PairedLegend } from '@renderer/components/charts/PairedBars'
import { ShareDonut } from '@renderer/components/charts/ShareDonut'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useUsage } from '@renderer/stores/usageStore'
import { aggregateActivity, measureLabel, topWithRest, type ComparisonMetric } from '@renderer/lib/projectActivity'
import { hostLabel, hostOptions } from '@renderer/lib/hosts'
import { useLocale, useT } from '@renderer/i18n/useT'

const BAR_LIMIT = 10
const SHARE_LIMIT = 7

type ShareBasis = 'time' | 'metric'

interface Breakdown {
  readonly rows: readonly ProjectActivity[] | null
  readonly error: string | null
  readonly loading: boolean
  retry(): void
}

/** Lädt die Aufschlüsselung neu bei geändertem Filter und nach jeder Verbrauchsabfrage. */
function useBreakdown(range: BreakdownRange, host: HostFilter): Breakdown {
  const loadedAt = useUsage((s) => s.loadedAt)
  const [rows, setRows] = useState<readonly ProjectActivity[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    setLoading(true)
    unwrap(api.usage.projectBreakdown(range, host))
      .then((data) => {
        if (!current) return
        setRows(data)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (current) setError(errorMessage(cause))
      })
      .finally(() => {
        if (current) setLoading(false)
      })
    return () => {
      current = false
    }
  }, [range, host, loadedAt, attempt])

  return { rows, error, loading, retry: () => setAttempt((a) => a + 1) }
}

function ComparisonSkeleton(): React.JSX.Element {
  const t = useT().usage.overview.comparison
  return (
    <div className="grid grid-cols-12 gap-x-10" aria-busy="true" aria-label={t.loadingAria}>
      <Skeleton className="col-span-7 h-72" />
      <Skeleton className="col-span-5 h-56" />
    </div>
  )
}

export function ProjectComparison({ className = '' }: { readonly className?: string }): React.JSX.Element {
  const t = useT().usage.overview.comparison
  const locale = useLocale()
  const rangeOptions: readonly { readonly value: BreakdownRange; readonly label: string }[] = [
    { value: 'week', label: t.ranges.week },
    { value: 'month', label: t.ranges.month },
    { value: 'all', label: t.ranges.all }
  ]
  const metricOptions: readonly { readonly value: ComparisonMetric; readonly label: string }[] = [
    { value: 'tokens', label: measureLabel('tokens') },
    { value: 'cost', label: measureLabel('cost') }
  ]
  const favorites = useFavorites((s) => s.favorites)
  const [range, setRange] = useState<BreakdownRange>('week')
  const [host, setHost] = useState<HostFilter>('all')
  const [metric, setMetric] = useState<ComparisonMetric>('tokens')
  const [basis, setBasis] = useState<ShareBasis>('time')
  const { rows, error, loading, retry } = useBreakdown(range, host)

  const groups = useMemo(() => (rows ? aggregateActivity(favorites, rows) : []), [favorites, rows, locale])
  const shareMeasure = basis === 'time' ? 'time' : metric
  const bars = useMemo(() => topWithRest(groups, metric, BAR_LIMIT), [groups, metric])
  const shares = useMemo(() => topWithRest(groups, shareMeasure, SHARE_LIMIT), [groups, shareMeasure])

  return (
    <Section
      className={className}
      title={t.title}
      description={t.desc}
      actions={
        <span className="flex flex-wrap justify-end gap-2">
          <Segmented<BreakdownRange> label={t.rangeLabel} value={range} options={rangeOptions} onChange={setRange} />
          <Segmented<HostFilter> label={t.hostLabel} value={host} options={[{ value: 'all', label: t.all }, ...hostOptions()]} onChange={setHost} />
          <Segmented<ComparisonMetric> label={t.metricLabel} value={metric} options={metricOptions} onChange={setMetric} />
        </span>
      }
    >
      {error && rows ? <p role="alert" className="mb-3 text-xs text-danger-ink">{t.reloadFailed(error)}</p> : null}
      {error && !rows ? <ErrorState message={error} onRetry={retry} /> : null}
      {!rows && !error ? <ComparisonSkeleton /> : null}
      {rows && !groups.length ? (
        <EmptyState icon={ChartNoAxesColumn} title={t.emptyTitle} compact>
          {t.emptyBody(host === 'all' ? t.anyHost : hostLabel(host), t.rangeText[range])}
        </EmptyState>
      ) : null}
      {rows && groups.length ? (
        <div className={`grid grid-cols-12 gap-x-10 gap-y-8 transition-opacity duration-200 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <div className="col-span-12 min-w-0 xl:col-span-7">
            <div className="mb-3 flex items-center justify-between gap-4 px-2">
              <h3 className="text-xs font-[600] text-ink-2">{t.top(BAR_LIMIT, measureLabel(metric))}</h3>
              <PairedLegend metric={metric} />
            </div>
            <PairedBars key={`${range}-${host}-${metric}`} groups={bars} metric={metric} />
          </div>
          <div className="col-span-12 min-w-0 xl:col-span-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-xs font-[600] text-ink-2">{t.share}</h3>
              <Segmented<ShareBasis>
                label={t.shareBy}
                value={basis}
                options={[
                  { value: 'time', label: measureLabel('time') },
                  { value: 'metric', label: measureLabel(metric) }
                ]}
                onChange={setBasis}
              />
            </div>
            <ShareDonut key={`${range}-${host}-${shareMeasure}`} groups={shares} measure={shareMeasure} />
          </div>
        </div>
      ) : null}
    </Section>
  )
}
