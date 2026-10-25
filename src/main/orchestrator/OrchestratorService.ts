import type { OrchestratorLaunchMode, OrchestratorSettings, TerminalInfo, TerminalOpenRequest } from '@shared/types'
import { OrchestratorUnavailableError } from '../errors'
import type { LaunchExtras } from '../terminal/TerminalService'
import type { OrchestratorTool } from './orchestratorTools'
import { MCP_SERVER_NAME, type McpEndpoint, type OrchestratorWorkspace } from './OrchestratorWorkspace'

const TITLE = 'Orchestrator'
const DEFAULT_COLS = 120
const DEFAULT_ROWS = 32

type ToolRef = Pick<OrchestratorTool, 'name' | 'mutating'>

/** Claude-Argumente: MCP-Server laden; ändernde Werkzeuge nur ohne Rückfrage freigeben. */
export function orchestratorClaudeArgs(mcpConfigPath: string, confirmBeforeSend: boolean, tools: readonly ToolRef[]): string[] {
  const allowed = tools.filter((t) => !confirmBeforeSend || !t.mutating).map((t) => `mcp__${MCP_SERVER_NAME}__${t.name}`)
  return ['--mcp-config', mcpConfigPath, '--allowedTools', allowed.join(',')]
}

export interface OrchestratorServiceDeps {
  readonly workspace: Pick<OrchestratorWorkspace, 'prepare' | 'ensureClaudeMd'>
  readonly server: { start(): Promise<McpEndpoint>; stop(): Promise<void> }
  readonly tools: readonly ToolRef[]
  settings(): OrchestratorSettings
  openTerminal(request: TerminalOpenRequest, extras: LaunchExtras): Promise<TerminalInfo>
  terminal(id: string): TerminalInfo | undefined
}

/** Hält höchstens ein Orchestrator-Terminal und den MCP-Server, solange es offen ist. */
export class OrchestratorService {
  private terminalId: string | null = null
  private opening: Promise<TerminalInfo> | null = null

  constructor(private readonly deps: OrchestratorServiceDeps) {}

  currentId(): string | null {
    return this.terminalId
  }

  /** Öffnet den Orchestrator oder liefert das offene Terminal. */
  open(mode: OrchestratorLaunchMode): Promise<TerminalInfo> {
    if (!this.deps.settings().enabled) return Promise.reject(new OrchestratorUnavailableError('in den Einstellungen ausgeschaltet.'))
    const existing = this.terminalId ? this.deps.terminal(this.terminalId) : undefined
    if (existing) return Promise.resolve(existing)
    this.opening ??= this.launch(mode).finally(() => (this.opening = null))
    return this.opening
  }

  async handleClosed(id: string): Promise<void> {
    if (id !== this.terminalId) return
    this.terminalId = null
    await this.deps.server.stop()
  }

  claudeMdPath(): Promise<string> {
    return this.deps.workspace.ensureClaudeMd()
  }

  async stop(): Promise<void> {
    this.terminalId = null
    await this.deps.server.stop()
  }

  private async launch(mode: OrchestratorLaunchMode): Promise<TerminalInfo> {
    const endpoint = await this.deps.server.start()
    try {
      const files = await this.deps.workspace.prepare(endpoint)
      const request: TerminalOpenRequest = { host: 'local', path: files.dir, mode, title: TITLE, cols: DEFAULT_COLS, rows: DEFAULT_ROWS }
      const extraArgs = orchestratorClaudeArgs(files.mcpConfig, this.deps.settings().confirmBeforeSend, this.deps.tools)
      const info = await this.deps.openTerminal(request, { orchestrator: true, extraArgs })
      this.terminalId = info.id
      return info
    } catch (error) {
      await this.deps.server.stop()
      throw error
    }
  }
}
