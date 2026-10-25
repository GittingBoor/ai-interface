import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { HostId } from '@shared/types'
import { type Host, joinPath } from '../hosts/Host'
import { HookEventReader } from './HookEventReader'
import { buildHookSettings, type HookEvent } from './hookSettings'

const LOCAL_SETTINGS_FILE = 'hooks-local.json'
const SPOOL_FILE = 'hook-events.log'
const REMOTE_SETTINGS_FILE = 'hooks.json'
const REMOTE_DIR = ['.cache', 'ai-interface'] as const
const LOCAL_POLL_MS = 1_000
const REMOTE_POLL_MS = 3_000

/** Hook-Einstellungen bereitstellen und Hook-Ereignisse aller Rechner einsammeln. */
export class HookBridge {
  private readonly localSpool: string
  private localSettings: string | null = null
  private readonly remoteSettings = new Map<HostId, Promise<string>>()
  private readonly readers = new Map<HostId, HookEventReader>()
  private readonly timers: NodeJS.Timeout[] = []

  constructor(
    private readonly hosts: (id: HostId) => Host,
    private readonly dataDir: string,
    private readonly isEnabled: (id: HostId) => boolean,
    private readonly onEvents: (events: HookEvent[]) => void,
    private readonly logError: (message: string, error: unknown) => void,
    private readonly remoteIds: () => readonly HostId[] = () => []
  ) {
    // Hooks laufen unter Windows in Git Bash: Vorwärtsschrägstriche sind dort sicher.
    this.localSpool = join(dataDir, SPOOL_FILE).replaceAll('\\', '/')
  }

  private reader(id: HostId): HookEventReader {
    let reader = this.readers.get(id)
    if (!reader) {
      const spool = id === 'local' ? async (): Promise<string> => this.localSpool : (): Promise<string> => this.remotePath(id, SPOOL_FILE)
      reader = new HookEventReader(this.hosts(id), spool, this.onEvents)
      this.readers.set(id, reader)
    }
    return reader
  }

  /** Datei mit den Hook-Einstellungen für lokale Terminals (wird beim ersten Aufruf geschrieben). */
  localSettingsPath(): string {
    if (this.localSettings) return this.localSettings
    const path = join(this.dataDir, LOCAL_SETTINGS_FILE)
    writeFileSync(path, buildHookSettings(this.localSpool), 'utf8')
    this.localSettings = path
    return path
  }

  /** Datei mit den Hook-Einstellungen auf einem Gerät (einmal je App-Lauf angelegt). */
  remoteSettingsPath(id: HostId): Promise<string> {
    let pending = this.remoteSettings.get(id)
    if (!pending) {
      pending = (async () => {
        const path = await this.remotePath(id, REMOTE_SETTINGS_FILE)
        await this.hosts(id).writeFileAtomic(path, buildHookSettings(await this.remotePath(id, SPOOL_FILE)))
        return path
      })()
      this.remoteSettings.set(id, pending)
      pending.catch(() => this.remoteSettings.delete(id))
    }
    return pending
  }

  /** Nach geänderten Geräten: Leser und Hook-Dateien der Geräte neu anlegen (neue Verbindung, evtl. anderer Rechner). */
  forgetRemotes(): void {
    for (const id of [...this.readers.keys()]) if (id !== 'local') this.readers.delete(id)
    this.remoteSettings.clear()
  }

  async pollOnce(): Promise<void> {
    await Promise.all(['local', ...this.remoteIds()].map((id) => this.poll(id)))
  }

  start(): void {
    this.timers.push(setInterval(() => void this.poll('local'), LOCAL_POLL_MS))
    this.timers.push(setInterval(() => void Promise.all(this.remoteIds().map((id) => this.poll(id))), REMOTE_POLL_MS))
  }

  stop(): void {
    this.timers.forEach(clearInterval)
    this.timers.length = 0
  }

  private async poll(id: HostId): Promise<void> {
    if (!this.isEnabled(id)) return
    try {
      await this.reader(id).poll()
    } catch (error) {
      // Gerät offline ist normal; nur lokale Fehler sind interessant.
      if (id === 'local') this.logError('Hook-Ereignisse lesen fehlgeschlagen', error)
    }
  }

  private async remotePath(id: HostId, file: string): Promise<string> {
    const host = this.hosts(id)
    return joinPath(host, await host.homeDir(), ...REMOTE_DIR, file)
  }
}
