import type { BreakdownRange, CollectStats, HostFilter, HostId, HostStatus, ProjectActivity, ProjectUsage, SessionSummary, UsageOverview } from '@shared/types'
import { toErrorInfo } from '../errors'
import type { HostDirectory } from '../hosts/Host'
import { ACTIVE_GAP_MS, activeMsByProject } from './sessions'
import type { UsageCollector } from './UsageCollector'
import type { UsageRepo } from './UsageRepo'

const DAY_MS = 86_400_000
const DAILY_RANGE_DAYS = 30
const HEATMAP_RANGE_DAYS = 84
const RECENT_SESSIONS = 8
const RANGE_DAYS: Readonly<Record<Exclude<BreakdownRange, 'all'>, number>> = { week: 7, month: DAILY_RANGE_DAYS }

const startOfToday = (now: number): number => {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Sammelt Verbrauch je Host und stellt die Übersicht zusammen. */
export class UsageService {
  private readonly status = new Map<HostId, HostStatus>()
  private readonly inflight = new Map<HostId, Promise<void>>()

  constructor(
    private readonly repo: UsageRepo,
    private readonly collector: UsageCollector,
    private readonly hosts: HostDirectory,
    private readonly now: () => number = Date.now
  ) {}

  /** Stand aller Rechner; Geräte können jederzeit dazukommen oder wegfallen. */
  hostStatus(): HostStatus[] {
    return this.hosts.ids().map((id) => ({ ...this.statusOf(id), label: this.hosts.label(id), enabled: this.hosts.isEnabled(id) }))
  }

  private statusOf(id: HostId): HostStatus {
    return this.status.get(id) ?? { id, label: this.hosts.label(id), enabled: this.hosts.isEnabled(id), online: false, lastCollect: null, error: null }
  }

  /** Sammelt alle (oder die angegebenen) Hosts; ein laufender Abruf eines Hosts wird mitgenutzt. */
  async refresh(ids: readonly HostId[] = this.hosts.ids()): Promise<HostStatus[]> {
    await Promise.all(ids.filter((id) => this.hosts.isEnabled(id)).map((id) => this.collectShared(id)))
    return this.hostStatus()
  }

  overview(): UsageOverview {
    const now = this.now()
    const today = startOfToday(now)
    const monthStart = today - (DAILY_RANGE_DAYS - 1) * DAY_MS
    const recentSessions = this.repo.sessions(RECENT_SESSIONS)
    return {
      today: this.repo.totals(today),
      week: this.repo.totals(today - 6 * DAY_MS),
      month: this.repo.totals(monthStart),
      daily: this.repo.daily(monthStart),
      heatmap: this.repo.heatmap(today - HEATMAP_RANGE_DAYS * DAY_MS),
      models: this.repo.byModel(monthStart),
      projects: this.repo.byProject(monthStart),
      recentSessions,
      activeSessions: recentSessions.filter((s) => now - s.endedAt < ACTIVE_GAP_MS).length
    }
  }

  projects(days: number): ProjectUsage[] {
    return this.repo.byProject(startOfToday(this.now()) - (days - 1) * DAY_MS)
  }

  /** Arbeitszeit, Token und API-Gegenwert je Projekt, größter Verbrauch zuerst. */
  projectBreakdown(range: BreakdownRange, host: HostFilter): ProjectActivity[] {
    const since = range === 'all' ? 0 : startOfToday(this.now()) - (RANGE_DAYS[range] - 1) * DAY_MS
    const active = activeMsByProject(this.repo.activityRows(since))
    return this.repo
      .byProject(since)
      .filter((p) => host === 'all' || p.host === host)
      .map((p) => ({
        project: p.project,
        host: p.host,
        activeMs: active.get(`${p.host}|${p.project}`) ?? 0,
        totalTokens: p.totalTokens,
        costUsd: p.costUsd,
        sessions: p.sessions
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens)
  }

  sessions(limit: number, project?: string): SessionSummary[] {
    return this.repo.sessions(limit, project)
  }

  private collectShared(id: HostId): Promise<void> {
    const running = this.inflight.get(id)
    if (running) return running
    const run = this.collectOne(id).finally(() => this.inflight.delete(id))
    this.inflight.set(id, run)
    return run
  }

  private async collectOne(id: HostId): Promise<void> {
    const previous = this.statusOf(id)
    try {
      const stats: CollectStats = await this.collector.collect(this.hosts.get(id))
      this.status.set(id, { ...previous, online: true, lastCollect: stats, error: null })
    } catch (error) {
      this.status.set(id, { ...previous, online: false, error: toErrorInfo(error).message })
    }
  }
}
