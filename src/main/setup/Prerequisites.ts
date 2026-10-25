import { posix, win32 } from 'node:path'
import type { PrerequisiteStatus } from '@shared/types'
import { resolveClaudeExecutable } from '../claude/claudePath'

const CLAUDE_HELP = 'https://code.claude.com/docs/en/setup'
const GIT_HELP = 'https://git-scm.com/downloads/win'
const INSTALL_WINDOWS = 'irm https://claude.ai/install.ps1 | iex'
const INSTALL_POSIX = 'curl -fsSL https://claude.ai/install.sh | bash'
const INSTALL_GIT = 'winget install Git.Git'
const CREDENTIALS = ['.claude', '.credentials.json'] as const
const API_KEY_ENV = 'ANTHROPIC_API_KEY'
/** Von Claude Code selbst genutzt, um Git Bash zu finden. */
const GIT_BASH_ENV = 'CLAUDE_CODE_GIT_BASH_PATH'
const BASH_IN_GIT = ['bin', 'bash.exe'] as const

export interface PrerequisiteDeps {
  readonly platform: NodeJS.Platform
  readonly home: string
  readonly env: Readonly<Record<string, string | undefined>>
  readonly claudeCommand: string
  isFile(path: string): boolean
}

/** Prüft, was die App auf diesem PC braucht: Claude Code, dessen Anmeldung und unter Windows Git Bash. */
export class PrerequisiteChecker {
  constructor(private readonly deps: PrerequisiteDeps) {}

  check(): PrerequisiteStatus[] {
    const list = [this.claude(), this.login()]
    return this.deps.platform === 'win32' ? [...list, this.gitBash()] : list
  }

  private get path(): typeof win32 {
    return this.deps.platform === 'win32' ? win32 : posix
  }

  private claude(): PrerequisiteStatus {
    const { platform, claudeCommand, isFile, env, home } = this.deps
    const found = resolveClaudeExecutable(claudeCommand, platform, isFile, env['PATH'] ?? '', home)
    return {
      id: 'claude',
      label: 'Claude Code',
      ok: found !== null,
      detail: found ?? 'Ohne Claude Code laufen keine Terminals, kein Verbrauch und kein Assistent.',
      required: true,
      fixCommand: found ? null : platform === 'win32' ? INSTALL_WINDOWS : INSTALL_POSIX,
      helpUrl: found ? null : CLAUDE_HELP
    }
  }

  private login(): PrerequisiteStatus {
    const credentials = this.path.join(this.deps.home, ...CREDENTIALS)
    const viaKey = Boolean(this.deps.env[API_KEY_ENV])
    const ok = viaKey || this.deps.isFile(credentials)
    return {
      id: 'login',
      label: 'Bei Claude angemeldet',
      ok,
      detail: viaKey ? `API-Schlüssel (${API_KEY_ENV})` : ok ? credentials : 'Einmal claude starten und im Browser anmelden (Pro-, Max-, Team- oder API-Konto).',
      required: true,
      fixCommand: ok ? null : 'claude',
      helpUrl: ok ? null : CLAUDE_HELP
    }
  }

  private gitBash(): PrerequisiteStatus {
    const found = this.gitBashCandidates().find((p) => this.deps.isFile(p)) ?? null
    return {
      id: 'gitBash',
      label: 'Git Bash',
      ok: found !== null,
      detail: found ?? 'Ohne Git Bash keine Desktop-Meldungen und kein Status (arbeitet, fertig, Frage) in den Terminals.',
      required: false,
      fixCommand: found ? null : INSTALL_GIT,
      helpUrl: found ? null : GIT_HELP
    }
  }

  /** Erst die Einstellung von Claude Code, dann Standardorte, dann die Git-Installation aus dem PATH (nie WSL-bash). */
  private gitBashCandidates(): string[] {
    const { env, isFile } = this.deps
    const path = win32
    const configured = env[GIT_BASH_ENV] ? [env[GIT_BASH_ENV] as string] : []
    const roots = [env['ProgramFiles'], env['ProgramFiles(x86)'], env['LOCALAPPDATA'] ? path.join(env['LOCALAPPDATA'], 'Programs') : undefined]
    const standard = roots.filter((r): r is string => Boolean(r)).map((r) => path.join(r, 'Git', ...BASH_IN_GIT))
    const fromPath = (env['PATH'] ?? '')
      .split(';')
      .filter((dir) => dir && isFile(path.join(dir, 'git.exe')))
      .map((dir) => path.join(dir, '..', ...BASH_IN_GIT))
    return [...configured, ...standard, ...fromPath]
  }
}
