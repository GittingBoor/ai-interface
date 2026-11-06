import { describe, expect, it, vi } from 'vitest'
import type { KnowledgeDraft, KnowledgeProgress } from '../../src/shared/knowledge'
import type { Favorite, QuotaState, TerminalInfo, TerminalOpenRequest } from '../../src/shared/types'
import type { InspectedProject } from '../../src/main/knowledge/KnowledgeInspector'
import type { OrchestratorTool } from '../../src/main/orchestrator/orchestratorTools'
import type { LaunchExtras } from '../../src/main/terminal/TerminalService'
import {
  KNOWLEDGE_CLOSE_DELAY_MS,
  KNOWLEDGE_RUN_TIMEOUT_MS,
  KnowledgeService,
  type KnowledgeRunHooks,
  type KnowledgeServiceDeps
} from '../../src/main/knowledge/KnowledgeService'

type Status = InspectedProject['status']

interface Spec {
  readonly id: number
  readonly status: Status
  readonly lastActivity?: number
  readonly newProtocols?: number
}

interface Scheduled {
  readonly run: () => void
  readonly ms: number
  cancelled: boolean
}

const DRAFT: KnowledgeDraft = { summary: 'S', architecture: { nodes: [], edges: [] }, features: [], timeline: [], concepts: [], gaps: [] }

function favorite(id: number): Favorite {
  return { id, host: 'local', path: `/projekte/p${id}`, name: `Projekt ${id}`, color: '#8fb573', sortOrder: id, createdAt: 0, categoryId: null, starred: false, icon: null }
}

function inspected(spec: Spec): InspectedProject {
  return {
    favorite: favorite(spec.id),
    status: spec.status,
    knowledge: null,
    current: { head: 'abc1234', protocolDate: null },
    newProtocols: spec.newProtocols ?? 0,
    newCommits: 0,
    lastActivity: spec.lastActivity ?? spec.id
  }
}

function quotaAt(percent: number): QuotaState {
  return { status: 'ok', windows: [{ kind: 'five_hour', percent, resetsAt: null }], fetchedAt: 0 }
}

const TOOLS: OrchestratorTool[] = ['project_info', 'save_knowledge', 'finish'].map((name) => ({
  name,
  description: name,
  schema: {},
  mutating: name === 'save_knowledge',
  run: async () => ''
}))

class Harness {
  percent = 0
  readonly opened: { request: TerminalOpenRequest; extras: LaunchExtras; info: TerminalInfo }[] = []
  readonly closed: string[] = []
  readonly hooks = new Map<number, KnowledgeRunHooks>()
  readonly stopped: number[] = []
  readonly scheduled: Scheduled[] = []
  readonly progress: KnowledgeProgress[] = []
  readonly errors: string[] = []
  readonly failStart = new Set<number>()
  readonly trusted: string[] = []
  /** Speichern schreibt die Datei: Danach meldet die Prüfung das Projekt als aktuell. */
  readonly write = vi.fn(async (p: InspectedProject, _d: KnowledgeDraft) => {
    this.setStatus(p.favorite.id, 'current')
  })
  readonly service: KnowledgeService

  constructor(private specs: Spec[]) {
    const deps: KnowledgeServiceDeps = {
      favorites: () => this.specs.map((s) => favorite(s.id)),
      inspector: { inspect: async (favorites) => favorites.map((f) => inspected(this.specs.find((s) => s.id === f.id) ?? { id: f.id, status: 'missing' })) },
      quota: () => quotaAt(this.percent),
      ensureTrusted: async (dir) => void this.trusted.push(dir),
      workspace: {
        dir: '/arbeit/projektwissen',
        ensureClaudeMd: async () => '/arbeit/projektwissen/CLAUDE.md',
        writeMcpConfig: async (runId) => `/arbeit/projektwissen/mcp-${runId}.json`,
        removeMcpConfig: async () => undefined
      },
      createServer: (project, hooks) => {
        const id = project.favorite.id
        this.hooks.set(id, hooks)
        return {
          tools: TOOLS,
          start: async () => {
            if (this.failStart.has(id)) throw new Error(`Port belegt für ${id}`)
            return { url: 'http://127.0.0.1:1/mcp', token: 't' }
          },
          stop: async () => void this.stopped.push(id)
        }
      },
      openTerminal: async (request, extras) => {
        const info: TerminalInfo = { id: `t${this.opened.length + 1}`, host: 'local', path: request.path, mode: 'new', title: request.title, running: true, startedAt: 0 }
        this.opened.push({ request, extras, info })
        return info
      },
      closeTerminal: (id) => void this.closed.push(id),
      write: this.write,
      onProgress: (p) => void this.progress.push(p),
      schedule: (run, ms) => {
        const entry: Scheduled = { run, ms, cancelled: false }
        this.scheduled.push(entry)
        return () => (entry.cancelled = true)
      },
      logError: (message) => void this.errors.push(message)
    }
    this.service = new KnowledgeService(deps)
  }

  /** Durchgang für alle Projekte des Tests (wie „alle angehakt“ im Bestätigungsdialog). */
  refreshAll(): Promise<void> {
    return this.service.refresh(this.specs.map((spec) => spec.id))
  }

  setStatus(id: number, status: Status): void {
    this.specs = this.specs.map((s) => (s.id === id ? { ...s, status } : s))
  }

  terminalOf(favoriteId: number): string {
    const entry = this.opened.find((o) => o.request.title === `Projektwissen: Projekt ${favoriteId}`)
    if (!entry) throw new Error(`kein Terminal für ${favoriteId}`)
    return entry.info.id
  }

  openedIds(): number[] {
    return this.opened.map((o) => Number(o.request.title.replace('Projektwissen: Projekt ', '')))
  }

  fire(ms: number): void {
    for (const entry of this.scheduled.filter((e) => e.ms === ms && !e.cancelled)) {
      entry.cancelled = true
      entry.run()
    }
  }

  async status(id: number): Promise<string> {
    const project = (await this.service.list()).find((p) => p.favoriteId === id)
    return project?.status ?? 'fehlt'
  }

  async error(id: number): Promise<string | null> {
    return (await this.service.list()).find((p) => p.favoriteId === id)?.error ?? null
  }
}

async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setTimeout(resolve, 0))
}

const missing = (count: number): Spec[] => Array.from({ length: count }, (_, i) => ({ id: i + 1, status: 'missing' as const }))

describe('KnowledgeService', () => {
  it('starts at most 3 runs and refills on close', async () => {
    const h = new Harness(missing(5))
    await h.refreshAll()
    expect(h.opened).toHaveLength(3)
    expect(h.openedIds()).toEqual([5, 4, 3])
    expect(h.service.progress()).toMatchObject({ active: true, total: 5, done: 0 })
    await h.service.handleClosed(h.terminalOf(5))
    expect(h.opened).toHaveLength(4)
    expect(h.openedIds()[3]).toBe(2)
    expect(h.service.progress()).toMatchObject({ done: 1 })
    expect(h.stopped).toContain(5)
  })

  it('second refresh while active does nothing', async () => {
    const h = new Harness(missing(2))
    await h.refreshAll()
    await h.refreshAll()
    expect(h.opened).toHaveLength(2)
  })

  it('current projects are not started', async () => {
    const h = new Harness([{ id: 1, status: 'current' }, { id: 2, status: 'stale' }])
    await h.refreshAll()
    expect(h.openedIds()).toEqual([2])
    expect(await h.status(1)).toBe('current')
    expect(await h.status(2)).toBe('running')
  })

  it('deferred by quota are reported in progress', async () => {
    const h = new Harness([{ id: 1, status: 'missing', newProtocols: 100 }, { id: 2, status: 'missing' }])
    h.percent = 80
    await h.refreshAll()
    expect(h.openedIds()).toEqual([2])
    expect(h.service.progress().deferred).toBe(1)
    expect(await h.status(1)).toBe('deferred')
  })

  it('stops refilling at 95 percent', async () => {
    const h = new Harness(missing(4))
    await h.refreshAll()
    h.percent = 96
    await h.service.handleClosed(h.terminalOf(4))
    expect(h.opened).toHaveLength(3)
    expect(await h.status(1)).toBe('deferred')
    expect(h.service.progress()).toMatchObject({ deferred: 1, total: 3 })
  })

  it('timeout closes terminal and marks failed, then the next one starts', async () => {
    const h = new Harness(missing(4))
    await h.refreshAll()
    expect(h.scheduled.filter((e) => e.ms === KNOWLEDGE_RUN_TIMEOUT_MS)).toHaveLength(3)
    const terminal = h.terminalOf(4)
    h.scheduled.find((e) => e.ms === KNOWLEDGE_RUN_TIMEOUT_MS)?.run()
    await flush()
    expect(h.closed).toContain(terminal)
    expect(await h.status(4)).toBe('failed')
    expect(await h.error(4)).toBe('Zeitlimit von 20 Minuten erreicht')
    expect(h.openedIds()).toEqual([4, 3, 2, 1])
    await h.service.handleClosed(terminal)
    expect(h.service.progress().done).toBe(1)
  })

  it('closed without save marks failed', async () => {
    const h = new Harness(missing(1))
    await h.refreshAll()
    await h.service.handleClosed(h.terminalOf(1))
    expect(await h.status(1)).toBe('failed')
    expect(await h.error(1)).not.toBeNull()
    expect(h.service.progress()).toMatchObject({ active: false, done: 1, runs: [] })
  })

  it('save then finish marks current', async () => {
    const h = new Harness(missing(1))
    await h.refreshAll()
    const hooks = h.hooks.get(1)
    await hooks?.save(DRAFT)
    expect(h.write).toHaveBeenCalledWith(expect.objectContaining({ favorite: expect.objectContaining({ id: 1 }) }), DRAFT)
    hooks?.finish('fertig')
    expect(h.closed).toHaveLength(0)
    h.fire(KNOWLEDGE_CLOSE_DELAY_MS)
    await flush()
    expect(h.closed).toEqual([h.terminalOf(1)])
    expect(await h.status(1)).toBe('current')
    expect(await h.error(1)).toBeNull()
    expect(h.scheduled.find((e) => e.ms === KNOWLEDGE_RUN_TIMEOUT_MS)?.cancelled).toBe(true)
  })

  it('plan lists only projects that need a run, with an estimate, and starts nothing', async () => {
    const h = new Harness([{ id: 1, status: 'missing' }, { id: 2, status: 'current' }, { id: 3, status: 'stale', newProtocols: 2 }])
    h.percent = 40
    const plan = await h.service.plan()
    expect(plan.items.map((i) => [i.favoriteId, i.status])).toEqual([[1, 'missing'], [3, 'stale']])
    expect(plan.items[1]?.estimate).toBeGreaterThan(plan.items[0]?.estimate ?? 0)
    expect(plan).toMatchObject({ enabled: 3, quotaPercent: 40, stopPercent: 95 })
    expect(h.opened).toHaveLength(0)
  })

  it('refresh starts only the selected projects', async () => {
    const h = new Harness(missing(3))
    await h.service.refresh([2])
    expect(h.openedIds()).toEqual([2])
    expect(h.service.progress().total).toBe(1)
  })

  it('after a successful run, later commits show the project as stale again', async () => {
    const h = new Harness(missing(1))
    await h.refreshAll()
    await h.hooks.get(1)?.save(DRAFT)
    await h.service.handleClosed(h.terminalOf(1))
    expect(await h.status(1)).toBe('current')
    h.setStatus(1, 'stale')
    expect(await h.status(1)).toBe('stale')
  })

  it('timeout after save keeps the saved knowledge', async () => {
    const h = new Harness(missing(1))
    await h.refreshAll()
    await h.hooks.get(1)?.save(DRAFT)
    h.fire(KNOWLEDGE_RUN_TIMEOUT_MS)
    await flush()
    expect(await h.status(1)).toBe('current')
    expect(await h.error(1)).toBeNull()
  })

  it('a project whose check failed is shown as failed and not started', async () => {
    const h = new Harness([{ id: 1, status: 'failed' }, { id: 2, status: 'missing' }])
    await h.refreshAll()
    expect(h.openedIds()).toEqual([2])
    expect(await h.status(1)).toBe('failed')
  })

  it('run args contain --model opus and background flag', async () => {
    const h = new Harness(missing(1))
    await h.refreshAll()
    const { request, extras } = h.opened[0] ?? expect.unreachable()
    expect(request).toMatchObject({ host: 'local', path: '/arbeit/projektwissen', mode: 'new', title: 'Projektwissen: Projekt 1', cols: 120, rows: 32 })
    expect(extras.background).toBe('knowledge')
    expect(extras.initialPrompt).toContain('Projekt 1')
    const args = extras.extraArgs ?? []
    expect(args.slice(0, 2)).toEqual(['--model', 'opus'])
    expect(args[args.indexOf('--mcp-config') + 1]).toBe('/arbeit/projektwissen/mcp-p1.json')
    expect(args[args.indexOf('--allowedTools') + 1]).toBe('mcp__projektwissen__project_info,mcp__projektwissen__save_knowledge,mcp__projektwissen__finish')
    expect(args).toContain('--strict-mcp-config')
    expect(args[args.indexOf('--disallowedTools') + 1]).toMatch(/Bash/)
    expect(h.trusted).toEqual(['/arbeit/projektwissen'])
    expect(h.service.isKnowledgeTerminal(h.opened[0]?.info.id ?? '')).toBe(true)
    expect(h.service.progress().runs).toEqual([{ favoriteId: 1, terminalId: 't1' }])
  })

  it('unreachable projects keep status and do not block others', async () => {
    const h = new Harness([{ id: 1, status: 'unreachable' }, { id: 2, status: 'missing' }])
    await h.refreshAll()
    expect(h.openedIds()).toEqual([2])
    expect(await h.status(1)).toBe('unreachable')
  })

  it('a run that fails to start is marked failed and the queue continues', async () => {
    const h = new Harness(missing(4))
    h.failStart.add(4)
    await h.refreshAll()
    expect(h.openedIds()).toEqual([3, 2, 1])
    expect(await h.status(4)).toBe('failed')
    expect(await h.error(4)).toBe('Port belegt für 4')
    expect(h.errors).toHaveLength(1)
  })

  it('stop closes terminals, cancels timers and stops servers', async () => {
    const h = new Harness(missing(2))
    await h.refreshAll()
    await h.service.stop()
    expect(h.closed.sort()).toEqual(['t1', 't2'])
    expect(h.stopped.sort()).toEqual([1, 2])
    expect(h.scheduled.every((e) => e.cancelled)).toBe(true)
    expect(h.service.progress()).toMatchObject({ active: false, runs: [] })
  })
})
