import type { SessionSummary, UsageRecord } from '@shared/types'

/** Pausen ab dieser Länge zählen nicht als aktive Arbeitszeit. */
export const ACTIVE_GAP_MS = 15 * 60 * 1000

export const totalTokensOf = (r: UsageRecord): number =>
  r.inputTokens + r.outputTokens + r.cacheCreationTokens + r.cacheReadTokens

export interface ActivityRow {
  readonly sessionId: string
  readonly project: string
  readonly host: SessionSummary['host']
  readonly ts: number
}

/**
 * Aktive Zeit je `host|projekt`: Innerhalb einer Session zählt der Abstand zum vorigen Eintrag
 * (unter `ACTIVE_GAP_MS`) zum Projekt des späteren Eintrags.
 */
export function activeMsByProject(rows: readonly ActivityRow[]): Map<string, number> {
  const bySession = new Map<string, ActivityRow[]>()
  for (const row of rows) {
    const list = bySession.get(row.sessionId)
    if (list) list.push(row)
    else bySession.set(row.sessionId, [row])
  }
  const result = new Map<string, number>()
  for (const list of bySession.values()) {
    list.sort((a, b) => a.ts - b.ts)
    for (let i = 0; i < list.length; i++) {
      const row = list[i] as ActivityRow
      const key = `${row.host}|${row.project}`
      const previous = list[i - 1]
      const gap = previous ? row.ts - previous.ts : 0
      result.set(key, (result.get(key) ?? 0) + (gap < ACTIVE_GAP_MS ? gap : 0))
    }
  }
  return result
}

function dedupe(records: readonly UsageRecord[]): UsageRecord[] {
  const seen = new Map<string, UsageRecord>()
  for (const r of records) if (!seen.has(r.messageId)) seen.set(r.messageId, r)
  return [...seen.values()]
}

function summarize(sessionId: string, records: UsageRecord[]): SessionSummary {
  records.sort((a, b) => a.timestamp - b.timestamp)
  let activeMs = 0
  for (let i = 1; i < records.length; i++) {
    const gap = (records[i]?.timestamp ?? 0) - (records[i - 1]?.timestamp ?? 0)
    if (gap < ACTIVE_GAP_MS) activeMs += gap
  }
  const first = records[0]
  const last = records[records.length - 1]
  if (!first || !last) throw new Error(`Session ${sessionId} ohne Einträge`)
  return {
    sessionId,
    host: last.host,
    project: last.project,
    models: [...new Set(records.map((r) => r.model))],
    startedAt: first.timestamp,
    endedAt: last.timestamp,
    activeMs,
    messages: records.length,
    totalTokens: records.reduce((sum, r) => sum + totalTokensOf(r), 0),
    costUsd: null
  }
}

/** Fasst Nachrichten zu Sessions zusammen, neueste zuerst. */
export function computeSessions(records: readonly UsageRecord[]): SessionSummary[] {
  const bySession = new Map<string, UsageRecord[]>()
  for (const r of dedupe(records)) {
    const list = bySession.get(r.sessionId) ?? []
    list.push(r)
    bySession.set(r.sessionId, list)
  }
  return [...bySession.entries()].map(([id, list]) => summarize(id, list)).sort((a, b) => b.endedAt - a.endedAt)
}
