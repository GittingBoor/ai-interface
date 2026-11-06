import { readFile, rename, writeFile } from 'node:fs/promises'
import { ClaudeCliError } from '../errors'

type JsonObject = Record<string, unknown>

const isObject = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Claude Code führt Ordner unter `projects` mit Schrägstrichen, auch unter Windows. */
export function trustKey(dir: string): string {
  return dir.replace(/\\/g, '/')
}

/** Konfiguration mit dem Ordner als vertraut; `null`, wenn er es schon ist (dann nichts schreiben). */
export function withTrustedFolder(config: JsonObject, dir: string): JsonObject | null {
  const key = trustKey(dir)
  const projects = isObject(config['projects']) ? config['projects'] : {}
  const entry = isObject(projects[key]) ? projects[key] : {}
  if (entry['hasTrustDialogAccepted'] === true) return null
  return { ...config, projects: { ...projects, [key]: { ...entry, hasTrustDialogAccepted: true } } }
}

/**
 * Trägt App-eigene Arbeitsordner in `~/.claude.json` als vertraut ein. Läufe im Hintergrund haben ein
 * schreibgeschütztes Terminal und könnten die Vertrauensabfrage beim ersten Start sonst nicht beantworten.
 */
export class ClaudeTrust {
  constructor(private readonly configPath: string) {}

  async ensure(dir: string): Promise<void> {
    const raw = await this.read()
    if (raw === null) return
    let config: unknown
    try {
      config = JSON.parse(raw)
    } catch {
      throw new ClaudeCliError(`${this.configPath} ist kein gültiges JSON; Ordner nicht als vertraut eingetragen.`) // i18n-ignore: Logtext
    }
    if (!isObject(config)) throw new ClaudeCliError(`${this.configPath} hat ein unerwartetes Format; Ordner nicht als vertraut eingetragen.`) // i18n-ignore: Logtext
    const updated = withTrustedFolder(config, dir)
    if (!updated) return
    const temp = `${this.configPath}.aii-${process.pid}.tmp`
    await writeFile(temp, JSON.stringify(updated, null, 2), 'utf8')
    await rename(temp, this.configPath)
  }

  /** Ohne Datei lief Claude Code hier noch nie; dann nichts anlegen. */
  private async read(): Promise<string | null> {
    try {
      return await readFile(this.configPath, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  }
}
