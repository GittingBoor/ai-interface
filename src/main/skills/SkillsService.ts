import { homedir } from 'node:os'
import type Database from 'better-sqlite3'
import type { Favorite, HostId, SkillCatalogResult, SkillEntry } from '@shared/types'
import { runProcess } from '../claude/ClaudeCli'
import { isFile, resolveClaudeExecutable } from '../claude/claudePath'
import { ClaudeCliError, NotFoundError } from '../errors'
import type { Host } from '../hosts/Host'
import { terminalEnv } from '../terminal/launchCommand'
import { SkillCatalog } from './SkillCatalog'
import { SUMMARY_MODEL, SkillSummarizer, type SummaryProgress } from './SkillSummarizer'

const SUMMARY_TIMEOUT_MS = 120_000

/** Katalog je Host plus KI-Zusammenfassungen (lokal über `claude -p`, auch für Einträge vom Mini-PC). */
export class SkillsService {
  private readonly known = new Map<string, SkillEntry>()
  private readonly summarizer: SkillSummarizer

  constructor(
    db: Database.Database,
    private readonly hosts: (id: HostId) => Host,
    private readonly projects: () => readonly Favorite[],
    private readonly claudeCommand: () => string,
    onProgress: (progress: SummaryProgress) => void
  ) {
    this.summarizer = new SkillSummarizer(db, (prompt, input) => this.runClaude(prompt, input), onProgress)
  }

  async catalog(host: HostId): Promise<SkillCatalogResult> {
    const result = await new SkillCatalog(this.hosts(host), this.projects).scan()
    for (const entry of result.entries) this.known.set(entry.id, entry)
    return result
  }

  summaries(hashes: readonly string[]): Record<string, string> {
    return this.summarizer.cached(hashes)
  }

  async summarize(ids: readonly string[]): Promise<number> {
    const inputs = []
    for (const id of ids) {
      const entry = this.known.get(id)
      if (!entry) throw new NotFoundError(`Eintrag ${id}`, 'Katalog neu laden und erneut versuchen.')
      const content = (await this.hosts(entry.host).readFile(entry.path)).toString('utf8')
      inputs.push({ hash: entry.hash, name: entry.name, content })
    }
    return this.summarizer.summarize(inputs)
  }

  private async runClaude(prompt: string, input: string): Promise<string> {
    const executable = resolveClaudeExecutable(this.claudeCommand(), process.platform, isFile, process.env['PATH'] ?? '', homedir())
    if (!executable) throw new ClaudeCliError(`„${this.claudeCommand()}“ nicht gefunden`)
    // Prompt über stdin statt als Argument: keine Quoting-/Codepage-Probleme mit .cmd-Wrappern.
    return runProcess(executable, ['-p', '--model', SUMMARY_MODEL, '--output-format', 'text'], `${prompt}\n\n---\n\n${input}`, {
      timeoutMs: SUMMARY_TIMEOUT_MS,
      env: terminalEnv(process.env)
    })
  }
}
