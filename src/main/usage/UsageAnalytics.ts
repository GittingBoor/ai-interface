import type Database from 'better-sqlite3'
import type {
  AnalyticsHeatCell,
  AnalyticsMetric,
  AnalyticsQuery,
  AnalyticsResult,
  AnalyticsSeries,
  HostId,
  MetricValues,
  PriceTable
} from '@shared/types'
import { bucketList, bucketStart, formatBucket, previousStart, rangeStart } from '@shared/buckets'
import { estimateCostUsd } from './pricing'
import { ACTIVE_GAP_MS } from './sessions'

const HOUR_MS = 3_600_000
const METRICS: readonly AnalyticsMetric[] = ['tokens', 'cost', 'hours', 'prompts', 'sessions']
const NO_MODEL = 'unbekannt'
const ALL_KEY = 'all'
/** SQL-Bedingung: Zeile gehört nicht zu einem gerade privaten Projekt (`is_hidden` registriert `UsageRepo`). */
const VISIBLE = 'NOT is_hidden(host, project)'

interface MessageRow {
  readonly ts: number
  readonly session_id: string
  readonly host: HostId
  readonly project: string
  readonly model: string
  readonly input: number
  readonly output: number
  readonly cache_creation: number
  readonly cache_read: number
}

interface PromptRow {
  readonly ts: number
  readonly session_id: string
  readonly host: HostId
  readonly project: string
}

/** Summen einer Kennzahl-Gruppe (Serie, Zeiteinheit, Gesamt). */
class Acc {
  tokens = 0
  cost = 0
  activeMs = 0
  prompts = 0
  readonly sessions = new Set<string>()

  values(): MetricValues {
    return { tokens: this.tokens, cost: this.cost, hours: this.activeMs / HOUR_MS, prompts: this.prompts, sessions: this.sessions.size }
  }
}

class SeriesAcc {
  readonly total = new Acc()
  readonly buckets: Acc[]

  constructor(
    readonly key: string,
    readonly host: HostId | null,
    size: number
  ) {
    this.buckets = Array.from({ length: size }, () => new Acc())
  }

  toSeries(): AnalyticsSeries {
    const perBucket = this.buckets.map((b) => b.values())
    const values = Object.fromEntries(METRICS.map((m) => [m, perBucket.map((v) => v[m])])) as Record<AnalyticsMetric, number[]>
    return { key: this.key, host: this.host, values, totals: this.total.values() }
  }
}

/** Kennzahlen je Zeiteinheit und Serie für die Auswertung. */
export class UsageAnalytics {
  constructor(
    private readonly db: Database.Database,
    private readonly prices: () => PriceTable,
    private readonly now: () => number = Date.now
  ) {}

  query(q: AnalyticsQuery): AnalyticsResult {
    const now = this.now()
    const dataSince = this.dataSince()
    const start = rangeStart(q.range, now, dataSince)
    const prevStart = previousStart(q.range, start)
    const usePrevious = prevStart !== null && dataSince !== null && dataSince <= prevStart
    const loadFrom = (usePrevious ? prevStart : start) - ACTIVE_GAP_MS
    const bucketTimes = bucketList(start, now, q.resolution)
    const bucketIndex = new Map(bucketTimes.map((ts, i) => [ts, i]))
    const keep = this.filter(q)
    const allMessages = this.rows<MessageRow>(
      'SELECT ts, session_id, host, project, model, input, output, cache_creation, cache_read FROM usage_messages',
      loadFrom
    ).filter(keep)
    const sessionModel = new Map(allMessages.map((m) => [m.session_id, m.model]))
    const models = q.models === null ? null : new Set(q.models)
    const messages = models === null ? allMessages : allMessages.filter((m) => models.has(m.model))
    const prompts = this.rows<PromptRow>('SELECT ts, session_id, host, project FROM usage_prompts', loadFrom)
      .filter(keep)
      .filter((p) => models === null || models.has(sessionModel.get(p.session_id) ?? NO_MODEL))
    const prices = this.prices()
    const series = new Map<string, SeriesAcc>()
    const seriesOf = (host: HostId, project: string, model: string): SeriesAcc => {
      const key = q.split === 'project' ? `${host}|${project}` : q.split === 'host' ? host : q.split === 'model' ? model : ALL_KEY
      const seriesHost = q.split === 'project' || q.split === 'host' ? host : null
      let acc = series.get(key)
      if (!acc) series.set(key, (acc = new SeriesAcc(key, seriesHost, bucketTimes.length)))
      return acc
    }
    const total = new Acc()
    const previous = new Acc()
    const heat = new Map<string, { weekday: number; hour: number; tokens: number; activeMs: number; prompts: number }>()
    const heatOf = (ts: number): { tokens: number; activeMs: number; prompts: number } => {
      const d = new Date(ts)
      const weekday = (d.getDay() + 6) % 7
      const key = `${weekday}|${d.getHours()}`
      let cell = heat.get(key)
      if (!cell) heat.set(key, (cell = { weekday, hour: d.getHours(), tokens: 0, activeMs: 0, prompts: 0 }))
      return cell
    }
    let hasUnpriced = false

    const lastBySession = new Map<string, number>()
    for (const m of messages) {
      const last = lastBySession.get(m.session_id)
      lastBySession.set(m.session_id, m.ts)
      const gap = last === undefined ? 0 : m.ts - last
      const activeMs = gap < ACTIVE_GAP_MS ? gap : 0
      const tokens = m.input + m.output + m.cache_creation + m.cache_read
      const cost = estimateCostUsd(
        m.model,
        { inputTokens: m.input, outputTokens: m.output, cacheCreationTokens: m.cache_creation, cacheReadTokens: m.cache_read },
        prices
      )
      const targets = this.targetsOf(m.ts, start, prevStart, usePrevious, total, previous, () => {
        const s = seriesOf(m.host, m.project, m.model)
        return [s.total, s.buckets[bucketIndex.get(bucketStart(m.ts, q.resolution)) ?? -1]]
      })
      if (targets.length === 0) continue
      if (cost === null && m.ts >= start) hasUnpriced = true
      for (const acc of targets) {
        acc.tokens += tokens
        acc.cost += cost ?? 0
        acc.activeMs += activeMs
        acc.sessions.add(m.session_id)
      }
      if (m.ts >= start) {
        const cell = heatOf(m.ts)
        cell.tokens += tokens
        cell.activeMs += activeMs
      }
    }

    for (const p of prompts) {
      const targets = this.targetsOf(p.ts, start, prevStart, usePrevious, total, previous, () => {
        const s = seriesOf(p.host, p.project, sessionModel.get(p.session_id) ?? NO_MODEL)
        return [s.total, s.buckets[bucketIndex.get(bucketStart(p.ts, q.resolution)) ?? -1]]
      })
      for (const acc of targets) acc.prompts++
      if (p.ts >= start) heatOf(p.ts).prompts++
    }

    return {
      buckets: bucketTimes.map(formatBucket),
      series: [...series.values()].map((s) => s.toSeries()).sort((a, b) => b.totals.tokens - a.totals.tokens),
      totals: total.values(),
      previous: usePrevious ? previous.values() : null,
      heatmap: [...heat.values()].map(
        (c): AnalyticsHeatCell => ({ weekday: c.weekday, hour: c.hour, tokens: c.tokens, hours: c.activeMs / HOUR_MS, prompts: c.prompts })
      ),
      dataSince,
      hasUnpriced
    }
  }

  /** Summen, in die ein Eintrag zählt: aktueller Zeitraum (Gesamt, Serie, Zeiteinheit), Vorzeitraum oder keine. */
  private targetsOf(
    ts: number,
    start: number,
    prevStart: number | null,
    usePrevious: boolean,
    total: Acc,
    previous: Acc,
    seriesTargets: () => readonly (Acc | undefined)[]
  ): Acc[] {
    if (ts >= start) return [total, ...seriesTargets().filter((a): a is Acc => a !== undefined)]
    if (usePrevious && prevStart !== null && ts >= prevStart) return [previous]
    return []
  }

  private dataSince(): number | null {
    const row = this.db.prepare(`SELECT MIN(ts) AS since FROM usage_messages WHERE ${VISIBLE}`).get() as { since: number | null }
    return row.since
  }

  private rows<T>(select: string, from: number): T[] {
    return this.db.prepare(`${select} WHERE ts >= ? AND ${VISIBLE} ORDER BY ts`).all(from) as T[]
  }

  private filter(q: AnalyticsQuery): (row: { readonly host: HostId; readonly project: string }) => boolean {
    const projects = q.projects === null ? null : new Set(q.projects)
    const excluded = new Set(q.excludedProjects)
    return (row) => {
      const key = `${row.host}|${row.project}`
      return (q.host === 'all' || row.host === q.host) && (projects === null || projects.has(key)) && !excluded.has(key)
    }
  }
}
