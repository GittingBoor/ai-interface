import type { HostId } from '@shared/types'
import { HostUnreachableError } from '../../src/main/errors'
import type { DirEntry, ExecResult, FileStat, Host, HostDirectory } from '../../src/main/hosts/Host'

/** In-Memory-Host für Tests. Verzeichnisse ergeben sich aus den Dateipfaden. */
export class FakeHost implements Host {
  readonly separator = '/' as const
  readonly files = new Map<string, { data: Buffer; mtimeMs: number }>()
  offline = false
  /** Wird nach jedem readFile einmal aufgerufen (simuliert fremde Änderungen). */
  afterRead: (() => void) | null = null
  failRead: ((path: string) => boolean) | null = null
  execHandler: (command: string) => ExecResult = () => ({ stdout: '', stderr: 'not found', code: 127 })
  private clock = 1_000

  constructor(
    readonly id: HostId = 'local',
    private readonly home = '/home/alex'
  ) {}

  setFile(path: string, content: string | Buffer): void {
    this.clock += 1_000
    this.files.set(path, { data: Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8'), mtimeMs: this.clock })
  }

  appendFile(path: string, content: string): void {
    const current = this.files.get(path)?.data ?? Buffer.alloc(0)
    this.setFile(path, Buffer.concat([current, Buffer.from(content, 'utf8')]))
  }

  text(path: string): string {
    return this.files.get(path)?.data.toString('utf8') ?? ''
  }

  private guard(): void {
    if (this.offline) throw new HostUnreachableError(this.id, 'Testmodus offline')
  }

  async homeDir(): Promise<string> {
    this.guard()
    return this.home
  }

  async readDir(path: string): Promise<DirEntry[]> {
    this.guard()
    const prefix = `${path.replace(/\/$/, '')}/`
    const names = new Map<string, boolean>()
    for (const file of this.files.keys()) {
      if (!file.startsWith(prefix)) continue
      const [first, ...rest] = file.slice(prefix.length).split('/')
      if (first) names.set(first, rest.length > 0 || (names.get(first) ?? false))
    }
    if (names.size === 0) throw Object.assign(new Error(`ENOENT ${path}`), { code: 'ENOENT' })
    return [...names.entries()].map(([name, isDirectory]) => ({ name, isDirectory }))
  }

  async readFile(path: string, start = 0, length?: number): Promise<Buffer> {
    this.guard()
    if (this.failRead?.(path)) throw Object.assign(new Error(`EACCES ${path}`), { code: 'EACCES' })
    const file = this.files.get(path)
    if (!file) throw Object.assign(new Error(`ENOENT ${path}`), { code: 'ENOENT' })
    const hook = this.afterRead
    this.afterRead = null
    hook?.()
    return file.data.subarray(start, length === undefined ? undefined : start + length)
  }

  async stat(path: string): Promise<FileStat | null> {
    this.guard()
    const file = this.files.get(path)
    if (file) return { size: file.data.length, mtimeMs: file.mtimeMs, isDirectory: false }
    const isDir = [...this.files.keys()].some((f) => f.startsWith(`${path.replace(/\/$/, '')}/`))
    return isDir ? { size: 0, mtimeMs: 0, isDirectory: true } : null
  }

  async writeFileAtomic(path: string, data: string): Promise<void> {
    this.guard()
    this.setFile(path, data)
  }

  async writeFileBytes(path: string, data: Uint8Array): Promise<void> {
    this.guard()
    this.setFile(path, Buffer.from(data))
  }

  async remove(path: string): Promise<void> {
    this.guard()
    this.files.delete(path)
  }

  async tempDir(): Promise<string> {
    return '/tmp'
  }

  async exec(command: string): Promise<ExecResult> {
    this.guard()
    return this.execHandler(command)
  }
}

/** Rechnerverzeichnis aus festen Test-Hosts; unbekannte IDs liefern `fallback`. */
export function fakeHosts(hosts: Readonly<Record<string, Host>>, fallback: Host = new FakeHost()): HostDirectory {
  return {
    ids: () => Object.keys(hosts).length ? Object.keys(hosts) : ['local'],
    label: (id) => id,
    isEnabled: () => true,
    get: (id) => hosts[id] ?? fallback
  }
}
