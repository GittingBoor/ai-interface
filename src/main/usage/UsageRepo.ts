import type Database from 'better-sqlite3'
import type {
  DailyUsage,
  HeatmapCell,
  HostId,
  ModelUsage,
  PriceTable,
  ProjectUsage,
  PromptRecord,
  SessionSummary,
  TokenCounts,
  UsageRecord,
  UsageTotals
} from '@shared/types'
import { estimateCostUsd } from './pricing'
import { type ActivityRow, computeSessions } from './sessions'

interface TokenRow {
  readonly model: string
  readonly input: number
  readonly output: number
  readonly cache_creation: number
  readonly cache_read: number
}

interface MessageRow extends TokenRow {
  readonly message_id: string
  readonly session_id: string
  readonly host: HostId
  readonly project: string
  readonly ts: number
}

const SUM_COLUMNS = 'SUM(input) AS input, SUM(output) AS output, SUM(cache_creation) AS cache_creation, SUM(cache_read) AS cache_read'
const LOCAL_TIME = "ts / 1000, 'unixepoch', 'localtime'"
/** SQL-Bedingung: Zeile gehört nicht zu einem gerade privaten Projekt. */
const VISIBLE = 'NOT is_hidden(host, project)'

const tokensOf = (r: TokenRow): TokenCounts => ({
  inputTokens: r.input,
  outputTokens: r.output,
  cacheCreationTokens: r.cache_creation,
  cacheReadTokens: r.cache_read
})

const totalOf = (r: TokenRow): number => r.input + r.output + r.cache_creation + r.cache_read

const toRecord = (r: MessageRow): UsageRecord => ({
  messageId: r.message_id,
  sessionId: r.session_id,
  host: r.host,
  project: r.project,
  model: r.model,
  timestamp: r.ts,
  ...tokensOf(r)
})

/** Speichert Claude-Nachrichten (dedupliziert) und liefert Auswertungen. */
export class UsageRepo {
  constructor(
    private readonly db: Database.Database,
    private readonly prices: () => PriceTable,
    isHidden: (host: HostId, project: string) => boolean = () => false
  ) {
    // Nicht deterministisch: das Ergebnis hängt vom Sperrzustand des Privatmodus ab.
    db.function('is_hidden', { deterministic: false }, (host: unknown, project: unknown) => (isHidden(host as HostId, String(project)) ? 1 : 0))
  }

  insertMany(records: readonly UsageRecord[]): number {
    const stmt = this.db.prepare(
      `INSERT OR IGNORE INTO usage_messages
       (message_id, session_id, host, project, model, ts, input, output, cache_creation, cache_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    return this.db.transaction((rows: readonly UsageRecord[]) =>
      rows.reduce(
        (n, r) =>
          n +
          stmt.run(r.messageId, r.sessionId, r.host, r.project, r.model, r.timestamp, r.inputTokens, r.outputTokens, r.cacheCreationTokens, r.cacheReadTokens)
            .changes,
        0
      )
    )(records)
  }

  insertPrompts(prompts: readonly PromptRecord[]): number {
    const stmt = this.db.prepare(
      'INSERT OR IGNORE INTO usage_prompts (uuid, session_id, host, project, ts, chars) VALUES (?, ?, ?, ?, ?, ?)'
    )
    return this.db.transaction((rows: readonly PromptRecord[]) =>
      rows.reduce((n, p) => n + stmt.run(p.uuid, p.sessionId, p.host, p.project, p.timestamp, p.chars).changes, 0)
    )(prompts)
  }

  getOffset(host: HostId, path: string): number {
    const row = this.db.prepare('SELECT offset FROM file_offsets WHERE host = ? AND path = ?').get(host, path) as
      | { offset: number }
      | undefined
    return row?.offset ?? 0
  }

  setOffset(host: HostId, path: string, offset: number): void {
    this.db
      .prepare('INSERT INTO file_offsets (host, path, offset) VALUES (?, ?, ?) ON CONFLICT(host, path) DO UPDATE SET offset = excluded.offset')
      .run(host, path, offset)
  }

  totals(sinceMs: number): UsageTotals {
    const rows = this.db
      .prepare(`SELECT model, COUNT(*) AS messages, ${SUM_COLUMNS} FROM usage_messages WHERE ts >= ? AND ${VISIBLE} GROUP BY model`)
      .all(sinceMs) as (TokenRow & { messages: number })[]
    const tokens = { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 }
    let costUsd = 0
    let messages = 0
    let hasUnpriced = false
    for (const r of rows) {
      tokens.inputTokens += r.input
      tokens.outputTokens += r.output
      tokens.cacheCreationTokens += r.cache_creation
      tokens.cacheReadTokens += r.cache_read
      messages += r.messages
      const cost = this.cost(r)
      if (cost === null) hasUnpriced = true
      else costUsd += cost
    }
    const totalTokens = tokens.inputTokens + tokens.outputTokens + tokens.cacheCreationTokens + tokens.cacheReadTokens
    return { tokens, totalTokens, messages, costUsd, hasUnpriced }
  }

  daily(sinceMs: number): DailyUsage[] {
    const rows = this.db
      .prepare(
        `SELECT date(${LOCAL_TIME}) AS day, host, model, ${SUM_COLUMNS}
         FROM usage_messages WHERE ts >= ? AND ${VISIBLE} GROUP BY day, host, model ORDER BY day, host`
      )
      .all(sinceMs) as (TokenRow & { day: string; host: HostId })[]
    const byKey = new Map<string, { day: string; host: HostId; totalTokens: number; costUsd: number }>()
    for (const r of rows) {
      const key = `${r.day}|${r.host}`
      const entry = byKey.get(key) ?? { day: r.day, host: r.host, totalTokens: 0, costUsd: 0 }
      entry.totalTokens += totalOf(r)
      entry.costUsd += this.cost(r) ?? 0
      byKey.set(key, entry)
    }
    return [...byKey.values()]
  }

  byProject(sinceMs: number): ProjectUsage[] {
    const rows = this.db
      .prepare(
        `SELECT project, host, model, COUNT(*) AS messages, COUNT(DISTINCT session_id) AS sessions, MAX(ts) AS last, ${SUM_COLUMNS}
         FROM usage_messages WHERE ts >= ? AND ${VISIBLE} GROUP BY project, host, model`
      )
      .all(sinceMs) as (TokenRow & { project: string; host: HostId; messages: number; sessions: number; last: number })[]
    const sessionCounts = this.db
      .prepare(`SELECT project, host, COUNT(DISTINCT session_id) AS n FROM usage_messages WHERE ts >= ? AND ${VISIBLE} GROUP BY project, host`)
      .all(sinceMs) as { project: string; host: HostId; n: number }[]
    const byKey = new Map<string, ProjectUsage>()
    for (const r of rows) {
      const key = `${r.host}|${r.project}`
      const prev = byKey.get(key)
      const sessions = sessionCounts.find((s) => s.project === r.project && s.host === r.host)?.n ?? 0
      byKey.set(key, {
        project: r.project,
        host: r.host,
        sessions,
        totalTokens: (prev?.totalTokens ?? 0) + totalOf(r),
        costUsd: (prev?.costUsd ?? 0) + (this.cost(r) ?? 0),
        messages: (prev?.messages ?? 0) + r.messages,
        lastActive: Math.max(prev?.lastActive ?? 0, r.last)
      })
    }
    return [...byKey.values()].sort((a, b) => b.lastActive - a.lastActive)
  }

  /** Zeitpunkte je Session und Projekt für die Arbeitszeit. */
  activityRows(sinceMs: number): ActivityRow[] {
    return (
      this.db.prepare(`SELECT session_id, project, host, ts FROM usage_messages WHERE ts >= ? AND ${VISIBLE}`).all(sinceMs) as {
        session_id: string
        project: string
        host: HostId
        ts: number
      }[]
    ).map((r) => ({ sessionId: r.session_id, project: r.project, host: r.host, ts: r.ts }))
  }

  byModel(sinceMs: number): ModelUsage[] {
    const rows = this.db
      .prepare(`SELECT model, COUNT(*) AS messages, MAX(ts) AS last, ${SUM_COLUMNS} FROM usage_messages WHERE ts >= ? AND ${VISIBLE} GROUP BY model`)
      .all(sinceMs) as (TokenRow & { messages: number; last: number })[]
    return rows
      .map((r) => ({ model: r.model, totalTokens: totalOf(r), outputTokens: r.output, costUsd: this.cost(r), messages: r.messages, lastUsed: r.last }))
      .sort((a, b) => b.totalTokens - a.totalTokens)
  }

  heatmap(sinceMs: number): HeatmapCell[] {
    const rows = this.db
      .prepare(
        `SELECT CAST(strftime('%w', ${LOCAL_TIME}) AS INTEGER) AS dow, CAST(strftime('%H', ${LOCAL_TIME}) AS INTEGER) AS hour, ${SUM_COLUMNS}
         FROM usage_messages WHERE ts >= ? AND ${VISIBLE} GROUP BY dow, hour`
      )
      .all(sinceMs) as (Omit<TokenRow, 'model'> & { dow: number; hour: number })[]
    return rows.map((r) => ({ weekday: (r.dow + 6) % 7, hour: r.hour, totalTokens: totalOf({ ...r, model: '' }) }))
  }

  sessions(limit: number, project?: string): SessionSummary[] {
    const filter = project === undefined ? `WHERE ${VISIBLE}` : `WHERE ${VISIBLE} AND project = ?`
    const params: unknown[] = project === undefined ? [limit] : [project, limit]
    const ids = this.db
      .prepare(`SELECT session_id FROM usage_messages ${filter} GROUP BY session_id ORDER BY MAX(ts) DESC LIMIT ?`)
      .all(...params) as { session_id: string }[]
    if (ids.length === 0) return []
    const placeholders = ids.map(() => '?').join(',')
    const rows = this.db
      .prepare(`SELECT * FROM usage_messages WHERE session_id IN (${placeholders}) AND ${VISIBLE}`)
      .all(...ids.map((i) => i.session_id)) as MessageRow[]
    const records = rows.map(toRecord)
    return computeSessions(records).map((s) => ({
      ...s,
      costUsd: records
        .filter((r) => r.sessionId === s.sessionId)
        .reduce<number | null>((sum, r) => {
          const c = estimateCostUsd(r.model, r, this.prices())
          return c === null ? sum : (sum ?? 0) + c
        }, null)
    }))
  }

  private cost(row: TokenRow): number | null {
    return estimateCostUsd(row.model, tokensOf(row), this.prices())
  }
}
