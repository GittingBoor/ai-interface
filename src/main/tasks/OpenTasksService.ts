import type { ProjectTasks, ProtocolDocument, ProtocolEntry, ProtocolGroup } from '@shared/types'
import { normalizeTask, parseOpenTasks } from './openTasks'
import type { TaskChecksRepo } from './TaskChecksRepo'

/** Protokolle im Vault (umgesetzt von `VaultReader`). */
export interface ProtocolSource {
  list(): Promise<ProtocolGroup[]>
  read(path: string): Promise<ProtocolDocument>
}

const DATED_NAME = /^(\d{4})-(\d{2})-(\d{2})\.md$/

function dateOf(entry: ProtocolEntry): number | null {
  const match = DATED_NAME.exec(entry.name)
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime() : null
}

/** Offene Aufgaben je Projekt aus dem neuesten Protokoll, ohne in der App abgehakte. */
export class OpenTasksService {
  constructor(
    private readonly vault: ProtocolSource,
    private readonly checks: TaskChecksRepo,
    private readonly logError: (message: string, error: unknown) => void
  ) {}

  async list(): Promise<ProjectTasks[]> {
    const groups = await this.vault.list()
    const results = await Promise.all(groups.map((g) => this.forGroup(g)))
    return results.filter((p): p is ProjectTasks => p !== null && p.tasks.length > 0).sort((a, b) => b.protocolDate - a.protocolDate)
  }

  check(groupId: string, key: string): void {
    this.checks.check(groupId, key)
  }

  uncheck(groupId: string, key: string): void {
    this.checks.uncheck(groupId, key)
  }

  private async forGroup(group: ProtocolGroup): Promise<ProjectTasks | null> {
    const latest = group.entries
      .map((entry) => ({ entry, date: dateOf(entry) }))
      .filter((e): e is { entry: ProtocolEntry; date: number } => e.date !== null)
      .sort((a, b) => b.date - a.date)[0]
    if (!latest) return null
    let content: string
    try {
      content = (await this.vault.read(latest.entry.path)).content
    } catch (error) {
      this.logError(`Protokoll lesen fehlgeschlagen: ${latest.entry.path}`, error)
      return null
    }
    const checked = this.checks.checked(group.id)
    const tasks = parseOpenTasks(content)
      .filter((t) => !t.done)
      .map((t) => ({ key: normalizeTask(t.text), text: t.text }))
      .filter((t) => !checked.has(t.key))
    return {
      groupId: group.id,
      label: group.label,
      favoriteId: group.favoriteId,
      color: group.color,
      icon: group.icon,
      protocolPath: latest.entry.path,
      protocolDate: latest.date,
      tasks
    }
  }
}
