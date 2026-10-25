import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MCP_SERVER_NAME, OrchestratorWorkspace } from '../../src/main/orchestrator/OrchestratorWorkspace'
import { ORCHESTRATOR_CLAUDE_MD } from '../../src/main/orchestrator/orchestratorPrompt'

const endpoint = { url: 'http://127.0.0.1:4711/mcp', token: 'geheim' }

describe('OrchestratorWorkspace', () => {
  it('legt Ordner, CLAUDE.md und mcp.json an', async () => {
    const dir = join(await mkdtemp(join(tmpdir(), 'orch-')), 'orchestrator')
    const files = await new OrchestratorWorkspace(dir).prepare(endpoint)
    expect(await readFile(files.claudeMd, 'utf8')).toBe(ORCHESTRATOR_CLAUDE_MD)
    expect(JSON.parse(await readFile(files.mcpConfig, 'utf8'))).toEqual({
      mcpServers: { [MCP_SERVER_NAME]: { type: 'http', url: endpoint.url, headers: { Authorization: 'Bearer geheim' } } }
    })
  })

  it('überschreibt eine vorhandene CLAUDE.md nie, mcp.json immer', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'orch-'))
    const workspace = new OrchestratorWorkspace(dir)
    await workspace.prepare(endpoint)
    await writeFile(workspace.files.claudeMd, 'eigene Regeln', 'utf8')
    await workspace.prepare({ url: 'http://127.0.0.1:5000/mcp', token: 'neu' })
    expect(await readFile(workspace.files.claudeMd, 'utf8')).toBe('eigene Regeln')
    expect(await readFile(workspace.files.mcpConfig, 'utf8')).toContain('Bearer neu')
  })

  it('enthält keine persönlichen Namen', () => {
    expect(ORCHESTRATOR_CLAUDE_MD).toContain('der Nutzer')
    expect(ORCHESTRATOR_CLAUDE_MD).toContain('list_projects')
    expect(ORCHESTRATOR_CLAUDE_MD).toMatch(/vertraut/)
  })
})
