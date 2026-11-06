import type Database from 'better-sqlite3'
import type { Automation, AutomationInput, AutomationPermission, AutomationRun, AutomationRunStatus, AutomationSchedule, AutomationTrigger } from '@shared/automations'
import type { HostId } from '@shared/types'
import { NotFoundError } from '../errors'
import { mainT } from '../i18n'

/** Gespeicherte Antwort je Lauf (Zeichen). */
export const MAX_RESULT_CHARS = 20_000
/** Läufe, die je Automatisierung im Verlauf bleiben. */
export const KEEP_RUNS = 50

interface Row {
  readonly id: number
  readonly name: string
  readonly agent: string | null
  readonly host: HostId
  readonly cwd: string
  readonly prompt: string
  readonly schedule: string
  readonly permission: AutomationPermission
  readonly model: string | null
  readonly timeout_minutes: number
  readonly notify: number
  readonly enabled: number
  readonly next_run_at: number | null
  readonly created_at: number
}

interface RunRow {
  readonly id: number
  readonly automation_id: number
  readonly trigger: AutomationTrigger
  readonly status: AutomationRunStatus
  readonly started_at: number
  readonly finished_at: number | null
  readonly result: string
  readonly error: string | null
  readonly session_id: string | null
  readonly cost_usd: number | null
  readonly turns: number | null
}

export interface RunFinish {
  readonly status: Exclude<AutomationRunStatus, 'running'>
  readonly result: string
  readonly error: string | null
  readonly sessionId: string | null
  readonly costUsd: number | null
  readonly turns: number | null
}

const toRun = (r: RunRow): AutomationRun => ({
  id: r.id,
  automationId: r.automation_id,
  trigger: r.trigger,
  status: r.status,
  startedAt: r.started_at,
  finishedAt: r.finished_at,
  result: r.result,
  error: r.error,
  sessionId: r.session_id,
  costUsd: r.cost_usd,
  turns: r.turns
})

/** Automatisierungen und ihre Läufe in SQLite. */
export class AutomationRepo {
  constructor(private readonly db: Database.Database) {}

  list(): Automation[] {
    const rows = this.db.prepare('SELECT * FROM automations ORDER BY created_at').all() as Row[]
    return rows.map((r) => this.toAutomation(r))
  }

  get(id: number): Automation {
    const row = this.db.prepare('SELECT * FROM automations WHERE id = ?').get(id) as Row | undefined
    if (!row) throw new NotFoundError(mainT().automations.run.notFound(id), mainT().automations.run.reloadHint)
    return this.toAutomation(row)
  }

  create(input: AutomationInput, nextRunAt: number | null, now: number): Automation {
    const info = this.db
      .prepare(
        `INSERT INTO automations (name, agent, host, cwd, prompt, schedule, permission, model, timeout_minutes, notify, enabled, next_run_at, created_at)
         VALUES (@name, @agent, @host, @cwd, @prompt, @schedule, @permission, @model, @timeout, @notify, @enabled, @next, @now)`
      )
      .run({ ...this.params(input), next: nextRunAt, now })
    return this.get(Number(info.lastInsertRowid))
  }

  update(id: number, input: AutomationInput, nextRunAt: number | null): Automation {
    const info = this.db
      .prepare(
        `UPDATE automations SET name = @name, agent = @agent, host = @host, cwd = @cwd, prompt = @prompt, schedule = @schedule,
         permission = @permission, model = @model, timeout_minutes = @timeout, notify = @notify, enabled = @enabled, next_run_at = @next WHERE id = @id`
      )
      .run({ ...this.params(input), next: nextRunAt, id })
    if (info.changes === 0) throw new NotFoundError(mainT().automations.run.notFound(id), mainT().automations.run.reloadHint)
    return this.get(id)
  }

  remove(id: number): void {
    this.db.prepare('DELETE FROM automations WHERE id = ?').run(id)
  }

  setNextRun(id: number, at: number | null): void {
    this.db.prepare('UPDATE automations SET next_run_at = ? WHERE id = ?').run(at, id)
  }

  runs(automationId: number, limit = KEEP_RUNS): AutomationRun[] {
    const rows = this.db.prepare('SELECT * FROM automation_runs WHERE automation_id = ? ORDER BY started_at DESC, id DESC LIMIT ?').all(automationId, limit) as RunRow[]
    return rows.map(toRun)
  }

  startRun(automationId: number, trigger: AutomationTrigger, now: number): number {
    const info = this.db.prepare("INSERT INTO automation_runs (automation_id, trigger, status, started_at) VALUES (?, ?, 'running', ?)").run(automationId, trigger, now)
    return Number(info.lastInsertRowid)
  }

  finishRun(runId: number, finish: RunFinish, now: number): void {
    this.db
      .prepare('UPDATE automation_runs SET status = ?, finished_at = ?, result = ?, error = ?, session_id = ?, cost_usd = ?, turns = ? WHERE id = ?')
      .run(finish.status, now, finish.result.slice(0, MAX_RESULT_CHARS), finish.error, finish.sessionId, finish.costUsd, finish.turns, runId)
    const row = this.db.prepare('SELECT automation_id FROM automation_runs WHERE id = ?').get(runId) as { automation_id: number } | undefined
    if (row) this.prune(row.automation_id)
  }

  /** Lauf, der gar nicht gestartet wurde (z. B. Kontingent fast voll). */
  recordSkipped(automationId: number, trigger: AutomationTrigger, reason: string, now: number): void {
    const runId = this.startRun(automationId, trigger, now)
    this.finishRun(runId, { status: 'skipped', result: reason, error: null, sessionId: null, costUsd: null, turns: null }, now)
  }

  /** Nach einem Absturz hängen gebliebene Läufe als Fehler abschließen. */
  failInterrupted(now: number): number {
    return this.db.prepare("UPDATE automation_runs SET status = 'error', finished_at = ?, error = ? WHERE status = 'running'").run(now, mainT().automations.run.interrupted).changes
  }

  private prune(automationId: number): void {
    this.db
      .prepare('DELETE FROM automation_runs WHERE automation_id = ? AND id NOT IN (SELECT id FROM automation_runs WHERE automation_id = ? ORDER BY started_at DESC, id DESC LIMIT ?)')
      .run(automationId, automationId, KEEP_RUNS)
  }

  private params(input: AutomationInput): Record<string, string | number | null> {
    return {
      name: input.name.trim(),
      agent: input.agent,
      host: input.host,
      cwd: input.cwd.trim(),
      prompt: input.prompt.trim(),
      schedule: JSON.stringify(input.schedule),
      permission: input.permission,
      model: input.model,
      timeout: input.timeoutMinutes,
      notify: input.notify ? 1 : 0,
      enabled: input.enabled ? 1 : 0
    }
  }

  private toAutomation(r: Row): Automation {
    const last = this.db.prepare('SELECT * FROM automation_runs WHERE automation_id = ? ORDER BY started_at DESC, id DESC LIMIT 1').get(r.id) as RunRow | undefined
    return {
      id: r.id,
      name: r.name,
      agent: r.agent,
      host: r.host,
      cwd: r.cwd,
      prompt: r.prompt,
      schedule: JSON.parse(r.schedule) as AutomationSchedule,
      permission: r.permission,
      model: r.model,
      timeoutMinutes: r.timeout_minutes,
      notify: r.notify === 1,
      enabled: r.enabled === 1,
      nextRunAt: r.next_run_at,
      createdAt: r.created_at,
      lastRun: last ? toRun(last) : null,
      running: last?.status === 'running'
    }
  }
}
