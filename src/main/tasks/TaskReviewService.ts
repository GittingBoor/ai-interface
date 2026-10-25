import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ReviewedTask, TaskReviewResult, TerminalInfo, TerminalOpenRequest } from '@shared/types'
import type { LaunchExtras } from '../terminal/TerminalService'
import type { McpEndpoint } from '../orchestrator/OrchestratorWorkspace'

export const TASK_REVIEW_SERVER = 'aufgaben'
const TITLE = 'Aufgaben-Prüfung'
const MCP_CONFIG = 'mcp.json'
const DEFAULT_COLS = 120
const DEFAULT_ROWS = 32
/** Pause nach `finish`, damit Claude die Antwort des Werkzeugs noch bekommt. */
export const CLOSE_DELAY_MS = 2_500
const PRIVATE_FILE_MODE = 0o600

export const TASK_REVIEW_PROMPT = `Prüfe die offenen Aufgaben aus den Projekt-Protokollen und hake ab, was wirklich schon erledigt ist.

Vorgehen:
1. Hole alle Aufgaben mit list_open_tasks.
2. Prüfe jede Aufgabe mit git_log, git_grep und read_project_file gegen den Stand des Projekts.
3. Hake mit mark_done nur ab, was eindeutig belegt ist (Commit, Code, Datei), mit kurzem Beleg als reason. Im Zweifel offen lassen.
4. Rufe zum Schluss immer finish mit einer kurzen Zusammenfassung auf.

Nur lesen: nichts ändern, nichts committen, keine Dateien schreiben. Antworte auf Deutsch und knapp.`

export interface TaskReviewServiceDeps {
  readonly dir: string
  readonly toolNames: readonly string[]
  readonly server: { start(): Promise<McpEndpoint>; stop(): Promise<void> }
  openTerminal(request: TerminalOpenRequest, extras: LaunchExtras): Promise<TerminalInfo>
  closeTerminal(id: string): void
  terminal(id: string): TerminalInfo | undefined
  onFinished(result: TaskReviewResult): void
  check(groupId: string, key: string): void
  schedule(run: () => void, ms: number): void
}

/** Hält höchstens eine Aufgaben-Prüfung: Terminal mit Claude, MCP-Server und die abgehakten Aufgaben des Laufs. */
export class TaskReviewService {
  private terminalId: string | null = null
  private opening: Promise<TerminalInfo> | null = null
  private checked: ReviewedTask[] = []
  private reported = false

  constructor(private readonly deps: TaskReviewServiceDeps) {}

  open(): Promise<TerminalInfo> {
    const existing = this.terminalId ? this.deps.terminal(this.terminalId) : undefined
    if (existing) return Promise.resolve(existing)
    this.opening ??= this.launch().finally(() => (this.opening = null))
    return this.opening
  }

  markDone(task: ReviewedTask): void {
    this.deps.check(task.groupId, task.key)
    this.checked = [...this.checked.filter((t) => t.groupId !== task.groupId || t.key !== task.key), task]
  }

  finish(summary: string): void {
    const id = this.terminalId
    this.report(summary, true)
    if (id) this.deps.schedule(() => this.deps.closeTerminal(id), CLOSE_DELAY_MS)
  }

  /** Terminal zu (vom Nutzer oder nach `finish`): Ergebnis melden, falls noch nicht geschehen, und Server stoppen. */
  async handleClosed(id: string): Promise<void> {
    if (id !== this.terminalId) return
    this.report(null, false)
    this.terminalId = null
    await this.deps.server.stop()
  }

  async stop(): Promise<void> {
    this.terminalId = null
    await this.deps.server.stop()
  }

  private report(summary: string | null, finished: boolean): void {
    if (this.reported) return
    this.reported = true
    this.deps.onFinished({ checked: this.checked, summary, finished })
  }

  private async launch(): Promise<TerminalInfo> {
    const endpoint = await this.deps.server.start()
    try {
      const mcpConfig = await this.writeConfig(endpoint)
      const allowed = this.deps.toolNames.map((name) => `mcp__${TASK_REVIEW_SERVER}__${name}`).join(',')
      const request: TerminalOpenRequest = { host: 'local', path: this.deps.dir, mode: 'new', title: TITLE, cols: DEFAULT_COLS, rows: DEFAULT_ROWS }
      const info = await this.deps.openTerminal(request, { initialPrompt: TASK_REVIEW_PROMPT, extraArgs: ['--mcp-config', mcpConfig, '--allowedTools', allowed] })
      this.terminalId = info.id
      this.checked = []
      this.reported = false
      return info
    } catch (error) {
      await this.deps.server.stop()
      throw error
    }
  }

  private async writeConfig(endpoint: McpEndpoint): Promise<string> {
    await mkdir(this.deps.dir, { recursive: true })
    const path = join(this.deps.dir, MCP_CONFIG)
    const config = { mcpServers: { [TASK_REVIEW_SERVER]: { type: 'http', url: endpoint.url, headers: { Authorization: `Bearer ${endpoint.token}` } } } }
    await writeFile(path, JSON.stringify(config, null, 2), { encoding: 'utf8', mode: PRIVATE_FILE_MODE })
    return path
  }
}
