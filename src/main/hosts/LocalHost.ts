import { exec as execCallback } from 'node:child_process'
import { mkdir, open, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { dirname } from 'node:path'
import type { DirEntry, ExecResult, FileStat, Host } from './Host'

const RENAME_RETRIES = 5
const RENAME_RETRY_DELAY_MS = 150
const EXEC_TIMEOUT_MS = 10_000

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** Der Rechner, auf dem die App läuft. */
export class LocalHost implements Host {
  readonly id = 'local' as const
  readonly separator = process.platform === 'win32' ? ('\\' as const) : ('/' as const)

  async homeDir(): Promise<string> {
    return homedir()
  }

  async readDir(path: string): Promise<DirEntry[]> {
    const entries = await readdir(path, { withFileTypes: true })
    return entries.map((e) => ({ name: e.name, isDirectory: e.isDirectory() }))
  }

  /** Liest nur ab `start`, damit große, wachsende JSONL-Dateien nicht jedes Mal komplett geladen werden. */
  async readFile(path: string, start = 0, maxLength?: number): Promise<Buffer> {
    if (start <= 0 && maxLength === undefined) return readFile(path)
    const handle = await open(path, 'r')
    try {
      const { size } = await handle.stat()
      const length = Math.min(Math.max(0, size - start), maxLength ?? Number.POSITIVE_INFINITY)
      const buffer = Buffer.alloc(length)
      const { bytesRead } = await handle.read(buffer, 0, length, start)
      return buffer.subarray(0, bytesRead)
    } finally {
      await handle.close()
    }
  }

  async stat(path: string): Promise<FileStat | null> {
    try {
      const s = await stat(path)
      return { size: s.size, mtimeMs: s.mtimeMs, isDirectory: s.isDirectory() }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  }

  /** Schreibt in eine Temp-Datei daneben und benennt um. Unter Windows kurz wiederholen, falls OneDrive/Obsidian die Datei sperrt. */
  async writeFileAtomic(path: string, data: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true })
    const temp = `${path}.aii-${process.pid}-${Date.now()}.tmp`
    await writeFile(temp, data, 'utf8')
    for (let attempt = 0; ; attempt++) {
      try {
        await rename(temp, path)
        return
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code
        if (attempt >= RENAME_RETRIES || (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES')) throw error
        await sleep(RENAME_RETRY_DELAY_MS)
      }
    }
  }

  async writeFileBytes(path: string, data: Uint8Array): Promise<void> {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, data)
  }

  async remove(path: string): Promise<void> {
    await rm(path, { force: true })
  }

  async tempDir(): Promise<string> {
    return tmpdir()
  }

  exec(command: string): Promise<ExecResult> {
    return new Promise((resolve) => {
      execCallback(command, { timeout: EXEC_TIMEOUT_MS, windowsHide: true }, (error, stdout, stderr) => {
        const code = error ? (typeof error.code === 'number' ? error.code : 1) : 0
        resolve({ stdout, stderr, code })
      })
    })
  }
}
