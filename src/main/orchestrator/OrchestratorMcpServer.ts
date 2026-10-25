import { randomBytes, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { toErrorInfo } from '../errors'
import type { OrchestratorTool } from './orchestratorTools'
import type { McpEndpoint } from './OrchestratorWorkspace'

const LOOPBACK = '127.0.0.1'
const MCP_PATH = '/mcp'
const TOKEN_BYTES = 32
const SERVER_INFO = { name: 'ai-interface-orchestrator', version: '1.0.0' }
const HTTP_UNAUTHORIZED = 401
const HTTP_NOT_FOUND = 404
const HTTP_BAD_REQUEST = 400
const HTTP_INTERNAL_ERROR = 500

function tokenMatches(header: string | undefined, token: string): boolean {
  const expected = Buffer.from(`Bearer ${token}`)
  const given = Buffer.from(header ?? '')
  return given.length === expected.length && timingSafeEqual(given, expected)
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const text = Buffer.concat(chunks).toString('utf8')
  return text ? (JSON.parse(text) as unknown) : undefined
}

async function callTool(tool: OrchestratorTool, args: unknown): Promise<CallToolResult> {
  try {
    return { content: [{ type: 'text', text: await tool.run(args) }] }
  } catch (error) {
    const info = toErrorInfo(error)
    return { content: [{ type: 'text', text: info.hint ? `${info.message} ${info.hint}` : info.message }], isError: true }
  }
}

/** MCP-Server für das Orchestrator-Terminal: nur Loopback, nur mit Token, zustandslos je Anfrage. */
export class OrchestratorMcpServer {
  private http: Server | null = null

  constructor(
    private readonly tools: () => readonly OrchestratorTool[],
    private readonly logError: (message: string, error: unknown) => void
  ) {}

  /** Läuft er schon, wird er erst gestoppt (neues Token). */
  async start(): Promise<McpEndpoint> {
    await this.stop()
    const token = randomBytes(TOKEN_BYTES).toString('hex')
    const http = createServer((req, res) => void this.handle(req, res, token))
    await new Promise<void>((resolve, reject) => {
      http.once('error', reject)
      http.listen(0, LOOPBACK, () => resolve())
    })
    this.http = http
    const { port } = http.address() as AddressInfo
    return { url: `http://${LOOPBACK}:${port}${MCP_PATH}`, token }
  }

  async stop(): Promise<void> {
    const http = this.http
    this.http = null
    if (!http) return
    http.closeAllConnections()
    await new Promise<void>((resolve) => http.close(() => resolve()))
  }

  private async handle(req: IncomingMessage, res: ServerResponse, token: string): Promise<void> {
    if (!tokenMatches(req.headers.authorization, token)) return void res.writeHead(HTTP_UNAUTHORIZED).end()
    if (new URL(req.url ?? '/', `http://${LOOPBACK}`).pathname !== MCP_PATH) return void res.writeHead(HTTP_NOT_FOUND).end()
    let body: unknown
    try {
      body = req.method === 'POST' ? await readJson(req) : undefined
    } catch {
      return void res.writeHead(HTTP_BAD_REQUEST).end()
    }
    const mcp = this.buildServer()
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
    res.on('close', () => {
      void transport.close()
      void mcp.close()
    })
    try {
      await mcp.connect(transport)
      await transport.handleRequest(req, res, body)
    } catch (error) {
      this.logError('Orchestrator-MCP-Anfrage', error)
      if (!res.headersSent) res.writeHead(HTTP_INTERNAL_ERROR).end()
    }
  }

  private buildServer(): McpServer {
    const mcp = new McpServer(SERVER_INFO)
    for (const tool of this.tools()) {
      mcp.registerTool(tool.name, { description: tool.description, inputSchema: tool.schema }, (args) => callTool(tool, args))
    }
    return mcp
  }
}
