/** Beispieldaten der Auswertung für den Browser-Modus: gut ein Jahr Verlauf je Projekt, stabil durch festen Seed. */
import { bucketList, bucketStart, formatBucket, previousStart, rangeStart } from '@shared/buckets'
import type { AnalyticsMetric, AnalyticsQuery, AnalyticsResult, AnalyticsSeries, HostId, MetricValues } from '@shared/types'
import { MOCK_HEATMAP, PROJECT_SEEDS, SeededRandom } from './mockData'

const HISTORY_DAYS = 420
const SEED = 20261019
const DAY_MS = 86_400_000
const METRICS: readonly AnalyticsMetric[] = ['tokens', 'cost', 'hours', 'prompts', 'sessions']
const MODELS: readonly { readonly name: string; readonly share: number }[] = [
  { name: 'claude-opus-5-5', share: 0.7 },
  { name: 'claude-sonnet-5', share: 0.22 },
  { name: 'claude-haiku-4-5', share: 0.08 }
]
const USD_PER_MTOK = 0.6
const TOKENS_PER_HOUR = 4_500_000
const TOKENS_PER_PROMPT = 380_000

interface DayRow {
  readonly ts: number
  readonly host: HostId
  readonly project: string
  readonly tokens: number
}

function buildRows(): DayRow[] {
  const r = new SeededRandom(SEED)
  const today = bucketStart(Date.now(), 'day')
  const rows: DayRow[] = []
  PROJECT_SEEDS.forEach((seed, i) => {
    const startOffset = Math.round(HISTORY_DAYS * r.between(0.2, 1))
    for (let offset = startOffset; offset >= 0; offset--) {
      if (r.next() < 0.45) continue
      const ts = today - offset * DAY_MS + 12 * 3_600_000
      const wave = 0.6 + Math.sin(offset / (18 + i * 3)) * 0.4
      rows.push({ ts, host: seed.host, project: seed.path, tokens: Math.round(seed.weight * wave * r.between(4, 30) * 1_000_000) })
    }
  })
  return rows
}

const ROWS = buildRows()

const empty = (): Record<AnalyticsMetric, number> => ({ tokens: 0, cost: 0, hours: 0, prompts: 0, sessions: 0 })

function add(target: Record<AnalyticsMetric, number>, tokens: number): void {
  target.tokens += tokens
  target.cost += (tokens / 1_000_000) * USD_PER_MTOK
  target.hours += tokens / TOKENS_PER_HOUR
  target.prompts += Math.round(tokens / TOKENS_PER_PROMPT)
  target.sessions += Math.max(1, Math.round(tokens / 9_000_000))
}

function keyOf(q: AnalyticsQuery, row: DayRow, model: string): string {
  if (q.split === 'project') return `${row.host}|${row.project}`
  if (q.split === 'host') return row.host
  return q.split === 'model' ? model : 'all'
}

export function mockAnalytics(q: AnalyticsQuery): AnalyticsResult {
  const now = Date.now()
  const visible = ROWS.filter((row) => {
    const key = `${row.host}|${row.project}`
    return (q.host === 'all' || row.host === q.host) && (q.projects === null || q.projects.includes(key)) && !q.excludedProjects.includes(key)
  })
  const dataSince = ROWS.reduce<number | null>((min, row) => (min === null || row.ts < min ? row.ts : min), null)
  const start = rangeStart(q.range, now, dataSince)
  const prevStart = previousStart(q.range, start)
  const buckets = bucketList(start, now, q.resolution)
  const index = new Map(buckets.map((ts, i) => [ts, i]))
  const series = new Map<string, { host: HostId | null; values: Record<AnalyticsMetric, number>[]; totals: Record<AnalyticsMetric, number> }>()
  const totals = empty()
  const previous = empty()
  for (const row of visible) {
    const models = q.split === 'model' || q.models !== null ? MODELS.filter((m) => q.models === null || q.models.includes(m.name)) : [{ name: '', share: 1 }]
    for (const model of models) {
      const tokens = row.tokens * model.share
      if (row.ts < start) {
        if (prevStart !== null && row.ts >= prevStart) add(previous, tokens)
        continue
      }
      const key = keyOf(q, row, model.name)
      const entry = series.get(key) ?? { host: q.split === 'project' || q.split === 'host' ? row.host : null, values: buckets.map(empty), totals: empty() }
      series.set(key, entry)
      const bucket = entry.values[index.get(bucketStart(row.ts, q.resolution)) ?? -1]
      if (bucket) add(bucket, tokens)
      add(entry.totals, tokens)
      add(totals, tokens)
    }
  }
  const toSeries = ([key, s]: [string, { host: HostId | null; values: Record<AnalyticsMetric, number>[]; totals: MetricValues }]): AnalyticsSeries => ({
    key,
    host: s.host,
    values: Object.fromEntries(METRICS.map((m) => [m, s.values.map((v) => v[m])])) as Record<AnalyticsMetric, number[]>,
    totals: s.totals
  })
  const heatTotal = MOCK_HEATMAP.reduce((sum, c) => sum + c.totalTokens, 0) || 1
  return {
    buckets: buckets.map(formatBucket),
    series: [...series.entries()].map(toSeries).sort((a, b) => b.totals.tokens - a.totals.tokens),
    totals,
    previous: prevStart !== null && dataSince !== null && dataSince <= prevStart ? previous : null,
    heatmap: MOCK_HEATMAP.map((c) => {
      const share = (c.totalTokens / heatTotal) * totals.tokens
      return { weekday: c.weekday, hour: c.hour, tokens: share, hours: share / TOKENS_PER_HOUR, prompts: Math.round(share / TOKENS_PER_PROMPT) }
    }),
    dataSince,
    hasUnpriced: false
  }
}
