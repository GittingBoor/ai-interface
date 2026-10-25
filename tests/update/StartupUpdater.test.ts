import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { type CommandResult, type CommandRunner, StartupUpdater, type UpdaterFiles } from '../../src/main/update/StartupUpdater'
import { UpdateError } from '../../src/main/errors'

const REPO = join('repo')
const BUILD = 'aaa111'
const REMOTE = 'bbb222'

type Responses = Record<string, CommandResult>

class FakeRunner implements CommandRunner {
  readonly calls: string[] = []
  constructor(private readonly responses: Responses) {}

  async exec(command: string, args: readonly string[]): Promise<CommandResult> {
    const line = [command, ...args].join(' ')
    this.calls.push(line)
    return this.responses[line] ?? { code: 0, stdout: '', stderr: '' }
  }
}

const out = (stdout: string): CommandResult => ({ code: 0, stdout, stderr: '' })
const code = (exitCode: number, stderr = ''): CommandResult => ({ code: exitCode, stdout: '', stderr })

const files = (nodeModules = true): UpdaterFiles => ({
  exists: (path) => (path.endsWith('node_modules') ? nodeModules : true),
  readText: () => JSON.stringify({ version: '0.2.0' })
})

const newerRemote: Responses = {
  'git rev-parse origin/main': out(`${REMOTE}\n`),
  'git rev-parse --abbrev-ref HEAD': out('main\n'),
  [`git diff --quiet ${BUILD} ${REMOTE} -- package-lock.json`]: code(0)
}

describe('StartupUpdater', () => {
  it('meldet aktuell, wenn origin/main dem Build-Commit entspricht', async () => {
    const runner = new FakeRunner({ 'git rev-parse origin/main': out(`${BUILD}\n`) })
    const outcome = await new StartupUpdater(REPO, BUILD, runner, files()).check()
    expect(outcome).toEqual({ kind: 'up-to-date' })
    expect(runner.calls).toEqual(['git fetch origin main', 'git rev-parse origin/main'])
  })

  it('meldet ein verfügbares Update, ohne zu ziehen oder zu bauen', async () => {
    const runner = new FakeRunner(newerRemote)
    const outcome = await new StartupUpdater(REPO, BUILD, runner, files()).check()
    expect(outcome).toEqual({ kind: 'available', remote: REMOTE })
    expect(runner.calls).not.toContain('git merge --ff-only origin/main')
    expect(runner.calls).not.toContain('npm run dist:win')
  })

  it('zieht, baut und liefert den Installer, wenn origin/main neuer ist', async () => {
    const runner = new FakeRunner(newerRemote)
    const installerPath = await new StartupUpdater(REPO, BUILD, runner, files()).build()
    expect(installerPath).toBe(join(REPO, 'release', 'AI Interface Setup 0.2.0.exe'))
    expect(runner.calls).toContain('git merge --ff-only origin/main')
    expect(runner.calls).not.toContain('npm ci')
    expect(runner.calls.at(-1)).toBe('npm run dist:win')
  })

  it('installiert Abhängigkeiten neu, wenn sich package-lock.json geändert hat', async () => {
    const runner = new FakeRunner({ ...newerRemote, [`git diff --quiet ${BUILD} ${REMOTE} -- package-lock.json`]: code(1) })
    await new StartupUpdater(REPO, BUILD, runner, files()).build()
    expect(runner.calls).toContain('npm ci')
  })

  it('installiert Abhängigkeiten, wenn node_modules fehlt', async () => {
    const runner = new FakeRunner(newerRemote)
    await new StartupUpdater(REPO, BUILD, runner, files(false)).build()
    expect(runner.calls).toContain('npm ci')
  })

  it('überspringt, wenn der Build-Commit nicht in origin/main liegt', async () => {
    const runner = new FakeRunner({ ...newerRemote, [`git merge-base --is-ancestor ${BUILD} ${REMOTE}`]: code(1) })
    const outcome = await new StartupUpdater(REPO, BUILD, runner, files()).check()
    expect(outcome.kind).toBe('skipped')
    expect(runner.calls).not.toContain('git merge --ff-only origin/main')
  })

  it('überspringt bei anderem Branch', async () => {
    const runner = new FakeRunner({ ...newerRemote, 'git rev-parse --abbrev-ref HEAD': out('feature/x\n') })
    const outcome = await new StartupUpdater(REPO, BUILD, runner, files()).check()
    expect(outcome.kind).toBe('skipped')
  })

  it('überspringt bei uncommitteten Änderungen im Repo', async () => {
    const runner = new FakeRunner({ ...newerRemote, 'git status --porcelain': out(' M src/main/index.ts\n') })
    const outcome = await new StartupUpdater(REPO, BUILD, runner, files()).check()
    expect(outcome.kind).toBe('skipped')
    expect(runner.calls).not.toContain('git merge --ff-only origin/main')
  })

  it('überspringt ohne Build-Commit', async () => {
    const runner = new FakeRunner({})
    const outcome = await new StartupUpdater(REPO, '', runner, files()).check()
    expect(outcome.kind).toBe('skipped')
    expect(runner.calls).toEqual([])
  })

  it('wirft UpdateError, wenn ein Schritt fehlschlägt', async () => {
    const runner = new FakeRunner({ ...newerRemote, 'npm run dist:win': code(1, 'tsc kaputt') })
    await expect(new StartupUpdater(REPO, BUILD, runner, files()).build()).rejects.toBeInstanceOf(UpdateError)
  })

  it('baut nicht, wenn die erneute Prüfung kein Update mehr findet', async () => {
    const runner = new FakeRunner({ ...newerRemote, 'git status --porcelain': out(' M src/main/index.ts\n') })
    await expect(new StartupUpdater(REPO, BUILD, runner, files()).build()).rejects.toBeInstanceOf(UpdateError)
    expect(runner.calls).not.toContain('npm run dist:win')
  })
})
