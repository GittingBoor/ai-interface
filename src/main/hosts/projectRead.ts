import { ValidationError } from '../errors'
import { joinPath, type Host } from './Host'
import { shellQuote } from './shellQuote'

export const MAX_OUTPUT_CHARS = 12_000
export const READ_LIMIT_BYTES = 64 * 1024
/** Zeichen, die `cmd.exe` auch in doppelten Anführungszeichen auswertet. */
const CMD_UNSAFE = /["%\r\n]/
const PARENT_SEGMENT = /(^|[\\/])\.\.([\\/]|$)/
const ABSOLUTE_PATH = /^([\\/]|[a-zA-Z]:)/

export function clip(text: string): string {
  return text.length > MAX_OUTPUT_CHARS ? `${text.slice(0, MAX_OUTPUT_CHARS)}\n… (gekürzt)` : text
}

/** Argument für die Shell des Rechners: `cmd.exe` unter Windows, sonst POSIX. */
export function quoteFor(host: Pick<Host, 'separator'>, value: string): string {
  if (host.separator === '/') return shellQuote(value)
  if (CMD_UNSAFE.test(value)) throw new ValidationError(`„${value}“ enthält " oder %, das geht unter Windows nicht. Anderen Suchtext wählen.`)
  return `"${value}"`
}

export function assertRelativePath(path: string): void {
  if (ABSOLUTE_PATH.test(path) || PARENT_SEGMENT.test(path)) throw new ValidationError(`„${path}“ muss relativ zum Projekt sein und darf kein .. enthalten.`)
}

export async function runGit(host: Pick<Host, 'exec' | 'separator'>, projectPath: string, args: string): Promise<string> {
  const result = await host.exec(`git -C ${quoteFor(host, projectPath)} ${args}`)
  if (result.code !== 0 && result.stdout.trim() === '') throw new ValidationError(`git meldet Code ${result.code}: ${result.stderr.trim() || 'keine Ausgabe'}`)
  return clip(result.stdout.trim() || '(keine Treffer)')
}

export async function readProjectFile(host: Pick<Host, 'readFile' | 'separator'>, projectPath: string, relative: string): Promise<string> {
  assertRelativePath(relative)
  const data = await host.readFile(joinPath(host, projectPath, relative), 0, READ_LIMIT_BYTES)
  const text = data.toString('utf8')
  return data.length >= READ_LIMIT_BYTES ? `${text}\n… (nach ${READ_LIMIT_BYTES} Byte gekürzt)` : text
}
