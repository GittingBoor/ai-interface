import type { LaunchMode } from '@shared/types'
import { powershellQuote, shellQuote } from '../hosts/shellQuote'
import { TERMINAL_ID_ENV } from '../notify/hookSettings'

export type LaunchSpec =
  | { readonly kind: 'local'; readonly file: string; readonly args: readonly string[]; readonly cwd: string }
  | { readonly kind: 'ssh'; readonly initialInput: string }

export interface LaunchOptions {
  readonly platform: NodeJS.Platform
  readonly target: 'local' | 'ssh'
  readonly path: string
  readonly mode: LaunchMode
  readonly claudeCommand: string
  /** Login-Shell unter Linux/macOS (`$SHELL`). */
  readonly shell: string | undefined
  /** ID des Terminals in der App; Hooks melden Ereignisse damit zurück. */
  readonly terminalId?: string
  /** Pfad der Hook-Einstellungen für `claude --settings` (auf dem Zielrechner). */
  readonly hookSettingsPath?: string
  /** Für `resume`: die Claude-Session, die fortgesetzt wird. */
  readonly sessionId?: string
  /** Erste Nachricht an Claude (nur Modi mit Claude). */
  readonly initialPrompt?: string
  /** Weitere Argumente für Claude, z. B. `--mcp-config`; jedes wird einzeln quotiert. */
  readonly extraArgs?: readonly string[]
}

const WINDOWS_SHELL = 'powershell.exe'
const FALLBACK_POSIX_SHELL = '/bin/bash'
const POWERSHELL_ENCODING = 'utf16le'
/** Claude deutet ein Argument mit führendem `-` als Option und bricht ab. */
const OPTION_PREFIX = '-'

function claudeInvocation(options: LaunchOptions, quote: (value: string) => string): string | null {
  const { mode, claudeCommand, sessionId } = options
  switch (mode) {
    case 'new':
      return claudeCommand
    case 'continue':
      return `${claudeCommand} --continue`
    case 'resume':
      return sessionId ? `${claudeCommand} --resume ${quote(sessionId)}` : `${claudeCommand} --continue`
    case 'shell':
      return null
  }
}

/** PowerShell 5.1 reicht `"` ungeschützt an native Programme weiter; MSVCRT-Regeln vorab anwenden. */
function windowsNativeArg(text: string): string {
  return text.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1')
}

function promptArg(options: LaunchOptions, prompt: string): string {
  if (options.target === 'ssh') return `"$(printf %s ${shellQuote(Buffer.from(prompt, 'utf8').toString('base64'))} | base64 -d)"`
  if (options.platform === 'win32') return powershellQuote(windowsNativeArg(prompt))
  return shellQuote(prompt)
}

/** Claude-Aufruf; der Startprompt steht vor den Flags, weil `--mcp-config` und `--allowedTools` variadisch sind. */
function claudeLine(options: LaunchOptions, quote: (value: string) => string): string | null {
  const base = claudeInvocation(options, quote)
  if (!base) return null
  const text = options.initialPrompt?.startsWith(OPTION_PREFIX) ? ` ${options.initialPrompt}` : options.initialPrompt
  const prompt = text ? ` ${promptArg(options, text)}` : ''
  const settings = options.hookSettingsPath ? ` --settings ${quote(options.hookSettingsPath)}` : ''
  const extra = (options.extraArgs ?? []).map((arg) => ` ${quote(arg)}`).join('')
  return `${base}${prompt}${settings}${extra}`
}

/** Baut den Startbefehl für ein Terminal: Shell im Ordner öffnen und optional Claude starten. */
export function buildLaunch(options: LaunchOptions): LaunchSpec {
  const quote = options.target === 'local' && options.platform === 'win32' ? powershellQuote : shellQuote
  const claude = claudeLine(options, quote)
  if (options.target === 'ssh') {
    const exportId = options.terminalId ? `export ${TERMINAL_ID_ENV}=${shellQuote(options.terminalId)}; ` : ''
    const cd = `cd ${shellQuote(options.path)}`
    return { kind: 'ssh', initialInput: `${exportId}${claude ? `${cd} && ${claude}` : cd}\n` }
  }
  if (options.platform === 'win32') {
    const cd = `Set-Location -LiteralPath ${powershellQuote(options.path)}`
    const command = claude ? `${cd}; ${claude}` : cd
    // Mit Startprompt kodiert übergeben: Zeilenumbrüche überstehen die Windows-Kommandozeile sonst nicht sicher.
    const commandArgs = claude && options.initialPrompt ? ['-EncodedCommand', Buffer.from(command, POWERSHELL_ENCODING).toString('base64')] : ['-Command', command]
    return { kind: 'local', file: WINDOWS_SHELL, args: ['-NoLogo', '-NoExit', '-ExecutionPolicy', 'Bypass', ...commandArgs], cwd: options.path }
  }
  const shell = options.shell ?? FALLBACK_POSIX_SHELL
  const cd = `cd ${shellQuote(options.path)}`
  const script = claude ? `${cd} && ${claude}; exec ${shellQuote(shell)} -l` : `${cd}; exec ${shellQuote(shell)} -l`
  return { kind: 'local', file: shell, args: ['-l', '-c', script], cwd: options.path }
}

const TERM_NAME = 'xterm-256color'

/** Marker einer umgebenden Claude-Sitzung. Geerbt würden sie z. B. das Speichern der Transcripts abschalten. */
const INHERITED_SESSION_MARKERS: readonly string[] = [
  'CLAUDECODE',
  'CLAUDE_CODE_CHILD_SESSION',
  'CLAUDE_CODE_SESSION_ID',
  'CLAUDE_CODE_ENTRYPOINT',
  'CLAUDE_CODE_MESSAGING_SOCKET',
  'CLAUDE_CODE_MESSAGING_TOKEN',
  'CLAUDE_CODE_SESSION_ATTENDED',
  'CLAUDE_CODE_EXECPATH',
  'CLAUDE_PID',
  'AI_AGENT'
]

/** Umgebung für ein lokales Terminal: ohne Sitzungsmarker, mit Terminal-Typ. */
export function terminalEnv(base: Readonly<Record<string, string | undefined>>): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(base)) {
    if (value !== undefined && !INHERITED_SESSION_MARKERS.includes(key)) env[key] = value
  }
  return { ...env, TERM: TERM_NAME, COLORTERM: 'truecolor' }
}
