import type { GitState, HostId, MiniPcInfo, MiniPcSnapshot } from '@shared/types'
import { NotFoundError, toErrorInfo } from '../errors'
import type { Host } from '../hosts/Host'
import { FETCH_ERROR, fetchScript, gitBatchScript, infoScript, systemScript } from './commands'
import { parseGitStatusBatch } from './parseGitStatus'
import { parseInfo } from './parseInfo'
import { parseClaudeSessions, parseCounters, parseSystem } from './parseSystem'
import { withRates, type CounterSample } from './rates'

const HOME_PREFIX = /^~(?=$|\/)/

/** Zustand eines Linux-Geräts: System, Claude-Sitzungen, Git-Stand der Projekte (nur lesend, außer `git fetch`). */
export class MiniPcService {
  /** Zähler des letzten Abrufs je Gerät, aus denen die Raten des nächsten entstehen. */
  private readonly lastSample = new Map<HostId, CounterSample>()

  constructor(
    private readonly hosts: (id: HostId) => Host,
    private readonly now: () => number = Date.now
  ) {}

  async snapshot(id: HostId): Promise<MiniPcSnapshot> {
    const fetchedAt = this.now()
    try {
      const { stdout } = await this.hosts(id).exec(systemScript())
      const sample: CounterSample = { at: this.now(), counters: parseCounters(stdout) }
      const system = withRates(parseSystem(stdout), this.lastSample.get(id) ?? null, sample)
      this.lastSample.set(id, sample)
      return { online: true, error: null, system, claude: parseClaudeSessions(stdout), fetchedAt }
    } catch (error) {
      this.lastSample.delete(id)
      return { online: false, error: toErrorInfo(error).message, system: null, claude: [], fetchedAt }
    }
  }

  async info(id: HostId): Promise<MiniPcInfo> {
    const { stdout } = await this.hosts(id).exec(infoScript())
    return parseInfo(stdout, this.now())
  }

  async git(id: HostId, projectsDir: string): Promise<GitState[]> {
    const { stdout } = await this.hosts(id).exec(gitBatchScript(await this.resolve(id, projectsDir)))
    return parseGitStatusBatch(stdout)
  }

  async fetch(id: HostId, path: string): Promise<GitState> {
    const { stdout } = await this.hosts(id).exec(fetchScript(await this.resolve(id, path)))
    const fetchError = stdout
      .split('\n')
      .find((l) => l.startsWith(`${FETCH_ERROR} `))
      ?.slice(FETCH_ERROR.length + 1)
      .trim()
    const [state] = parseGitStatusBatch(stdout.split('\n').filter((l) => !l.startsWith(FETCH_ERROR)).join('\n'))
    if (!state) throw new NotFoundError(`Git-Stand für ${path}`, 'Prüfen, ob der Ordner ein Git-Repository ist.')
    return fetchError ? { ...state, error: fetchError } : state
  }

  private async resolve(id: HostId, path: string): Promise<string> {
    return HOME_PREFIX.test(path) ? path.replace(HOME_PREFIX, await this.hosts(id).homeDir()) : path
  }
}
