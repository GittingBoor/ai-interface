import { posix, win32 } from 'node:path'
import { ValidationError } from '../errors'

/**
 * Stellt sicher, dass `target` echt unterhalb von `root` liegt (nach Auflösen von `..`).
 * Unter Windows ohne Rücksicht auf Groß-/Kleinschreibung. Liefert `target` unverändert zurück.
 */
export function assertInside(root: string, target: string, platform: NodeJS.Platform): string {
  const path = platform === 'win32' ? win32 : posix
  const fold = (p: string): string => (platform === 'win32' ? p.toLowerCase() : p)
  const base = fold(path.resolve(root))
  const resolved = fold(path.resolve(target))
  const relative = path.relative(base, resolved)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new ValidationError(`Der Pfad ${target} liegt nicht innerhalb von ${root}.`)
  }
  return target
}
