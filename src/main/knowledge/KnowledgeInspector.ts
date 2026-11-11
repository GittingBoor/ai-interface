import { KNOWLEDGE_VERSION, type KnowledgeBasis, type KnowledgeStatus, type ProjectKnowledge } from '@shared/knowledge'
import type { Favorite, HostId, ProtocolGroup } from '@shared/types'
import { HostUnreachableError } from '../errors'
import type { Host } from '../hosts/Host'
import { quoteFor } from '../hosts/projectRead'
import type { KnowledgeStore } from './KnowledgeStore'

const DATED_NAME = /^(\d{4})-(\d{2})-(\d{2})\.md$/
const MS_PER_SECOND = 1000
const DECIMAL = 10
/** Nur Hash-Zeichen werden an git übergeben; alles andere gilt als unbekannter Stand. */
const COMMIT_HASH = /^[0-9a-f]{4,64}$/i

export interface InspectedProject {
  readonly favorite: Favorite
  readonly status: Extract<KnowledgeStatus, 'current' | 'stale' | 'missing' | 'unreachable' | 'failed'>
  /** Nur bei `failed`: warum die Prüfung dieses Projekts scheiterte. */
  readonly error?: string
  readonly knowledge: ProjectKnowledge | null
  /** HEAD (null ohne Git) und neuestes Protokolldatum. */
  readonly current: KnowledgeBasis
  /** Protokolle seit `basedOn.protocolDate`; ohne Wissen: alle. */
  readonly newProtocols: number
  /** Commits seit `basedOn.head`; ohne Wissen: alle; ohne Git 0. */
  readonly newCommits: number
  /** ms, max(neuestes Protokoll, letzter Commit), für die Priorität. */
  readonly lastActivity: number
}

export interface KnowledgeInspectorDeps {
  host(id: HostId): Host
  readonly store: KnowledgeStore
  protocols(): Promise<readonly ProtocolGroup[]>
}

interface GitState {
  readonly head: string | null
  readonly lastCommitMs: number
}

const NO_GIT: GitState = { head: null, lastCommitMs: 0 }

function protocolDates(groups: readonly ProtocolGroup[], favoriteId: number): string[] {
  return groups
    .filter((group) => group.favoriteId === favoriteId)
    .flatMap((group) => group.entries.map((entry) => DATED_NAME.exec(entry.name)))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => `${match[1]}-${match[2]}-${match[3]}`)
    .sort()
}

function localMidnightMs(date: string): number {
  const [year = 0, month = 1, day = 1] = date.split('-').map((part) => Number.parseInt(part, DECIMAL))
  return new Date(year, month - 1, day).getTime()
}

/** Entscheidet je Projekt, ob sein Wissen fehlt, veraltet oder aktuell ist. */
export class KnowledgeInspector {
  constructor(private readonly deps: KnowledgeInspectorDeps) {}

  async inspect(favorites: readonly Favorite[]): Promise<InspectedProject[]> {
    const groups = await this.deps.protocols()
    return Promise.all(favorites.map((favorite) => this.inspectOne(favorite, groups)))
  }

  private async inspectOne(favorite: Favorite, groups: readonly ProtocolGroup[]): Promise<InspectedProject> {
    const dates = protocolDates(groups, favorite.id)
    const latestDate = dates.at(-1) ?? null
    try {
      return await this.evaluate(favorite, dates, latestDate)
    } catch (error) {
      const basis = { head: null, protocolDate: latestDate }
      const activity = this.activity(latestDate, 0)
      if (error instanceof HostUnreachableError) return this.result(favorite, 'unreachable', null, basis, 0, 0, activity)
      // Nur dieses Projekt als fehlgeschlagen zeigen (z. B. Gerät gelöscht, Pfad unlesbar), statt die ganze Ansicht zu verlieren.
      return { ...this.result(favorite, 'failed', null, basis, 0, 0, activity), error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async evaluate(favorite: Favorite, dates: readonly string[], latestDate: string | null): Promise<InspectedProject> {
    const host = this.deps.host(favorite.host)
    const stored = await this.deps.store.read(host, favorite.path)
    const knowledge = stored.kind === 'ok' ? stored.knowledge : null
    const git = await this.readGit(host, favorite.path)
    const current: KnowledgeBasis = { head: git.head, protocolDate: latestDate }
    const basedOn = knowledge?.basedOn ?? null
    const newProtocols = dates.filter((date) => basedOn?.protocolDate == null || date > basedOn.protocolDate).length
    const newCommits = git.head === null || git.head === basedOn?.head ? 0 : await this.countCommits(host, favorite.path, basedOn?.head ?? null)
    // Wissen einer älteren Fassung fehlen Diagramme und Kennzahlen; es gilt deshalb als veraltet.
    const outdated = knowledge !== null && knowledge.version < KNOWLEDGE_VERSION
    const status = knowledge && basedOn ? (outdated || this.isStale(current, basedOn) ? 'stale' : 'current') : 'missing'
    return this.result(favorite, status, knowledge, current, newProtocols, newCommits, this.activity(latestDate, git.lastCommitMs))
  }

  private isStale(current: KnowledgeBasis, basedOn: KnowledgeBasis): boolean {
    if (current.head !== basedOn.head) return true
    return current.protocolDate !== null && (basedOn.protocolDate === null || current.protocolDate > basedOn.protocolDate)
  }

  private activity(latestDate: string | null, lastCommitMs: number): number {
    return Math.max(latestDate ? localMidnightMs(latestDate) : 0, lastCommitMs)
  }

  private result(
    favorite: Favorite,
    status: InspectedProject['status'],
    knowledge: ProjectKnowledge | null,
    current: KnowledgeBasis,
    newProtocols: number,
    newCommits: number,
    lastActivity: number
  ): InspectedProject {
    return { favorite, status, knowledge, current, newProtocols, newCommits, lastActivity }
  }

  /** Eigene Exec-Aufrufe statt `runGit`: ein Exit-Code ungleich 0 bedeutet hier „kein Git“, kein Fehler. */
  private async git(host: Host, projectPath: string, args: string): Promise<string | null> {
    const result = await host.exec(`git -C ${quoteFor(host, projectPath)} ${args}`)
    return result.code === 0 ? result.stdout.trim() : null
  }

  private async readGit(host: Host, projectPath: string): Promise<GitState> {
    const head = await this.git(host, projectPath, 'rev-parse HEAD')
    if (!head) return NO_GIT
    const seconds = Number.parseInt((await this.git(host, projectPath, 'log -1 --format=%ct')) ?? '', DECIMAL)
    return { head, lastCommitMs: Number.isNaN(seconds) ? 0 : seconds * MS_PER_SECOND }
  }

  private async countCommits(host: Host, projectPath: string, baseHead: string | null): Promise<number> {
    const since = baseHead && COMMIT_HASH.test(baseHead) ? await this.git(host, projectPath, `rev-list --count ${baseHead}..HEAD`) : null
    const raw = since ?? (await this.git(host, projectPath, 'rev-list --count HEAD'))
    const count = Number.parseInt(raw ?? '', DECIMAL)
    return Number.isNaN(count) ? 0 : count
  }
}
