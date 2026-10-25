import type { CollectStats } from '@shared/types'
import { HostUnreachableError } from '../errors'
import { type Host, joinPath } from '../hosts/Host'
import { decodeProjectDir, parseJsonlChunk } from './JsonlParser'
import type { UsageRepo } from './UsageRepo'

const JSONL_EXTENSION = '.jsonl'

const isMissing = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'ENOENT'

/** Liest neue Zeilen aus `~/.claude/projects/**.jsonl` eines Hosts in die Datenbank. */
export class UsageCollector {
  constructor(private readonly repo: UsageRepo) {}

  async collect(host: Host): Promise<CollectStats> {
    const root = joinPath(host, await host.homeDir(), '.claude', 'projects')
    let projectDirs
    try {
      projectDirs = (await host.readDir(root)).filter((d) => d.isDirectory)
    } catch (error) {
      if (isMissing(error)) return this.stats(host, 0, 0, 0, 0)
      throw error
    }
    let files = 0
    let newRecords = 0
    let skippedLines = 0
    let failedFiles = 0
    const tolerate = async (work: () => Promise<void>): Promise<void> => {
      try {
        await work()
      } catch (error) {
        if (error instanceof HostUnreachableError) throw error
        failedFiles++
      }
    }
    for (const dir of projectDirs) {
      const dirPath = joinPath(host, root, dir.name)
      await tolerate(async () => {
        const entries = (await host.readDir(dirPath)).filter((e) => !e.isDirectory && e.name.endsWith(JSONL_EXTENSION))
        for (const entry of entries) {
          files++
          await tolerate(async () => {
            const result = await this.collectFile(host, joinPath(host, dirPath, entry.name), decodeProjectDir(dir.name))
            newRecords += result.newRecords
            skippedLines += result.skippedLines
          })
        }
      })
    }
    return this.stats(host, files, newRecords, skippedLines, failedFiles)
  }

  private async collectFile(host: Host, path: string, fallbackProject: string): Promise<{ newRecords: number; skippedLines: number }> {
    const stat = await host.stat(path)
    if (!stat) return { newRecords: 0, skippedLines: 0 }
    let offset = this.repo.getOffset(host.id, path)
    if (stat.size < offset) offset = 0
    if (stat.size === offset) return { newRecords: 0, skippedLines: 0 }
    const chunk = (await host.readFile(path, offset)).toString('utf8')
    const parsed = parseJsonlChunk(chunk, host.id, fallbackProject)
    const newRecords = this.repo.insertMany(parsed.records)
    this.repo.insertPrompts(parsed.prompts)
    this.repo.setOffset(host.id, path, offset + parsed.consumedBytes)
    return { newRecords, skippedLines: parsed.skippedLines }
  }

  private stats(host: Host, files: number, newRecords: number, skippedLines: number, failedFiles: number): CollectStats {
    return { host: host.id, files, newRecords, skippedLines, failedFiles, finishedAt: Date.now() }
  }
}
