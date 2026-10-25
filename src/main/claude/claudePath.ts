import { statSync } from 'node:fs'
import { posix, win32 } from 'node:path'

/** Unter Windows sind nur diese Endungen direkt startbar; ein Ordner namens claude zählt nicht. */
const WINDOWS_EXTENSIONS = ['.exe', '.cmd']

/** Existiert eine Datei (kein Ordner) unter diesem Pfad? */
export const isFile = (path: string): boolean => {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

/**
 * Findet die ausführbare Claude-Code-Datei: absoluter Pfad aus den Einstellungen, sonst Suche im PATH,
 * sonst `~/.local/bin` (Standard des nativen Installers).
 */
export function resolveClaudeExecutable(
  command: string,
  platform: NodeJS.Platform,
  exists: (path: string) => boolean,
  pathEnv: string,
  home: string
): string | null {
  const path = platform === 'win32' ? win32 : posix
  const extensions = platform === 'win32' ? WINDOWS_EXTENSIONS : ['']
  if (path.isAbsolute(command)) return exists(command) ? command : null
  const dirs = [...pathEnv.split(platform === 'win32' ? ';' : ':').filter(Boolean), path.join(home, '.local', 'bin')]
  for (const dir of dirs) {
    for (const extension of extensions) {
      const candidate = path.join(dir, `${command}${extension}`)
      if (exists(candidate)) return candidate
    }
  }
  return null
}
