import { describe, expect, it } from 'vitest'
import type { OrchestratorSettings, TerminalInfo, TerminalOpenRequest } from '@shared/types'
import type { LaunchExtras } from '../../src/main/terminal/TerminalService'
import { OrchestratorService, orchestratorClaudeArgs } from '../../src/main/orchestrator/OrchestratorService'

const TOOLS = [
  { name: 'list_projects', mutating: false },
  { name: 'open_project_terminal', mutating: true },
  { name: 'send_to_terminal', mutating: true }
]

describe('orchestratorClaudeArgs', () => {
  it('mit Rückfrage: nur Lesewerkzeuge freigegeben', () => {
    expect(orchestratorClaudeArgs('/o/mcp.json', true, TOOLS)).toEqual(['--mcp-config', '/o/mcp.json', '--allowedTools', 'mcp__orchestrator__list_projects'])
  })

  it('ohne Rückfrage: alle Werkzeuge freigegeben', () => {
    expect(orchestratorClaudeArgs('/o/mcp.json', false, TOOLS)[3]).toBe(
      'mcp__orchestrator__list_projects,mcp__orchestrator__open_project_terminal,mcp__orchestrator__send_to_terminal'
    )
  })
})

function setup(settings: OrchestratorSettings = { enabled: true, confirmBeforeSend: true }, failOpen = false) {
  const calls = { start: 0, stop: 0, opened: [] as { request: TerminalOpenRequest; extras: LaunchExtras }[] }
  const open = new Map<string, TerminalInfo>()
  const service = new OrchestratorService({
    workspace: {
      prepare: async () => ({ dir: '/o', claudeMd: '/o/CLAUDE.md', mcpConfig: '/o/mcp.json' }),
      ensureClaudeMd: async () => '/o/CLAUDE.md'
    },
    server: {
      start: async () => {
        calls.start++
        return { url: 'http://127.0.0.1:1/mcp', token: 't' }
      },
      stop: async () => void calls.stop++
    },
    tools: TOOLS,
    settings: () => settings,
    openTerminal: async (request, extras) => {
      await new Promise((r) => setTimeout(r, 10))
      if (failOpen) throw new Error('claude fehlt')
      calls.opened.push({ request, extras })
      const info: TerminalInfo = { id: `o${calls.opened.length}`, host: 'local', path: request.path, mode: request.mode, title: request.title, running: true, startedAt: 0, orchestrator: true }
      open.set(info.id, info)
      return info
    },
    terminal: (id) => open.get(id)
  })
  return { service, calls, open }
}

describe('OrchestratorService', () => {
  it('öffnet ein Orchestrator-Terminal im Arbeitsordner mit MCP-Argumenten', async () => {
    const { service, calls } = setup()
    const info = await service.open('continue')
    expect(info.orchestrator).toBe(true)
    expect(calls.opened[0]?.request).toMatchObject({ host: 'local', path: '/o', mode: 'continue', title: 'Orchestrator' })
    expect(calls.opened[0]?.extras).toEqual({ orchestrator: true, extraArgs: ['--mcp-config', '/o/mcp.json', '--allowedTools', 'mcp__orchestrator__list_projects'] })
    expect(service.currentId()).toBe(info.id)
  })

  it('gleichzeitiges und wiederholtes Öffnen ergibt ein Terminal und einen Server', async () => {
    const { service, calls } = setup()
    const [a, b] = await Promise.all([service.open('new'), service.open('new')])
    const c = await service.open('new')
    expect(a.id).toBe(b.id)
    expect(c.id).toBe(a.id)
    expect(calls.opened).toHaveLength(1)
    expect(calls.start).toBe(1)
  })

  it('Schließen des Terminals stoppt den Server, danach öffnet es neu', async () => {
    const { service, calls, open } = setup()
    const first = await service.open('new')
    await service.handleClosed('fremd')
    expect(calls.stop).toBe(0)
    open.delete(first.id)
    await service.handleClosed(first.id)
    expect(calls.stop).toBe(1)
    expect(service.currentId()).toBeNull()
    expect((await service.open('continue')).id).not.toBe(first.id)
  })

  it('ist ausgeschaltet nicht verfügbar', async () => {
    const { service, calls } = setup({ enabled: false, confirmBeforeSend: true })
    await expect(service.open('new')).rejects.toThrow(/Orchestrator nicht verfügbar/)
    expect(calls.start).toBe(0)
  })

  it('stoppt den Server, wenn das Terminal nicht startet', async () => {
    const { service, calls } = setup(undefined, true)
    await expect(service.open('new')).rejects.toThrow(/claude fehlt/)
    expect(calls.stop).toBe(1)
    expect(service.currentId()).toBeNull()
  })
})
