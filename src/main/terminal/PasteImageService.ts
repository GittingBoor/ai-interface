import { randomUUID } from 'node:crypto'
import type { HostId, TerminalInfo } from '@shared/types'
import { type Host, joinPath } from '../hosts/Host'

const PASTE_DIR_NAME = 'ai-interface-paste'
const BRACKETED_START = '\x1b[200~'
const BRACKETED_END = '\x1b[201~'
const RANDOM_SUFFIX_LENGTH = 8

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

/** Legt Bilder aus der Zwischenablage auf dem Host des Terminals ab und fügt den Pfad ein. */
export class PasteImageService {
  constructor(
    private readonly hosts: (id: HostId) => Host,
    private readonly terminals: TerminalAccess,
    private readonly now: () => number = Date.now
  ) {}

  async paste(terminalId: string, png: Uint8Array): Promise<string> {
    const host = this.hosts(this.terminals.info(terminalId).host)
    const name = `${this.now()}-${randomUUID().slice(0, RANDOM_SUFFIX_LENGTH)}.png`
    const path = joinPath(host, await this.dir(host), name)
    await host.writeFileBytes(path, png)
    this.terminals.write(terminalId, bracketedPath(path))
    return path
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

  private async dir(host: Host): Promise<string> {
    return joinPath(host, await host.tempDir(), PASTE_DIR_NAME)
  }
}
