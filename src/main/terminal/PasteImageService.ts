import { mainT } from '../i18n'
import { randomUUID } from 'node:crypto'
import { type DroppedFile, type HostId, MAX_DROPPED_FILE_BYTES, type TerminalInfo } from '@shared/types'
import { ValidationError } from '../errors'
import { type Host, joinPath } from '../hosts/Host'

const PASTE_DIR_NAME = 'ai-interface-paste'
const BRACKETED_START = '\x1b[200~'
const BRACKETED_END = '\x1b[201~'
const RANDOM_SUFFIX_LENGTH = 8
const MAX_NAME_LENGTH = 80
const BYTES_PER_MB = 1024 * 1024
/** Alles außer Buchstaben, Ziffern, Punkt, Binde- und Unterstrich wird im abgelegten Dateinamen zu `_`. */
const UNSAFE_NAME_CHARS = /[^\p{L}\p{N}._-]/gu

/** Dateiname ohne Pfadtrenner und Sonderzeichen, gekürzt von vorn (die Endung bleibt). */
export function safeFileName(name: string): string {
  return name.replace(UNSAFE_NAME_CHARS, '_').slice(-MAX_NAME_LENGTH)
}

/** Pfad als Einfügen (Bracketed Paste), damit Claude Code ihn wie ein eingefügtes Bild erkennt. */
export function bracketedPath(path: string): string {
  const quoted = /\s/.test(path) ? `"${path}"` : path
  return `${BRACKETED_START}${quoted}${BRACKETED_END}`
}

interface TerminalAccess {
  info(id: string): TerminalInfo
  write(id: string, data: string): void
}

const isMissing = (error: unknown): boolean => (error as { code?: unknown }).code === 'ENOENT'

/** Legt eingefügte Bilder und hereingezogene Dateien auf dem Host des Terminals ab und fügt den Pfad ein. */
export class PasteImageService {
  constructor(
    private readonly hosts: (id: HostId) => Host,
    private readonly terminals: TerminalAccess,
    private readonly now: () => number = Date.now
  ) {}

  async paste(terminalId: string, png: Uint8Array): Promise<string> {
    const path = await this.store(this.hosts(this.terminals.info(terminalId).host), png, '.png')
    this.terminals.write(terminalId, bracketedPath(path))
    return path
  }

  /** Fügt erst ein, wenn alle Dateien bereitliegen, damit die Reihenfolge stimmt und nichts halb ankommt. */
  async pasteFiles(terminalId: string, files: readonly DroppedFile[]): Promise<string[]> {
    const host = this.hosts(this.terminals.info(terminalId).host)
    const paths: string[] = []
    for (const file of files) paths.push(await this.place(host, file))
    for (const path of paths) this.terminals.write(terminalId, bracketedPath(path))
    return paths
  }

  /** Löscht abgelegte Bilder, die älter als `maxAgeMs` sind; liefert die Anzahl. */
  async cleanup(host: Host, maxAgeMs: number): Promise<number> {
    const dir = await this.dir(host)
    let entries
    try {
      entries = await host.readDir(dir)
    } catch (error) {
      if (isMissing(error)) return 0
      throw error
    }
    const cutoff = this.now() - maxAgeMs
    let removed = 0
    for (const entry of entries.filter((e) => !e.isDirectory)) {
      const path = joinPath(host, dir, entry.name)
      const stat = await host.stat(path)
      if (!stat || stat.mtimeMs >= cutoff) continue
      await host.remove(path)
      removed++
    }
    return removed
  }

  /** Lokale Dateien bleiben, wo sie sind; für Geräte wird der Inhalt in den Temp-Ordner des Hosts geschrieben. */
  private async place(host: Host, file: DroppedFile): Promise<string> {
    if (host.id === 'local' && file.path) return file.path
    const errors = mainT().errors.images
    if (!file.data) throw new ValidationError(errors.dropUnreadable(file.name))
    if (file.data.byteLength > MAX_DROPPED_FILE_BYTES) throw new ValidationError(errors.dropTooLarge(file.name, `${MAX_DROPPED_FILE_BYTES / BYTES_PER_MB} MB`))
    return this.store(host, file.data, `-${safeFileName(file.name)}`)
  }

  /** `suffix` folgt auf Zeitstempel und Zufallsteil, z. B. `.png` oder `-Bericht.pdf`. */
  private async store(host: Host, data: Uint8Array, suffix: string): Promise<string> {
    const name = `${this.now()}-${randomUUID().slice(0, RANDOM_SUFFIX_LENGTH)}${suffix}`
    const path = joinPath(host, await this.dir(host), name)
    await host.writeFileBytes(path, data)
    return path
  }

  private async dir(host: Host): Promise<string> {
    return joinPath(host, await host.tempDir(), PASTE_DIR_NAME)
  }
}
