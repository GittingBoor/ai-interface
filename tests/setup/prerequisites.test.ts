import { describe, expect, it } from 'vitest'
import { PrerequisiteChecker, type PrerequisiteDeps } from '../../src/main/setup/Prerequisites'
import type { PrerequisiteStatus } from '@shared/types'

const WIN_HOME = 'C:\\Users\\Alex'
const CLAUDE_EXE = 'C:\\Users\\Alex\\.local\\bin\\claude.exe'
const CREDENTIALS = 'C:\\Users\\Alex\\.claude\\.credentials.json'
const GIT_BASH = 'C:\\Program Files\\Git\\bin\\bash.exe'

const windows = (files: readonly string[], env: Readonly<Record<string, string>> = {}): PrerequisiteDeps => ({
  platform: 'win32',
  home: WIN_HOME,
  env: { PATH: 'C:\\Windows\\System32', ProgramFiles: 'C:\\Program Files', ...env },
  claudeCommand: 'claude',
  isFile: (path) => files.includes(path)
})

const byId = (list: readonly PrerequisiteStatus[], id: PrerequisiteStatus['id']): PrerequisiteStatus | undefined => list.find((p) => p.id === id)

describe('PrerequisiteChecker', () => {
  it('meldet alles erfüllt, wenn Claude, Anmeldung und Git Bash da sind', () => {
    const list = new PrerequisiteChecker(windows([CLAUDE_EXE, CREDENTIALS, GIT_BASH])).check()
    expect(list.map((p) => [p.id, p.ok])).toEqual([
      ['claude', true],
      ['login', true],
      ['gitBash', true]
    ])
    expect(byId(list, 'claude')?.detail).toContain(CLAUDE_EXE)
  })

  it('nennt für fehlendes Claude Code den Installationsbefehl des Systems', () => {
    const win = byId(new PrerequisiteChecker(windows([])).check(), 'claude')
    expect(win).toMatchObject({ ok: false, required: true, fixCommand: 'irm https://claude.ai/install.ps1 | iex' })
    const linux = byId(new PrerequisiteChecker({ platform: 'linux', home: '/home/alex', env: { PATH: '/usr/bin' }, claudeCommand: 'claude', isFile: () => false }).check(), 'claude')
    expect(linux?.fixCommand).toBe('curl -fsSL https://claude.ai/install.sh | bash')
  })

  it('zählt einen API-Schlüssel als Anmeldung', () => {
    const list = new PrerequisiteChecker(windows([CLAUDE_EXE], { ANTHROPIC_API_KEY: 'x' })).check()
    expect(byId(list, 'login')?.ok).toBe(true)
    expect(byId(new PrerequisiteChecker(windows([CLAUDE_EXE])).check(), 'login')).toMatchObject({ ok: false, required: true, fixCommand: 'claude' })
  })

  it('findet Git Bash über den Pfad von git.exe, nicht das WSL-bash.exe', () => {
    const viaGit = windows(['D:\\Tools\\Git\\cmd\\git.exe', 'D:\\Tools\\Git\\bin\\bash.exe', 'C:\\Windows\\System32\\bash.exe'], { PATH: 'C:\\Windows\\System32;D:\\Tools\\Git\\cmd', ProgramFiles: 'C:\\Program Files' })
    expect(byId(new PrerequisiteChecker(viaGit).check(), 'gitBash')).toMatchObject({ ok: true, detail: 'D:\\Tools\\Git\\bin\\bash.exe' })
    const onlyWsl = windows(['C:\\Windows\\System32\\bash.exe'])
    expect(byId(new PrerequisiteChecker(onlyWsl).check(), 'gitBash')).toMatchObject({ ok: false, required: false, fixCommand: 'winget install Git.Git' })
  })

  it('nimmt CLAUDE_CODE_GIT_BASH_PATH zuerst', () => {
    const deps = windows(['E:\\git\\bash.exe'], { CLAUDE_CODE_GIT_BASH_PATH: 'E:\\git\\bash.exe' })
    expect(byId(new PrerequisiteChecker(deps).check(), 'gitBash')?.detail).toBe('E:\\git\\bash.exe')
  })

  it('prüft Git Bash nur unter Windows', () => {
    const list = new PrerequisiteChecker({ platform: 'linux', home: '/home/alex', env: { PATH: '/usr/bin' }, claudeCommand: 'claude', isFile: () => true }).check()
    expect(list.map((p) => p.id)).toEqual(['claude', 'login'])
  })
})
