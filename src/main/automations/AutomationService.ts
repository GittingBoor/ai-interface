import { nextRunAt, validateAutomation, type Automation, type AutomationInput, type AutomationRun, type AutomationTrigger } from '@shared/automations'
import type { QuotaState } from '@shared/types'
import { ValidationError } from '../errors'
import { mainT } from '../i18n'
import type { RunOutcome } from './AgentRunner'
import type { AutomationRepo } from './AutomationRepo'

export const TICK_MS = 30_000
export const MAX_PARALLEL = 2
/** Ab dieser Auslastung des 5-Stunden-Fensters starten geplante Läufe nicht mehr. */
export const AUTOMATION_QUOTA_STOP = 90
const NOTIFY_PREVIEW = 140

export interface AutomationServiceDeps {
  readonly repo: AutomationRepo
  readonly run: (input: AutomationInput) => Promise<RunOutcome>
  readonly quota: () => QuotaState
  readonly now: () => number
  readonly notify: (title: string, body: string) => void
  readonly changed: () => void
  readonly logError: (message: string, error: unknown) => void
}

function fiveHourPercent(quota: QuotaState): number | null {
  if (quota.status !== 'ok') return null
  return quota.windows.find((w) => w.kind === 'five_hour')?.percent ?? null
}

/** Planer und Ausführung der Automatisierungen (nur solange die App läuft). */
export class AutomationService {
  private readonly active = new Set<number>()
  private timer: NodeJS.Timeout | null = null

  constructor(private readonly deps: AutomationServiceDeps) {}

  start(): void {
    this.deps.repo.failInterrupted(this.deps.now())
    void this.tick()
    this.timer = setInterval(() => void this.tick(), TICK_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  list(): Automation[] {
    return this.deps.repo.list()
  }

  runs(id: number): AutomationRun[] {
    return this.deps.repo.runs(id)
  }

  create(input: AutomationInput): Automation {
    this.validate(input)
    const created = this.deps.repo.create(input, this.planned(input), this.deps.now())
    this.deps.changed()
    return created
  }

  update(id: number, input: AutomationInput): Automation {
    this.validate(input)
    const updated = this.deps.repo.update(id, input, this.planned(input))
    this.deps.changed()
    return updated
  }

  remove(id: number): void {
    this.deps.repo.remove(id)
    this.deps.changed()
  }

  /** Startet sofort (auch ausgeschaltete); kehrt zurück, sobald der Lauf läuft. */
  runNow(id: number): void {
    const automation = this.deps.repo.get(id)
    if (this.active.has(id)) throw new ValidationError(mainT().automations.run.alreadyRunning(automation.name))
    void this.execute(automation, 'manual')
  }

  /** Fällige Läufe starten. Verpasste Termine (App war zu) werden genau einmal nachgeholt. */
  async tick(): Promise<void> {
    const now = this.deps.now()
    const due = this.deps.repo.list().filter((a) => a.enabled && a.nextRunAt !== null && a.nextRunAt <= now && !this.active.has(a.id))
    for (const automation of due) {
      if (this.active.size >= MAX_PARALLEL) return
      this.deps.repo.setNextRun(automation.id, nextRunAt(automation.schedule, now))
      const percent = fiveHourPercent(this.deps.quota())
      if (percent !== null && percent >= AUTOMATION_QUOTA_STOP) {
        this.deps.repo.recordSkipped(automation.id, 'schedule', mainT().automations.run.skippedQuota(Math.round(percent)), now)
        this.deps.changed()
        continue
      }
      void this.execute(automation, 'schedule')
    }
  }

  private async execute(automation: Automation, trigger: AutomationTrigger): Promise<void> {
    this.active.add(automation.id)
    const runId = this.deps.repo.startRun(automation.id, trigger, this.deps.now())
    this.deps.changed()
    try {
      const outcome = await this.deps.run(automation)
      this.deps.repo.finishRun(runId, { status: outcome.ok ? 'success' : 'error', ...outcome }, this.deps.now())
      if (automation.notify) this.notifyDone(automation, outcome)
    } catch (error) {
      this.deps.logError(`Automatisierung ${automation.name}`, error) // i18n-ignore: Logtext
      const message = error instanceof Error ? error.message : String(error)
      this.deps.repo.finishRun(runId, { status: 'error', result: '', error: message, sessionId: null, costUsd: null, turns: null }, this.deps.now())
    } finally {
      this.active.delete(automation.id)
      this.deps.changed()
    }
  }

  private notifyDone(automation: Automation, outcome: RunOutcome): void {
    const text = (outcome.ok ? outcome.result : (outcome.error ?? '')).replace(/\s+/g, ' ').trim()
    const preview = text.length > NOTIFY_PREVIEW ? `${text.slice(0, NOTIFY_PREVIEW)}…` : text
    const t = mainT().automations.run
    this.deps.notify(outcome.ok ? t.doneTitle(automation.name) : t.failedTitle(automation.name), preview || t.noResultBody)
  }

  private validate(input: AutomationInput): void {
    const problem = validateAutomation(input, mainT().automations)
    if (problem) throw new ValidationError(problem)
  }

  private planned(input: AutomationInput): number | null {
    return input.enabled ? nextRunAt(input.schedule, this.deps.now()) : null
  }
}
