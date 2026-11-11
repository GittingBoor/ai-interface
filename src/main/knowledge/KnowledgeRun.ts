import type { KnowledgeDraft } from '@shared/knowledge'
import { mainLocale, mainT } from '../i18n'
import type { TerminalInfo, TerminalOpenRequest } from '@shared/types'
import type { McpEndpoint } from '../orchestrator/OrchestratorWorkspace'
import type { OrchestratorTool } from '../orchestrator/orchestratorTools'
import type { LaunchExtras } from '../terminal/TerminalService'
import type { InspectedProject } from './KnowledgeInspector'
import type { KnowledgeWorkspace } from './KnowledgeWorkspace'
import { knowledgeStartPrompt } from './knowledgePrompt'
import { KNOWLEDGE_SERVER } from './knowledgeTools'

export const KNOWLEDGE_RUN_TIMEOUT_MS = 20 * 60_000
export const KNOWLEDGE_MODEL = 'opus'
/** Nur die eigenen Lese-Werkzeuge und die Websuche: Eingebautes Schreiben/Ausführen würde nachfragen, und niemand kann im Hintergrund antworten. */
export const KNOWLEDGE_DISALLOWED_TOOLS = 'Bash,Edit,Write,MultiEdit,NotebookEdit'
/** Für Links zu offizieller Dokumentation; vorab erlaubt, damit keine Rückfrage kommt. */
export const KNOWLEDGE_WEB_TOOLS: readonly string[] = ['WebSearch', 'WebFetch']
/** Pause nach `finish`, damit Claude die Antwort des Werkzeugs noch bekommt. */
export const KNOWLEDGE_CLOSE_DELAY_MS = 2_500

const MS_PER_MINUTE = 60_000
const TERMINAL_COLS = 120
const TERMINAL_ROWS = 32

export interface KnowledgeRunServer {
  readonly tools: readonly OrchestratorTool[]
  start(): Promise<McpEndpoint>
  stop(): Promise<void>
}

export interface KnowledgeRunHooks {
  save(draft: KnowledgeDraft): Promise<void>
  finish(summary: string): void
}

export interface KnowledgeRunDeps {
  readonly workspace: Pick<KnowledgeWorkspace, 'dir' | 'ensureClaudeMd' | 'writeMcpConfig' | 'removeMcpConfig'>
  /** Arbeitsordner in Claude Code als vertraut eintragen; das Terminal ist schreibgeschützt und könnte die Abfrage nicht beantworten. */
  ensureTrusted(dir: string): Promise<void>
  createServer(project: InspectedProject, hooks: KnowledgeRunHooks): KnowledgeRunServer
  openTerminal(request: TerminalOpenRequest, extras: LaunchExtras): Promise<TerminalInfo>
  closeTerminal(id: string): void
  write(project: InspectedProject, draft: KnowledgeDraft): Promise<void>
  schedule(run: () => void, ms: number): () => void
  logError(message: string, error: unknown): void
}

export type KnowledgeRunOutcome = { readonly status: 'current' } | { readonly status: 'failed'; readonly error: string }

/** Ein Lauf für ein Projekt: MCP-Server, Konfiguration, Hintergrund-Terminal, Zeitlimit und Ergebnis. */
export class KnowledgeRun {
  terminalId: string | null = null
  private server: KnowledgeRunServer | null = null
  private saved = false
  private error: string | null = null
  private cancelTimeout: (() => void) | null = null
  private cancelClose: (() => void) | null = null

  /** `onClose` wird gerufen, nachdem der Lauf sein Terminal selbst geschlossen hat (nach `finish` oder Zeitlimit). */
  constructor(
    readonly project: InspectedProject,
    private readonly deps: KnowledgeRunDeps,
    private readonly onClose: (terminalId: string) => void
  ) {}

  get runId(): string {
    return `p${this.project.favorite.id}`
  }

  async open(): Promise<void> {
    await this.deps.workspace.ensureClaudeMd()
    await this.deps.ensureTrusted(this.deps.workspace.dir)
    const server = this.deps.createServer(this.project, this.hooks())
    this.server = server
    const endpoint = await server.start()
    const config = await this.deps.workspace.writeMcpConfig(this.runId, endpoint)
    const allowed = [...server.tools.map((tool) => `mcp__${KNOWLEDGE_SERVER}__${tool.name}`), ...KNOWLEDGE_WEB_TOOLS].join(',')
    const info = await this.deps.openTerminal(this.request(), {
      initialPrompt: knowledgeStartPrompt(this.project, mainLocale()),
      extraArgs: ['--model', KNOWLEDGE_MODEL, '--mcp-config', config, '--strict-mcp-config', '--allowedTools', allowed, '--disallowedTools', KNOWLEDGE_DISALLOWED_TOOLS],
      background: 'knowledge'
    })
    this.terminalId = info.id
    this.cancelTimeout = this.deps.schedule(() => this.timeOut(), KNOWLEDGE_RUN_TIMEOUT_MS)
  }

  fail(error: unknown): void {
    this.error = error instanceof Error ? error.message : String(error)
  }

  outcome(): KnowledgeRunOutcome {
    return this.saved ? { status: 'current' } : { status: 'failed', error: this.error ?? mainT().knowledge.notSaved }
  }

  /** Zeitgeber abbrechen, Server stoppen, Konfiguration löschen; Fehler beim Aufräumen werden protokolliert. */
  async dispose(): Promise<void> {
    this.cancelTimeout?.()
    this.cancelClose?.()
    this.cancelTimeout = null
    this.cancelClose = null
    try {
      await this.server?.stop()
    } catch (error) {
      this.deps.logError(`Projektwissen-Server für ${this.project.favorite.name} stoppen`, error) // i18n-ignore: Logtext
    }
    try {
      // Getrennt vom Server: Die Konfiguration enthält das Token und soll auch nach einem Fehler oben verschwinden.
      await this.deps.workspace.removeMcpConfig(this.runId)
    } catch (error) {
      this.deps.logError(`MCP-Konfiguration für ${this.project.favorite.name} löschen`, error) // i18n-ignore: Logtext
    }
  }

  private request(): TerminalOpenRequest {
    const title = `${mainT().knowledge.runPrefix} ${this.project.favorite.name}`
    return { host: 'local', path: this.deps.workspace.dir, mode: 'new', title, cols: TERMINAL_COLS, rows: TERMINAL_ROWS }
  }

  private hooks(): KnowledgeRunHooks {
    return {
      save: async (draft) => {
        await this.deps.write(this.project, draft)
        this.saved = true
      },
      finish: () => {
        this.cancelClose?.()
        this.cancelClose = this.deps.schedule(() => this.close(), KNOWLEDGE_CLOSE_DELAY_MS)
      }
    }
  }

  /** Schon gespeichertes Wissen bleibt gültig, auch wenn nur `finish` fehlt. */
  private timeOut(): void {
    if (!this.saved) this.error = mainT().knowledge.timeout(KNOWLEDGE_RUN_TIMEOUT_MS / MS_PER_MINUTE)
    this.close()
  }

  private close(): void {
    const id = this.terminalId
    if (!id) return
    this.deps.closeTerminal(id)
    this.onClose(id)
  }
}
