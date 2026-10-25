import type Database from 'better-sqlite3'
import type { HostId, InterruptedRun } from '@shared/types'
import type { RunEvents } from './extractRunEvents'

interface Row {
  readonly host: HostId
  readonly session_id: string
  readonly project: string
  readonly hit_at: number
  readonly message: string
  readonly last_prompt: string | null
}

/** Abgebrochene Durchläufe: offen, bis eine spätere Antwort kommt oder der Nutzer sie abhakt. */
export class InterruptedRunsRepo {
  constructor(private readonly db: Database.Database) {}

  apply(host: HostId, events: RunEvents): void {
    const prompt = this.db.prepare(
      `INSERT INTO session_prompts (host, session_id, text, ts) VALUES (?, ?, ?, ?)
       ON CONFLICT(host, session_id) DO UPDATE SET text = excluded.text, ts = excluded.ts WHERE excluded.ts >= session_prompts.ts`
    )
    // Ein neuer Treffer öffnet den Eintrag wieder (auch nach „Erledigt“), ein älterer ändert nichts.
    const hit = this.db.prepare(
      `INSERT INTO interrupted_runs (host, session_id, project, hit_at, message) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(host, session_id) DO UPDATE SET project = excluded.project, hit_at = excluded.hit_at, message = excluded.message,
         resolved_at = NULL, dismissed_at = NULL
       WHERE excluded.hit_at > interrupted_runs.hit_at`
    )
    const answer = this.db.prepare('UPDATE interrupted_runs SET resolved_at = ? WHERE host = ? AND session_id = ? AND resolved_at IS NULL AND hit_at < ?')
    this.db.transaction(() => {
      for (const p of events.prompts) prompt.run(host, p.sessionId, p.text, p.timestamp)
      for (const i of events.interruptions) hit.run(host, i.sessionId, i.project, i.timestamp, i.message)
      for (const a of events.answers) answer.run(a.timestamp, host, a.sessionId, a.timestamp)
    })()
  }

  open(): InterruptedRun[] {
    const rows = this.db
      .prepare(
        `SELECT r.host, r.session_id, r.project, r.hit_at, r.message, p.text AS last_prompt
         FROM interrupted_runs r LEFT JOIN session_prompts p ON p.host = r.host AND p.session_id = r.session_id
         WHERE r.resolved_at IS NULL AND r.dismissed_at IS NULL ORDER BY r.hit_at DESC`
      )
      .all() as Row[]
    return rows.map((r) => ({ host: r.host, sessionId: r.session_id, project: r.project, hitAt: r.hit_at, message: r.message, lastPrompt: r.last_prompt }))
  }

  dismiss(host: HostId, sessionId: string): void {
    this.db.prepare('UPDATE interrupted_runs SET dismissed_at = ? WHERE host = ? AND session_id = ?').run(Date.now(), host, sessionId)
  }
}
