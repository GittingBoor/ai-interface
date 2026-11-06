import { homedir } from 'node:os'
import { terminalEnv } from '../terminal/launchCommand'
import { ClaudeCliError } from '../errors'
import { mainT } from '../i18n'
import { runProcess } from './ClaudeCli'
import { isFile, resolveClaudeExecutable } from './claudePath'

export interface ClaudePrintOptions {
  readonly timeoutMs: number
  readonly cwd?: string
}

/** `claude -p` auf diesem PC; der Prompt geht über stdin (keine Quoting-Probleme mit .cmd-Wrappern). */
export async function runClaudePrint(command: string, args: readonly string[], input: string, options: ClaudePrintOptions): Promise<string> {
  const executable = resolveClaudeExecutable(command, process.platform, isFile, process.env['PATH'] ?? '', homedir())
  if (!executable) throw new ClaudeCliError(mainT().errors.assistant.commandNotFound(command))
  return runProcess(executable, ['-p', ...args], input, { timeoutMs: options.timeoutMs, env: terminalEnv(process.env), cwd: options.cwd })
}
