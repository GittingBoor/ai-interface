import type { KnowledgePlan, KnowledgePlanItem, KnowledgeProgress, KnowledgeProject, KnowledgeStatus } from '@shared/knowledge'
import type { Favorite, QuotaState } from '@shared/types'
import type { InspectedProject, KnowledgeInspector } from './KnowledgeInspector'
import { estimatePercent, fiveHourPercent, KNOWLEDGE_QUOTA_STOP, selectForRun } from './knowledgeBudget'
import { KnowledgeRun, type KnowledgeRunDeps } from './KnowledgeRun'

export {
  KNOWLEDGE_CLOSE_DELAY_MS,
  KNOWLEDGE_MODEL,
  KNOWLEDGE_RUN_TIMEOUT_MS,
  type KnowledgeRunHooks,
  type KnowledgeRunServer
} from './KnowledgeRun'

export const KNOWLEDGE_MAX_PARALLEL = 3

export interface KnowledgeServiceDeps extends KnowledgeRunDeps {
  /** Schon ohne verborgene Favoriten. */
  favorites(): readonly Favorite[]
  readonly inspector: Pick<KnowledgeInspector, 'inspect'>
  quota(): QuotaState
  onProgress(progress: KnowledgeProgress): void
}

type RunState = Extract<KnowledgeStatus, 'queued' | 'running' | 'deferred' | 'failed'>

interface ProjectState {
  readonly status: RunState
  readonly error: string | null
}

type Candidate = InspectedProject & { readonly status: KnowledgePlanItem['status'] }

const needsRun = (p: InspectedProject): p is Candidate => p.status === 'missing' || p.status === 'stale'

/** Ein Durchgang: prüft alle Projekte, stellt fehlendes/veraltetes Wissen in eine Warteschlange und arbeitet sie mit höchstens drei Hintergrund-Terminals ab. */
export class KnowledgeService {
  /** Zustände des letzten Durchgangs, nur im Speicher. */
  private readonly states = new Map<number, ProjectState>()
  private readonly runs = new Map<number, KnowledgeRun>()
  private queue: InspectedProject[] = []
  private active = false
  private total = 0
  private done = 0

  constructor(private readonly deps: KnowledgeServiceDeps) {}

  /** Vorschau: welche eingeschalteten Projekte ein Durchgang aufbereiten würde und was das ungefähr kostet. */
  async plan(): Promise<KnowledgePlan> {
    const favorites = this.deps.favorites()
    const inspected = await this.deps.inspector.inspect(favorites)
    const items = inspected.filter(needsRun).map((p) => ({ favoriteId: p.favorite.id, name: p.favorite.name, status: p.status, estimate: estimatePercent(p) }))
    return { items, enabled: favorites.length, quotaPercent: fiveHourPercent(this.deps.quota()), stopPercent: KNOWLEDGE_QUOTA_STOP }
  }

  /** Startet einen Durchgang für die gewählten Projekte; läuft schon einer, passiert nichts. */
  async refresh(only: readonly number[]): Promise<void> {
    if (this.active) return
    this.active = true
    try {
      await this.startPass(only)
    } catch (error) {
      this.active = false
      this.emit()
      throw error
    }
  }

  /** Zustand aller Projekte für die Ansicht (prüft frisch, mischt laufende/fehlgeschlagene Zustände ein). */
  async list(): Promise<KnowledgeProject[]> {
    const inspected = await this.deps.inspector.inspect(this.deps.favorites())
    return inspected.map((project) => this.toProject(project))
  }

  progress(): KnowledgeProgress {
    const runs = [...this.runs.values()].flatMap((run) => (run.terminalId ? [{ favoriteId: run.project.favorite.id, terminalId: run.terminalId }] : []))
    const deferred = [...this.states.values()].filter((state) => state.status === 'deferred').length
    return { active: this.active, total: this.total, done: this.done, deferred, runs }
  }

  isKnowledgeTerminal(id: string): boolean {
    return this.findRun(id) !== undefined
  }

  async handleClosed(terminalId: string): Promise<void> {
    const run = this.findRun(terminalId)
    if (!run) return
    await this.finishRun(run)
    await this.fill()
  }

  async stop(): Promise<void> {
    const runs = [...this.runs.values()]
    this.runs.clear()
    this.queue = []
    this.active = false
    for (const run of runs) await this.discard(run)
  }

  private async startPass(only: readonly number[]): Promise<void> {
    const inspected = await this.deps.inspector.inspect(this.deps.favorites())
    const candidates = inspected.filter(needsRun).filter((p) => only.includes(p.favorite.id))
    const { start, deferred } = selectForRun(candidates, fiveHourPercent(this.deps.quota()))
    this.states.clear()
    this.queue = [...start].sort((a, b) => b.lastActivity - a.lastActivity)
    this.total = this.queue.length
    this.done = 0
    for (const project of this.queue) this.setState(project, 'queued')
    for (const project of deferred) this.setState(project, 'deferred')
    this.emit()
    await this.fill()
  }

  /** Füllt freie Plätze aus der Warteschlange; ab `KNOWLEDGE_QUOTA_STOP` wird der Rest zurückgestellt. */
  private async fill(): Promise<void> {
    const launches: Promise<void>[] = []
    while (this.active && this.runs.size < KNOWLEDGE_MAX_PARALLEL && this.queue.length > 0) {
      if (this.quotaExhausted()) {
        this.deferQueue()
        break
      }
      const project = this.queue.shift()
      if (project) launches.push(this.launch(project))
    }
    if (this.runs.size === 0 && this.queue.length === 0) this.active = false
    this.emit()
    await Promise.all(launches)
  }

  private quotaExhausted(): boolean {
    const percent = fiveHourPercent(this.deps.quota())
    return percent !== null && percent >= KNOWLEDGE_QUOTA_STOP
  }

  private deferQueue(): void {
    for (const project of this.queue) this.setState(project, 'deferred')
    this.total -= this.queue.length
    this.queue = []
  }

  private async launch(project: InspectedProject): Promise<void> {
    const run = new KnowledgeRun(project, this.deps, (id) => this.closedByRun(id))
    this.runs.set(project.favorite.id, run)
    this.setState(project, 'running')
    try {
      await run.open()
      if (this.isCurrent(run)) this.emit()
      else await this.discard(run)
    } catch (error) {
      this.deps.logError(`Projektwissen für ${project.favorite.name} starten`, error) // i18n-ignore: Logtext
      run.fail(error)
      if (!this.isCurrent(run)) return this.discard(run)
      await this.finishRun(run)
      await this.fill()
    }
  }

  /** Der Lauf hat sein Terminal selbst geschlossen; das Terminal-Ereignis kann zusätzlich kommen, aufgeräumt wird einmal. */
  private closedByRun(terminalId: string): void {
    void this.handleClosed(terminalId).catch((error: unknown) => this.deps.logError('Projektwissen-Lauf beenden', error))
  }

  private async finishRun(run: KnowledgeRun): Promise<void> {
    if (!this.isCurrent(run)) return
    this.runs.delete(run.project.favorite.id)
    await run.dispose()
    this.done += 1
    const outcome = run.outcome()
    // Erfolg: kein fester Zustand, damit spätere Commits oder Protokolle wieder als „veraltet“ erscheinen.
    if (outcome.status === 'current') this.states.delete(run.project.favorite.id)
    else this.setState(run.project, 'failed', outcome.error)
  }

  /** Lauf ohne Ergebnis abbrechen (bei `stop`, auch wenn er gerade noch startet). */
  private async discard(run: KnowledgeRun): Promise<void> {
    if (run.terminalId) this.deps.closeTerminal(run.terminalId)
    await run.dispose()
  }

  private isCurrent(run: KnowledgeRun): boolean {
    return this.runs.get(run.project.favorite.id) === run
  }

  private findRun(terminalId: string): KnowledgeRun | undefined {
    return [...this.runs.values()].find((run) => run.terminalId === terminalId)
  }

  private setState(project: InspectedProject, status: RunState, error: string | null = null): void {
    this.states.set(project.favorite.id, { status, error })
  }

  private emit(): void {
    this.deps.onProgress(this.progress())
  }

  private toProject(project: InspectedProject): KnowledgeProject {
    const { favorite } = project
    const state = this.states.get(favorite.id)
    return {
      favoriteId: favorite.id,
      name: favorite.name,
      host: favorite.host,
      path: favorite.path,
      color: favorite.color,
      icon: favorite.icon,
      status: state?.status ?? project.status,
      knowledge: project.knowledge,
      error: state?.error ?? project.error ?? null
    }
  }
}
