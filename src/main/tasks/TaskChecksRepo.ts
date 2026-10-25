import type Database from 'better-sqlite3'

/** Merkt, welche Aufgaben aus Protokollen in der App abgehakt wurden. */
export class TaskChecksRepo {
  constructor(private readonly db: Database.Database) {}

  check(groupId: string, key: string, at: number = Date.now()): void {
    this.db.prepare('INSERT OR REPLACE INTO task_checks (group_id, task_key, checked_at) VALUES (?, ?, ?)').run(groupId, key, at)
  }

  uncheck(groupId: string, key: string): void {
    this.db.prepare('DELETE FROM task_checks WHERE group_id = ? AND task_key = ?').run(groupId, key)
  }

  checked(groupId: string): Set<string> {
    const rows = this.db.prepare('SELECT task_key FROM task_checks WHERE group_id = ?').all(groupId) as { task_key: string }[]
    return new Set(rows.map((r) => r.task_key))
  }
}
