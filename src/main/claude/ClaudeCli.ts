import { type ChildProcess, spawn } from 'node:child_process'
import { ClaudeCliError } from '../errors'

export interface RunOptions {
  readonly timeoutMs: number
  readonly env: NodeJS.ProcessEnv
  readonly cwd?: string
}

const MAX_ERROR_TEXT = 300
const CMD_SCRIPT = /\.(cmd|bat)$/i

/** Für cmd.exe: in doppelte Anführungszeichen, eingebettete `"` verdoppelt. */
const cmdQuote = (value: string): string => `"${value.replaceAll('"', '""')}"`

/** `.cmd`/`.bat` laufen nur über cmd.exe; die ganze Zeile wird selbst gequotet (keine Wortzerlegung, Leerzeichen im Pfad ok). */
function start(file: string, args: readonly string[], options: RunOptions): ChildProcess {
  const common = { env: options.env, cwd: options.cwd, windowsHide: true }
  if (process.platform === 'win32' && CMD_SCRIPT.test(file)) {
    const line = [file, ...args].map(cmdQuote).join(' ')
    return spawn(process.env['ComSpec'] ?? 'cmd.exe', ['/d', '/s', '/c', `"${line}"`], { ...common, windowsVerbatimArguments: true })
  }
  return spawn(file, [...args], common)
}

/** Beendet den Prozess samt Kindprozessen (unter Windows hängt z. B. claude unter cmd.exe). */
function killTree(child: ChildProcess): void {
  if (process.platform === 'win32' && child.pid !== undefined) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true }).on('error', () => child.kill())
  } else {
    child.kill()
  }
}

/** Startet ein Programm, schreibt `input` nach stdin und liefert stdout; Fehler als `ClaudeCliError`. */
export function runProcess(file: string, args: readonly string[], input: string, options: RunOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = start(file, args, options)
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      killTree(child)
      reject(new ClaudeCliError(`Zeitlimit von ${Math.round(options.timeoutMs / 1000)} s überschritten`))
    }, options.timeoutMs)
    child.stdout?.on('data', (d: Buffer) => (stdout += d.toString('utf8')))
    child.stderr?.on('data', (d: Buffer) => (stderr += d.toString('utf8')))
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(new ClaudeCliError(error.message))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve(stdout)
      else reject(new ClaudeCliError(`Exit-Code ${code ?? '?'}: ${(stderr || stdout).trim().slice(0, MAX_ERROR_TEXT)}`))
    })
    child.stdin?.end(input)
  })
}
