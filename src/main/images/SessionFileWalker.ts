import { HostUnreachableError } from '../errors'
import { type Host, joinPath } from '../hosts/Host'
import type { ScanOffsets } from './ScanOffsets'

const DAY_MS = 86_400_000
const JSONL_EXTENSION = '.jsonl'
/** Subagenten schreiben eigene Dateien unter `<session>/subagents/`. */
const SUBAGENTS_DIR = 'subagents'
/** Blockgröße beim Lesen: begrenzt den Speicher auch bei Session-Dateien mit vielen Bildern. */
const DEFAULT_CHUNK_BYTES = 8 * 1024 * 1024

const isMissing = (error: unknown): boolean => (error as { code?: unknown }).code === 'ENOENT'

/** Verarbeitet einen neuen Ausschnitt; liefert, wie viele Bytes vollständig gelesen wurden. */
export type ChunkHandler = (chunk: string) => number | Promise<number>

/**
 * Geht alle Claude-Session-Dateien (`~/.claude/projects/*\/*.jsonl`) eines Hosts durch und reicht nur neue Teile weiter.
 * Dateien ohne Leseposition, die älter als `backfillDays` sind, werden übersprungen. Mit `includeSubagents` auch die
 * Subagenten-Dateien von Sessions, die innerhalb dieses Zeitraums liefen.
 */
export class SessionFileWalker {
  constructor(
    private readonly offsets: Pick<ScanOffsets, 'get' | 'set'>,
    private readonly backfillDays: number,
    private readonly now: () => number = Date.now,
    private readonly chunkBytes: number = DEFAULT_CHUNK_BYTES
  ) {}

  async walk(host: Host, handle: ChunkHandler, includeSubagents = false): Promise<void> {
    const root = joinPath(host, await host.homeDir(), '.claude', 'projects')
    let dirs
    try {
      dirs = (await host.readDir(root)).filter((d) => d.isDirectory)
    } catch (error) {
      if (isMissing(error)) return
      throw error
    }
    for (const dir of dirs) {
      const dirPath = joinPath(host, root, dir.name)
      const entries = await host.readDir(dirPath)
      const sessionDirs = new Set(entries.filter((e) => e.isDirectory).map((e) => e.name))
      for (const file of entries.filter((e) => !e.isDirectory && e.name.endsWith(JSONL_EXTENSION))) {
        const recent = await this.walkSafely(host, joinPath(host, dirPath, file.name), handle)
        const sessionDir = file.name.slice(0, -JSONL_EXTENSION.length)
        if (includeSubagents && recent && sessionDirs.has(sessionDir)) await this.walkSubagents(host, joinPath(host, dirPath, sessionDir, SUBAGENTS_DIR), handle)
      }
    }
  }

  private async walkSubagents(host: Host, dirPath: string, handle: ChunkHandler): Promise<void> {
    let files
    try {
      files = (await host.readDir(dirPath)).filter((e) => !e.isDirectory && e.name.endsWith(JSONL_EXTENSION))
    } catch (error) {
      if (isMissing(error)) return
      throw error
    }
    for (const file of files) await this.walkSafely(host, joinPath(host, dirPath, file.name), handle)
  }

  /** Liefert, ob die Datei im Nachlese-Zeitraum geändert wurde. */
  private async walkSafely(host: Host, path: string, handle: ChunkHandler): Promise<boolean> {
    try {
      return await this.walkFile(host, path, handle)
    } catch (error) {
      if (error instanceof HostUnreachableError) throw error
      // Einzelne unlesbare Datei überspringen; der nächste Lauf versucht es erneut.
      return false
    }
  }

  private async walkFile(host: Host, path: string, handle: ChunkHandler): Promise<boolean> {
    const stat = await host.stat(path)
    if (!stat) return false
    const recent = stat.mtimeMs >= this.now() - this.backfillDays * DAY_MS
    let offset = this.offsets.get(host.id, path)
    if (offset === null && !recent) {
      this.offsets.set(host.id, path, stat.size)
      return false
    }
    offset ??= 0
    if (stat.size < offset) offset = 0
    let position = offset
    let blockBytes = this.chunkBytes
    while (position < stat.size) {
      const block = await host.readFile(path, position, blockBytes)
      const consumed = await handle(block.toString('utf8'))
      if (consumed > 0) {
        position += consumed
        this.offsets.set(host.id, path, position)
        blockBytes = this.chunkBytes
      } else if (position + block.length < stat.size) {
        // Eine einzelne Zeile ist länger als der Block: Block vergrößern und erneut lesen.
        blockBytes *= 2
      } else {
        return recent // Unvollständige letzte Zeile: beim nächsten Lauf.
      }
    }
    return recent
  }
}
