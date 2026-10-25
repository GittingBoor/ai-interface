import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ORCHESTRATOR_CLAUDE_MD } from './orchestratorPrompt'

export const MCP_SERVER_NAME = 'orchestrator'
const CLAUDE_MD = 'CLAUDE.md'
const MCP_CONFIG = 'mcp.json'
/** Nur der Nutzer darf das Token lesen (unter Windows ohne Wirkung, dort schützt das Profil). */
const PRIVATE_FILE_MODE = 0o600
const FILE_EXISTS = 'EEXIST'

export interface McpEndpoint {
  readonly url: string
  readonly token: string
}

export interface WorkspaceFiles {
  readonly dir: string
  readonly claudeMd: string
  readonly mcpConfig: string
}

/** Arbeitsordner des Orchestrators: eigene `CLAUDE.md` (gehört dem Nutzer) und `mcp.json` (pro Start neu). */
export class OrchestratorWorkspace {
  readonly files: WorkspaceFiles

  constructor(dir: string) {
    this.files = { dir, claudeMd: join(dir, CLAUDE_MD), mcpConfig: join(dir, MCP_CONFIG) }
  }

  async ensureClaudeMd(): Promise<string> {
    await mkdir(this.files.dir, { recursive: true })
    try {
      await writeFile(this.files.claudeMd, ORCHESTRATOR_CLAUDE_MD, { encoding: 'utf8', flag: 'wx' })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== FILE_EXISTS) throw error
    }
    return this.files.claudeMd
  }

  async prepare(endpoint: McpEndpoint): Promise<WorkspaceFiles> {
    await this.ensureClaudeMd()
    const config = { mcpServers: { [MCP_SERVER_NAME]: { type: 'http', url: endpoint.url, headers: { Authorization: `Bearer ${endpoint.token}` } } } }
    await writeFile(this.files.mcpConfig, JSON.stringify(config, null, 2), { encoding: 'utf8', mode: PRIVATE_FILE_MODE })
    return this.files
  }
}
