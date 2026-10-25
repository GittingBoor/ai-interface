import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { OrchestratorMcpServer } from '../../src/main/orchestrator/OrchestratorMcpServer'
import type { OrchestratorTool } from '../../src/main/orchestrator/orchestratorTools'
import { NotFoundError } from '../../src/main/errors'

const tools: OrchestratorTool[] = [
  { name: 'list_projects', description: 'Projekte', schema: {}, mutating: false, run: async () => '[{"id":1}]' },
  {
    name: 'read_terminal',
    description: 'Lesen',
    schema: { terminalId: z.string() },
    mutating: false,
    run: async () => {
      throw new NotFoundError('Terminal x', 'Hole die Liste mit list_terminals.')
    }
  }
]

let server: OrchestratorMcpServer | null = null
afterEach(async () => {
  await server?.stop()
  server = null
})

async function connect(url: string, token: string): Promise<Client> {
  const client = new Client({ name: 'test', version: '1.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }))
  return client
}

describe('OrchestratorMcpServer', () => {
  it('lauscht nur auf 127.0.0.1 und lehnt Anfragen ohne Token ab', async () => {
    server = new OrchestratorMcpServer(() => tools, () => undefined)
    const endpoint = await server.start()
    expect(new URL(endpoint.url).hostname).toBe('127.0.0.1')
    expect(endpoint.token).toMatch(/^[0-9a-f]{64}$/)
    const response = await fetch(endpoint.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    expect(response.status).toBe(401)
    const wrong = await fetch(endpoint.url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer falsch' }, body: '{}' })
    expect(wrong.status).toBe(401)
  })

  it('liefert mit Token die Werkzeuge und ihre Ergebnisse', async () => {
    server = new OrchestratorMcpServer(() => tools, () => undefined)
    const endpoint = await server.start()
    const client = await connect(endpoint.url, endpoint.token)
    const listed = await client.listTools()
    expect(listed.tools.map((t) => t.name).sort()).toEqual(['list_projects', 'read_terminal'])
    const result = await client.callTool({ name: 'list_projects', arguments: {} })
    expect(result.content).toEqual([{ type: 'text', text: '[{"id":1}]' }])
    await client.close()
  })

  it('gibt Werkzeugfehler als Text mit Hinweis zurück', async () => {
    server = new OrchestratorMcpServer(() => tools, () => undefined)
    const endpoint = await server.start()
    const client = await connect(endpoint.url, endpoint.token)
    const result = await client.callTool({ name: 'read_terminal', arguments: { terminalId: 'x' } })
    expect(result.isError).toBe(true)
    expect(result.content).toEqual([{ type: 'text', text: 'Terminal x wurde nicht gefunden. Hole die Liste mit list_terminals.' }])
    await client.close()
  })

  it('stop gibt den Port frei und ist mehrfach aufrufbar', async () => {
    server = new OrchestratorMcpServer(() => tools, () => undefined)
    const endpoint = await server.start()
    await server.stop()
    await server.stop()
    await expect(fetch(endpoint.url, { method: 'POST' })).rejects.toThrow()
  })
})
