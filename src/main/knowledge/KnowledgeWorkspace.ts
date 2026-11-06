import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ValidationError } from '../errors'
import type { McpEndpoint } from '../orchestrator/OrchestratorWorkspace'
import { KNOWLEDGE_CLAUDE_MD } from './knowledgePrompt'
import { KNOWLEDGE_SERVER } from './knowledgeTools'

const CLAUDE_MD = 'CLAUDE.md'
/** Nur der Nutzer darf das Token lesen (unter Windows ohne Wirkung, dort schützt das Profil). */
const PRIVATE_FILE_MODE = 0o600
const FILE_EXISTS = 'EEXIST'
const RUN_ID = /^[\w-]+$/

/** Arbeitsordner der Projektwissen-Läufe: eine `CLAUDE.md` (gehört dem Nutzer) und je Lauf eine `mcp-<runId>.json`. */
export class KnowledgeWorkspace {
  constructor(readonly dir: string) {}

  async ensureClaudeMd(): Promise<string> {
    const path = join(this.dir, CLAUDE_MD)
    await mkdir(this.dir, { recursive: true })
    try {
      await writeFile(path, KNOWLEDGE_CLAUDE_MD, { encoding: 'utf8', flag: 'wx' })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== FILE_EXISTS) throw error
    }
    return path
  }

  async writeMcpConfig(runId: string, endpoint: McpEndpoint): Promise<string> {
    const path = this.configPath(runId)
    await mkdir(this.dir, { recursive: true })
    const config = { mcpServers: { [KNOWLEDGE_SERVER]: { type: 'http', url: endpoint.url, headers: { Authorization: `Bearer ${endpoint.token}` } } } }
    await writeFile(path, JSON.stringify(config, null, 2), { encoding: 'utf8', mode: PRIVATE_FILE_MODE })
    return path
  }

  async removeMcpConfig(runId: string): Promise<void> {
    await rm(this.configPath(runId), { force: true })
  }

  private configPath(runId: string): string {
    if (!RUN_ID.test(runId)) throw new ValidationError(`runId „${runId}“ darf nur Buchstaben, Ziffern, _ und - enthalten.`)
    return join(this.dir, `mcp-${runId}.json`)
  }
}
