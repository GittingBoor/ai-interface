import { realpath } from 'node:fs/promises'
import { extname, isAbsolute, join, relative } from 'node:path'
import { mainT } from '../i18n'
import { NotFoundError, ValidationError } from '../errors'
import { assertRelativePath } from '../hosts/projectRead'

/**
 * Endungen, deren Standardprogramm nur anzeigt. Skripte und Programme (auch .js und .py, die Windows direkt ausführt)
 * fehlen bewusst: Die Verweise schreibt ein Agent, der Inhalte aus dem Projekt liest.
 */
const DIRECT_EXTENSIONS: ReadonlySet<string> = new Set([
  '.md', '.markdown', '.txt', '.log', '.csv', '.json', '.jsonc', '.yaml', '.yml', '.toml', '.ini', '.xml',
  '.ts', '.tsx', '.mts', '.cts', '.jsx', '.css', '.scss', '.less', '.sql', '.rs', '.go', '.java', '.kt', '.c', '.h',
  '.cpp', '.hpp', '.cs', '.swift', '.dart', '.vue', '.svelte', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf'
])

export interface OpenTarget {
  /** Echter Pfad (Symlinks aufgelöst). */
  readonly path: string
  /** `true` = mit dem Standardprogramm öffnen, sonst nur im Explorer zeigen. */
  readonly direct: boolean
}

export const opensDirectly = (file: string): boolean => DIRECT_EXTENSIONS.has(extname(file).toLowerCase())

export function isInside(root: string, path: string): boolean {
  const rel = relative(root, path)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

/** Prüft einen Verweis aus dem Projektwissen: relativ, vorhanden und nach Auflösen von Symlinks im Projekt. */
export async function resolveOpenTarget(projectPath: string, file: string): Promise<OpenTarget> {
  assertRelativePath(file)
  let real: string
  let root: string
  try {
    ;[root, real] = await Promise.all([realpath(projectPath), realpath(join(projectPath, file))])
  } catch {
    throw new NotFoundError(mainT().knowledge.whatFile(file))
  }
  if (!isInside(root, real)) throw new ValidationError(mainT().knowledge.outsideProject(file))
  return { path: real, direct: opensDirectly(real) }
}
