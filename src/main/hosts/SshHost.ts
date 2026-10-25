import { posix } from 'node:path'
import type { SFTPWrapper, Stats } from 'ssh2'
import { HostUnreachableError } from '../errors'
import type { DirEntry, ExecResult, FileStat, Host } from './Host'
import { shellQuote } from './shellQuote'
import type { SshConnection } from './SshConnection'
import type { HostId } from '@shared/types'

const S_IFMT = 0o170000
const S_IFDIR = 0o040000
const SFTP_NO_SUCH_FILE = 2
const REMOTE_TEMP_DIR = '/tmp'

const isDir = (mode: number): boolean => (mode & S_IFMT) === S_IFDIR

const sftpCall = <T>(fn: (cb: (error: Error | null | undefined, value: T) => void) => void): Promise<T> =>
  new Promise((resolve, reject) => fn((error, value) => (error ? reject(error) : resolve(value))))

const isNoSuchFile = (error: unknown): boolean => (error as { code?: unknown }).code === SFTP_NO_SUCH_FILE

/** Ein Gerät über SSH/SFTP. */
export class SshHost implements Host {
  readonly separator = '/' as const
  private home: string | null = null

  constructor(
    private readonly connection: SshConnection,
    readonly id: HostId,
    private readonly label: () => string
  ) {}

  async homeDir(): Promise<string> {
    if (this.home) return this.home
    const result = await this.exec('printf %s "$HOME"')
    if (result.code !== 0 || !result.stdout) throw new HostUnreachableError(this.label(), 'Home-Verzeichnis nicht ermittelbar')
    this.home = result.stdout
    return this.home
  }

  async readDir(path: string): Promise<DirEntry[]> {
    const sftp = await this.connection.sftp()
    const list = await this.wrap(sftpCall<{ filename: string; attrs: Stats }[]>((cb) => sftp.readdir(path, cb)), path)
    return list.map((e) => ({ name: e.filename, isDirectory: isDir(e.attrs.mode) }))
  }

  async readFile(path: string, start = 0, length?: number): Promise<Buffer> {
    const sftp = await this.connection.sftp()
    return this.wrap(this.readStream(sftp, path, start, length), path)
  }

  async stat(path: string): Promise<FileStat | null> {
    const sftp = await this.connection.sftp()
    try {
      const s = await sftpCall<Stats>((cb) => sftp.stat(path, cb))
      return { size: s.size, mtimeMs: s.mtime * 1000, isDirectory: isDir(s.mode) }
    } catch (error) {
      if (isNoSuchFile(error)) return null
      throw error
    }
  }

  async writeFileAtomic(path: string, data: string): Promise<void> {
    const dir = posix.dirname(path)
    const temp = `${path}.aii-${Date.now()}.tmp`
    await this.run(`mkdir -p ${shellQuote(dir)}`)
    const sftp = await this.connection.sftp()
    await sftpCall<void>((cb) => sftp.writeFile(temp, data, 'utf8', (e) => cb(e, undefined)))
    await this.run(`mv -f ${shellQuote(temp)} ${shellQuote(path)}`)
  }

  async writeFileBytes(path: string, data: Uint8Array): Promise<void> {
    await this.run(`mkdir -p ${shellQuote(posix.dirname(path))}`)
    const sftp = await this.connection.sftp()
    await sftpCall<void>((cb) => sftp.writeFile(path, Buffer.from(data), (e) => cb(e, undefined)))
  }

  async remove(path: string): Promise<void> {
    await this.run(`rm -f ${shellQuote(path)}`)
  }

  async tempDir(): Promise<string> {
    return REMOTE_TEMP_DIR
  }

  exec(command: string): Promise<ExecResult> {
    return this.connection.exec(command)
  }

  private async run(command: string): Promise<void> {
    const result = await this.exec(command)
    if (result.code !== 0) throw new Error(`Befehl auf „${this.label()}“ fehlgeschlagen (${result.code}): ${result.stderr.trim()}`)
  }

  private readStream(sftp: SFTPWrapper, path: string, start: number, length: number | undefined): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      sftp
        .createReadStream(path, length === undefined ? { start } : { start, end: start + length - 1 })
        .on('data', (c: Buffer) => chunks.push(c))
        .on('error', reject)
        .on('end', () => resolve(Buffer.concat(chunks)))
    })
  }

  /** Fehlende Pfade als ENOENT melden, damit Aufrufer sie wie lokal behandeln können. */
  private async wrap<T>(promise: Promise<T>, path: string): Promise<T> {
    try {
      return await promise
    } catch (error) {
      if (isNoSuchFile(error)) throw Object.assign(new Error(`ENOENT ${path}`), { code: 'ENOENT' })
      throw error
    }
  }
}
