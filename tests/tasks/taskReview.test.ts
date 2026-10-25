import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { ProjectTasks, ReviewedTask, TaskReviewResult, TerminalInfo } from '@shared/types'
import type { ExecResult } from '../../src/main/hosts/Host'
import { createTaskReviewTools, type ReviewProject } from '../../src/main/tasks/taskReviewTools'
import { CLOSE_DELAY_MS, TaskReviewService } from '../../src/main/tasks/TaskReviewService'

const GROUPS: ProjectTasks[] = [
  {
    groupId: 'Programmieren/App',
    label: 'App',
    favoriteId: 1,
    color: null,
    icon: null,
    protocolPath: 'Programmieren/App/Protokoll/2026-10-19.md',
    protocolDate: new Date(2026, 9, 19).getTime(),
    tasks: [{ key: 'tests reparieren', text: 'Tests reparieren' }]
  },
  { groupId: 'Studium/X', label: 'X', favoriteId: null, color: null, icon: null, protocolPath: 'Studium/X/Protokoll/2026-10-01.md', protocolDate: 0, tasks: [{ key: 'lesen', text: 'Lesen' }] }
]

function toolsWith(separator: '/' | '\\' = '/') {
  const commands: string[] = []
  const done: ReviewedTask[] = []
  const finished: string[] = []
  const project: ReviewProject = { name: 'App', host: 'mini-pc', path: '/home/b/app' }
  const tools = createTaskReviewTools({
    tasks: async () => GROUPS,
    project: (id) => (id === 1 ? project : undefined),
    hostLabel: () => 'Mini-PC',
    host: () => ({
      separator,
      exec: async (command): Promise<ExecResult> => {
        commands.push(command)
        return { stdout: 'abc123 (Tests repariert, 2026-10-19)\n', stderr: '', code: 0 }
      },
      readFile: async (path) => Buffer.from(`Inhalt von ${path}`)
    }),
    markDone: (task) => done.push(task),
    finish: (summary) => finished.push(summary)
  })
  const run = (name: string, input: unknown): Promise<string> => {
    const tool = tools.find((t) => t.name === name)
    if (!tool) throw new Error(`Werkzeug ${name} fehlt`)
    return tool.run(input)
  }
  return { run, commands, done, finished }
}

describe('Werkzeuge der Aufgaben-Prüfung', () => {
  it('listet Aufgaben mit Pfad, Rechner und Datum', async () => {
    const list = JSON.parse(await toolsWith().run('list_open_tasks', {})) as { path: string | null; device: string | null; protocolDate: string }[]
    expect(list[0]).toMatchObject({ path: '/home/b/app', device: 'Mini-PC', protocolDate: '2026-10-19' })
    expect(list[1]).toMatchObject({ path: null, device: null })
  })

  it('ruft git im Projektordner auf und quotiert je Shell', async () => {
    const posix = toolsWith('/')
    await posix.run('git_grep', { groupId: 'Programmieren/App', text: "it's" })
    expect(posix.commands[0]).toBe(`git -C '/home/b/app' grep -n -I -F -i --max-count=5 -e 'it'\\''s'`)
    const win = toolsWith('\\')
    await win.run('git_log', { groupId: 'Programmieren/App', limit: 5 })
    expect(win.commands[0]).toBe('git -C "/home/b/app" log --all -n 5 --pretty=reference')
    await expect(win.run('git_grep', { groupId: 'Programmieren/App', text: '100%' })).rejects.toThrow(/Windows/)
  })

  it('verweigert Pfade außerhalb des Projekts', async () => {
    const t = toolsWith()
    await expect(t.run('read_project_file', { groupId: 'Programmieren/App', path: '../secret' })).rejects.toThrow(/relativ/)
    await expect(t.run('read_project_file', { groupId: 'Programmieren/App', path: '/etc/passwd' })).rejects.toThrow(/relativ/)
    expect(await t.run('read_project_file', { groupId: 'Programmieren/App', path: 'src/a.ts' })).toBe('Inhalt von /home/b/app/src/a.ts')
  })

  it('Gruppe ohne Projektordner: git meldet einen Hinweis', async () => {
    await expect(toolsWith().run('git_log', { groupId: 'Studium/X' })).rejects.toThrow(/Projektordner/)
  })

  it('hakt nur bekannte Aufgaben ab und meldet das Ende', async () => {
    const t = toolsWith()
    await expect(t.run('mark_done', { groupId: 'Programmieren/App', key: 'gibt es nicht', reason: 'x' })).rejects.toThrow(/nicht gefunden/)
    await t.run('mark_done', { groupId: 'Programmieren/App', key: 'tests reparieren', reason: 'Commit abc123' })
    await t.run('finish', { summary: 'Eine Aufgabe erledigt.' })
    expect(t.done).toEqual([{ groupId: 'Programmieren/App', key: 'tests reparieren', text: 'Tests reparieren', label: 'App', reason: 'Commit abc123' }])
    expect(t.finished).toEqual(['Eine Aufgabe erledigt.'])
  })
})

describe('TaskReviewService', () => {
  let dir = ''
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true })
  })

  async function setup() {
    dir = await mkdtemp(join(tmpdir(), 'review-'))
    const calls = { stop: 0, closed: [] as string[], checks: [] as string[], results: [] as TaskReviewResult[], scheduled: [] as { run: () => void; ms: number }[] }
    const open = new Map<string, TerminalInfo>()
    let opened: { args: readonly string[]; prompt: string | undefined } | null = null
    const service = new TaskReviewService({
      dir,
      toolNames: ['list_open_tasks', 'finish'],
      server: { start: async () => ({ url: 'http://127.0.0.1:1/mcp', token: 't' }), stop: async () => void calls.stop++ },
      openTerminal: async (request, extras) => {
        opened = { args: extras.extraArgs ?? [], prompt: extras.initialPrompt }
        const info: TerminalInfo = { id: `r${open.size + 1}`, host: 'local', path: request.path, mode: request.mode, title: request.title, running: true, startedAt: 0 }
        open.set(info.id, info)
        return info
      },
      closeTerminal: (id) => calls.closed.push(id),
      terminal: (id) => open.get(id),
      onFinished: (result) => calls.results.push(result),
      check: (groupId, key) => calls.checks.push(`${groupId}|${key}`),
      schedule: (run, ms) => calls.scheduled.push({ run, ms })
    })
    return { service, calls, opened: () => opened }
  }

  const task: ReviewedTask = { groupId: 'g', key: 'k', text: 'T', label: 'L', reason: 'R' }

  it('öffnet einmal, schreibt mcp.json und gibt nur die eigenen Werkzeuge frei', async () => {
    const { service, opened } = await setup()
    const [a, b] = await Promise.all([service.open(), service.open()])
    expect(a.id).toBe(b.id)
    expect(opened()?.args).toEqual(['--mcp-config', join(dir, 'mcp.json'), '--allowedTools', 'mcp__aufgaben__list_open_tasks,mcp__aufgaben__finish'])
    expect(opened()?.prompt).toContain('mark_done')
    expect(JSON.parse(await readFile(join(dir, 'mcp.json'), 'utf8'))).toMatchObject({ mcpServers: { aufgaben: { type: 'http' } } })
  })

  it('finish: meldet das Ergebnis und schließt das Terminal verzögert', async () => {
    const { service, calls } = await setup()
    const info = await service.open()
    service.markDone(task)
    service.markDone(task)
    service.finish('fertig')
    expect(calls.checks).toEqual(['g|k', 'g|k'])
    expect(calls.results).toEqual([{ checked: [task], summary: 'fertig', finished: true }])
    expect(calls.scheduled[0]?.ms).toBe(CLOSE_DELAY_MS)
    calls.scheduled[0]?.run()
    expect(calls.closed).toEqual([info.id])
    await service.handleClosed(info.id)
    expect(calls.results).toHaveLength(1)
    expect(calls.stop).toBe(1)
  })

  it('vorzeitig geschlossen: meldet den Zwischenstand', async () => {
    const { service, calls } = await setup()
    const info = await service.open()
    service.markDone(task)
    await service.handleClosed('anderes')
    expect(calls.results).toHaveLength(0)
    await service.handleClosed(info.id)
    expect(calls.results).toEqual([{ checked: [task], summary: null, finished: false }])
  })
})
