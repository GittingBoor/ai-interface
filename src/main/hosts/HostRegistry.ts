import type { DeviceSettings, HostId, SshSettings } from '@shared/types'
import { NotFoundError } from '../errors'
import type { Host } from './Host'
import { LocalHost } from './LocalHost'
import { SshConnection } from './SshConnection'
import { SshHost } from './SshHost'

export const LOCAL_LABEL = 'Dieser PC'

interface Remote {
  readonly connection: SshConnection
  readonly host: SshHost
  /** Verbindungsdaten beim Aufbau; ändern sie sich, wird neu verbunden. */
  readonly signature: string
}

const signatureOf = (d: SshSettings): string => JSON.stringify([d.enabled, d.host, d.port, d.user, d.privateKeyPath])

/** Dieser Rechner und alle Geräte aus den Einstellungen; SSH-Verbindungen entstehen erst bei Bedarf. */
export class HostRegistry {
  private readonly local = new LocalHost()
  private readonly remotes = new Map<HostId, Remote>()

  constructor(
    private readonly devices: () => readonly DeviceSettings[],
    private readonly rememberFingerprint: (id: HostId, fingerprint: string) => void
  ) {}

  /** `local` und alle Geräte (auch ausgeschaltete). */
  ids(): HostId[] {
    return ['local', ...this.devices().map((d) => d.id)]
  }

  device(id: HostId): DeviceSettings | undefined {
    return this.devices().find((d) => d.id === id)
  }

  label(id: HostId): string {
    return id === 'local' ? LOCAL_LABEL : (this.device(id)?.name ?? id)
  }

  isEnabled(id: HostId): boolean {
    return id === 'local' || (this.device(id)?.enabled ?? false)
  }

  get(id: HostId): Host {
    if (id === 'local') return this.local
    return this.remote(id).host
  }

  connection(id: HostId): SshConnection {
    return this.remote(id).connection
  }

  /** Nach Änderung der Geräte: Verbindungen entfernter oder geänderter Geräte schließen. */
  sync(): void {
    for (const [id, remote] of this.remotes) {
      const device = this.device(id)
      if (device && signatureOf(device) === remote.signature) continue
      remote.connection.dispose()
      this.remotes.delete(id)
    }
  }

  /** Verbindung eines Geräts schließen (z. B. nach Zurücksetzen des Fingerabdrucks). */
  resetConnection(id?: HostId): void {
    for (const [key, remote] of this.remotes) {
      if (id !== undefined && key !== id) continue
      remote.connection.dispose()
      this.remotes.delete(key)
    }
  }

  private remote(id: HostId): Remote {
    const existing = this.remotes.get(id)
    if (existing) return existing
    const device = this.device(id)
    if (!device) throw new NotFoundError(`Gerät „${id}“`, 'In den Einstellungen unter Geräte anlegen oder das Projekt entfernen.')
    const label = (): string => this.label(id)
    const connection = new SshConnection(
      () => this.device(id) ?? { ...device, enabled: false },
      (fingerprint) => this.rememberFingerprint(id, fingerprint),
      label
    )
    const remote: Remote = { connection, host: new SshHost(connection, id, label), signature: signatureOf(device) }
    this.remotes.set(id, remote)
    return remote
  }
}
