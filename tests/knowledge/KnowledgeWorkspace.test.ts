import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { KnowledgeWorkspace } from '../../src/main/knowledge/KnowledgeWorkspace'
import { KNOWLEDGE_CLAUDE_MD } from '../../src/main/knowledge/knowledgePrompt'
import { KNOWLEDGE_SERVER } from '../../src/main/knowledge/knowledgeTools'

const endpoint = { url: 'http://127.0.0.1:4711/mcp', token: 'geheim' }

async function workspace(): Promise<KnowledgeWorkspace> {
  return new KnowledgeWorkspace(join(await mkdtemp(join(tmpdir(), 'wissen-')), 'projektwissen'))
}

describe('KnowledgeWorkspace', () => {
  it('ensureClaudeMd keeps user edits', async () => {
    const ws = await workspace()
    const path = await ws.ensureClaudeMd()
    expect(await readFile(path, 'utf8')).toBe(KNOWLEDGE_CLAUDE_MD)
    await writeFile(path, 'eigene Regeln', 'utf8')
    await ws.ensureClaudeMd()
    expect(await readFile(path, 'utf8')).toBe('eigene Regeln')
  })

  it('writeMcpConfig writes bearer header', async () => {
    const ws = await workspace()
    const path = await ws.writeMcpConfig('lauf-1', endpoint)
    expect(path).toBe(join(ws.dir, 'mcp-lauf-1.json'))
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({
      mcpServers: { [KNOWLEDGE_SERVER]: { type: 'http', url: endpoint.url, headers: { Authorization: 'Bearer geheim' } } }
    })
  })

  it('removeMcpConfig löscht die Datei, fehlende Datei ist kein Fehler', async () => {
    const ws = await workspace()
    const path = await ws.writeMcpConfig('lauf-2', endpoint)
    await ws.removeMcpConfig('lauf-2')
    await expect(stat(path)).rejects.toThrow()
    await expect(ws.removeMcpConfig('lauf-2')).resolves.toBeUndefined()
  })

  it('lehnt runIds mit Pfadzeichen ab', async () => {
    const ws = await workspace()
    await expect(ws.writeMcpConfig('../x', endpoint)).rejects.toThrow(/runId/)
  })
})
