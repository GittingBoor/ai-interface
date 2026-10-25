import { describe, expect, it } from 'vitest'
import { MiniPcService } from '../../src/main/minipc/MiniPcService'
import { FakeHost } from '../helpers/FakeHost'

const SYSTEM_OUT = [
  '@@STAT1@@',
  'cpu  100 0 100 800 0 0 0 0 0 0',
  '@@STAT2@@',
  'cpu  150 0 150 900 0 0 0 0 0 0',
  '@@MEM@@',
  'MemTotal: 1000 kB',
  'MemAvailable: 400 kB',
  '@@DF@@',
  '/ 100 40',
  '@@UP@@',
  '60.5 1',
  '@@LOAD@@',
  '1 2 3 1/1 1',
  '@@NPROC@@',
  '4',
  '@@SESS@@',
  JSON.stringify({ pid: 7, cwd: '/home/alex/projects', status: 'busy', startedAt: 5, name: 'p' }),
  '@@ALIVE@@',
  '7',
  ''
].join('\n')

describe('MiniPcService', () => {
  it('setzt System- und Claude-Daten aus einem Aufruf zusammen', async () => {
    const host = new FakeHost('mini-pc', '/home/alex')
    const commands: string[] = []
    host.execHandler = (command) => {
      commands.push(command)
      return { stdout: SYSTEM_OUT, stderr: '', code: 0 }
    }
    const snapshot = await new MiniPcService(() => host, () => 42).snapshot('mini-pc')
    expect(commands).toHaveLength(1)
    expect(snapshot).toMatchObject({ online: true, error: null, fetchedAt: 42 })
    expect(snapshot.system?.cpuPercent).toBeCloseTo(50)
    expect(snapshot.system?.memUsed).toBe(600 * 1024)
    expect(snapshot.claude).toEqual([{ pid: 7, cwd: '/home/alex/projects', status: 'busy', startedAt: 5, name: 'p' }])
  })

  it('meldet einen nicht erreichbaren Mini-PC ohne Ausnahme', async () => {
    const host = new FakeHost('mini-pc')
    host.offline = true
    const snapshot = await new MiniPcService(() => host, () => 1).snapshot('mini-pc')
    expect(snapshot).toMatchObject({ online: false, system: null, claude: [] })
    expect(snapshot.error).toMatch(/nicht erreichbar/)
  })

  it('liest den Git-Stand aller Projekte unter einem Ordner, ~ aufgelöst und gequotet', async () => {
    const host = new FakeHost('mini-pc', '/home/alex')
    let seen = ''
    host.execHandler = (command) => {
      seen = command
      return { stdout: '@@AII@@ /home/alex/my projects/a/\n# branch.head main\n', stderr: '', code: 0 }
    }
    const states = await new MiniPcService(() => host).git('mini-pc', '~/my projects')
    expect(seen).toContain("'/home/alex/my projects'")
    expect(states.map((s) => [s.name, s.branch])).toEqual([['a', 'main']])
  })

  it('fragt den Remote ab und liefert den neuen Stand, Fehler beim Abruf stehen im Ergebnis', async () => {
    const host = new FakeHost('mini-pc', '/home/alex')
    host.execHandler = (command) =>
      command.includes('fetch')
        ? { stdout: "@@FETCH-ERR@@ fatal: could not read from remote\n@@AII@@ /home/alex/projects/a\n# branch.head main\n# branch.ab +0 -3\n", stderr: '', code: 0 }
        : { stdout: '', stderr: '', code: 1 }
    const state = await new MiniPcService(() => host).fetch('mini-pc', "/home/alex/projects/it's")
    expect(state).toMatchObject({ branch: 'main', behind: 3, error: 'fatal: could not read from remote' })
  })
})
