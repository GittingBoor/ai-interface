import { describe, expect, it } from 'vitest'
import type { Category, Favorite, TerminalInfo, TerminalStatus } from '@shared/types'
import { createOrchestratorTools, type OrchestratorDeps, type OrchestratorTool } from '../../src/main/orchestrator/orchestratorTools'

const project = (id: number, name: string, host = 'local'): Favorite => ({
  id,
  host,
  path: `/p/${name}`,
  name,
  color: '#e08a4f',
  sortOrder: id,
  createdAt: 0,
  categoryId: 1,
  starred: false,
  icon: null
})
const category: Category = { id: 1, name: 'Programmieren', color: '#8fb573', icon: null, sortOrder: 0 }
const terminal = (id: string, extra: Partial<TerminalInfo> = {}): TerminalInfo => ({
  id,
  host: 'local',
  path: '/p/a',
  mode: 'new',
  title: id,
  running: true,
  startedAt: 0,
  ...extra
})

interface Harness {
  readonly tools: Map<string, OrchestratorTool>
  readonly written: string[]
  readonly tracked: string[]
  readonly opened: { project: string; task: string }[]
}

function harness(statuses: Record<string, TerminalStatus> = {}): Harness {
  const written: string[] = []
  const tracked: string[] = []
  const opened: { project: string; task: string }[] = []
  const deps: OrchestratorDeps = {
    projects: () => [project(1, 'alpha'), project(2, 'beta', 'mini-pc')],
    categories: () => [category],
    hostLabel: (host) => (host === 'local' ? 'Dieser PC' : 'Mini-PC'),
    terminals: () => [terminal('orch', { orchestrator: true }), terminal('t1'), terminal('t2'), terminal('sh', { mode: 'shell' })],
    status: (id) => statuses[id] ?? 'idle',
    lastAnswer: (id) => (id === 't1' ? 'Alles erledigt.' : null),
    pendingPrompt: (id) => (id === 't1' && statuses['t1'] === 'question' ? 'Welche Datenbank?' : null),
    snapshot: () => '\x1b[32mzeile 1\x1b[0m\r\nzeile 2\r\n',
    openTerminal: async (p, task) => {
      opened.push({ project: p.name, task })
      return terminal('neu', { path: p.path, host: p.host })
    },
    write: (_id, data) => void written.push(data),
    sleep: async () => undefined,
    track: (id) => void tracked.push(id)
  }
  return { tools: new Map(createOrchestratorTools(deps).map((t) => [t.name, t])), written, tracked, opened }
}

const run = (h: Harness, name: string, input: unknown = {}): Promise<string> => {
  const tool = h.tools.get(name)
  if (!tool) throw new Error(`Werkzeug ${name} fehlt`)
  return tool.run(input)
}

describe('orchestratorTools', () => {
  it('nur open_project_terminal und send_to_terminal ändern etwas', () => {
    const h = harness()
    expect([...h.tools.values()].filter((t) => t.mutating).map((t) => t.name).sort()).toEqual(['open_project_terminal', 'send_to_terminal'])
  })

  it('list_projects liefert Projekte mit Gerät und Art', async () => {
    const result = JSON.parse(await run(harness(), 'list_projects')) as unknown[]
    expect(result).toEqual([
      { id: 1, name: 'alpha', device: 'Dieser PC', path: '/p/alpha', category: 'Programmieren' },
      { id: 2, name: 'beta', device: 'Mini-PC', path: '/p/beta', category: 'Programmieren' }
    ])
  })

  it('list_terminals kennzeichnet den Orchestrator und zeigt den Status', async () => {
    const result = JSON.parse(await run(harness({ t1: 'working' }), 'list_terminals')) as { id: string; status: string; orchestrator: boolean }[]
    expect(result.map((t) => [t.id, t.status, t.orchestrator])).toEqual([
      ['orch', 'idle', true],
      ['t1', 'working', false],
      ['t2', 'idle', false],
      ['sh', 'idle', false]
    ])
  })

  it('read_terminal nimmt die letzte Antwort, sonst die letzten Zeilen ohne ANSI, jeweils mit Status', async () => {
    const h = harness()
    expect(await run(h, 'read_terminal', { terminalId: 't1' })).toBe('Status: idle\nLetzte Antwort:\nAlles erledigt.')
    expect(await run(h, 'read_terminal', { terminalId: 't2' })).toBe('Status: idle\nLetzte Zeilen:\nzeile 1\nzeile 2')
  })

  it('read_terminal zeigt eine offene Frage statt der alten Antwort', async () => {
    expect(await run(harness({ t1: 'question' }), 'read_terminal', { terminalId: 't1' })).toBe('Status: question\nOffene Frage:\nWelche Datenbank?')
  })

  it('read_terminal kennzeichnet eine alte Antwort, während Claude arbeitet', async () => {
    expect(await run(harness({ t1: 'working' }), 'read_terminal', { terminalId: 't1' })).toBe('Status: working\nLetzte Antwort (von vorher, Claude arbeitet gerade):\nAlles erledigt.')
  })

  it('unbekanntes oder verborgenes Terminal: nicht gefunden mit Hinweis', async () => {
    await expect(run(harness(), 'read_terminal', { terminalId: 'versteckt' })).rejects.toThrow(/Terminal versteckt wurde nicht gefunden/)
    await expect(run(harness(), 'send_to_terminal', { terminalId: 'versteckt', text: 'x' })).rejects.toThrow(/nicht gefunden/)
  })

  it('open_project_terminal öffnet das Projekt mit Aufgabe und beobachtet es', async () => {
    const h = harness()
    const result = JSON.parse(await run(h, 'open_project_terminal', { projectId: 2, task: 'Tests reparieren' })) as { terminalId: string; hint: string }
    expect(result.terminalId).toBe('neu')
    expect(result.hint).toMatch(/vertraut/)
    expect(h.opened).toEqual([{ project: 'beta', task: 'Tests reparieren' }])
    expect(h.tracked).toEqual(['neu'])
  })

  it('unbekannte Projekt-ID verweist auf list_projects', async () => {
    await expect(run(harness(), 'open_project_terminal', { projectId: 99, task: 'x' })).rejects.toThrow(/Projekt mit ID 99/)
  })

  it('leere Aufgabe wird abgelehnt', async () => {
    await expect(run(harness(), 'open_project_terminal', { projectId: 1, task: '   ' })).rejects.toThrow(/Ungültige Eingabe/)
  })

  it('send_to_terminal schreibt nur in wartende Terminals und beobachtet sie', async () => {
    const h = harness({ t1: 'review' })
    await run(h, 'send_to_terminal', { terminalId: 't1', text: 'Weiter so' })
    expect(h.written).toEqual(['\x1b[200~Weiter so\x1b[201~', '\r'])
    expect(h.tracked).toEqual(['t1'])
  })

  it.each(['working', 'permission', 'exited'] as const)('send_to_terminal lehnt Status %s ab', async (status) => {
    const h = harness({ t1: status })
    await expect(run(h, 'send_to_terminal', { terminalId: 't1', text: 'x' })).rejects.toThrow(status === 'exited' ? /beendet/ : /arbeitet noch/)
    expect(h.written).toEqual([])
  })

  it('send_to_terminal schreibt nie in ein reines Shell-Terminal', async () => {
    const h = harness()
    await expect(run(h, 'send_to_terminal', { terminalId: 'sh', text: 'rm -rf x' })).rejects.toThrow(/nur eine Shell/)
    expect(h.written).toEqual([])
  })

  it('send_to_terminal an den Orchestrator selbst wird abgelehnt', async () => {
    await expect(run(harness(), 'send_to_terminal', { terminalId: 'orch', text: 'x' })).rejects.toThrow(/an sich selbst/)
  })
})
