import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import ssh2, { Client, type ClientChannel, type ConnectConfig, type PseudoTtyOptions, type SFTPWrapper } from 'ssh2'

// `ssh2` ist CommonJS: `utils` ist im ESM-Build nur über den Default-Export erreichbar.
const { utils } = ssh2
import type { SshSettings } from '@shared/types'
import { AppError, HostUnreachableError } from '../errors'

const READY_TIMEOUT_MS = 6_000
const KEEPALIVE_INTERVAL_MS = 15_000
const WINDOWS_AGENT_PIPE = '\\\\.\\pipe\\openssh-ssh-agent'

export class HostKeyMismatchError extends AppError {
  constructor(label: string) {
    super(
      'HOST_KEY_MISMATCH',
      `Der SSH-Schlüssel von „${label}“ hat sich geändert, Verbindung abgelehnt.`,
      `Wenn „${label}“ neu installiert wurde: Einstellungen → Geräte → Fingerabdruck zurücksetzen.`
    )
  }
}

/** `~` am Anfang eines Pfads (z. B. `~/.ssh/id_ed25519`) steht für den Home-Ordner dieses PCs. */
export function expandHome(path: string): string {
  return /^~(?=$|[\\/])/.test(path) ? join(homedir(), path.slice(1)) : path
}

/** Eine wiederverwendete SSH-Verbindung zu einem Gerät (lazy, mit automatischem Neuaufbau). */
export class SshConnection {
  private client: Promise<Client> | null = null
  private sftpChannel: Promise<SFTPWrapper> | null = null

  constructor(
    private readonly settings: () => SshSettings,
    private readonly rememberFingerprint: (fingerprint: string) => void,
    private readonly label: () => string = () => 'Gerät'
  ) {}

  async exec(command: string): Promise<{ stdout: string; stderr: string; code: number }> {
    const client = await this.connect()
    return new Promise((resolve, reject) => {
      client.exec(command, (error, stream) => {
        if (error) return reject(new HostUnreachableError(this.label(), error.message))
        let stdout = ''
        let stderr = ''
        stream.on('data', (d: Buffer) => (stdout += d.toString('utf8')))
        stream.stderr.on('data', (d: Buffer) => (stderr += d.toString('utf8')))
        stream.on('close', (code: number | null) => resolve({ stdout, stderr, code: code ?? 0 }))
      })
    })
  }

  async shell(pty: PseudoTtyOptions): Promise<ClientChannel> {
    const client = await this.connect()
    return new Promise((resolve, reject) => {
      client.shell(pty, (error, stream) => (error ? reject(new HostUnreachableError(this.label(), error.message)) : resolve(stream)))
    })
  }

  sftp(): Promise<SFTPWrapper> {
    this.sftpChannel ??= this.connect().then(
      (client) =>
        new Promise<SFTPWrapper>((resolve, reject) =>
          client.sftp((error, sftp) => (error ? reject(new HostUnreachableError(this.label(), error.message)) : resolve(sftp)))
        )
    )
    this.sftpChannel.catch(() => (this.sftpChannel = null))
    return this.sftpChannel
  }

  dispose(): void {
    void this.client?.then((c) => c.end()).catch(() => undefined)
    this.client = null
    this.sftpChannel = null
  }

  private connect(): Promise<Client> {
    const s = this.settings()
    if (!s.enabled) return Promise.reject(new HostUnreachableError(this.label(), 'in den Einstellungen deaktiviert'))
    this.client ??= new Promise<Client>((resolve, reject) => {
      const client = new Client()
      let mismatch = false
      client
        .on('ready', () => resolve(client))
        .on('error', (error) => {
          this.reset()
          reject(mismatch ? new HostKeyMismatchError(this.label()) : new HostUnreachableError(this.label(), error.message))
        })
        .on('close', () => this.reset())
      const config: ConnectConfig = {
        host: s.host,
        port: s.port,
        username: s.user,
        readyTimeout: READY_TIMEOUT_MS,
        keepaliveInterval: KEEPALIVE_INTERVAL_MS,
        hostHash: 'sha256',
        hostVerifier: (fingerprint: string) => {
          if (!s.hostFingerprint) {
            this.rememberFingerprint(fingerprint)
            return true
          }
          mismatch = fingerprint !== s.hostFingerprint
          return !mismatch
        },
        ...this.credentials(s)
      }
      client.connect(config)
    })
    // Synchrone Fehler (z. B. Schlüssel fehlt) dürfen kein abgelehntes Promise dauerhaft hinterlassen.
    const pending = this.client
    pending.catch(() => {
      if (this.client === pending) this.reset()
    })
    return pending
  }

  /** Unverschlüsselter Schlüssel direkt, sonst SSH-Agent (Passphrase-Schlüssel liegen dort). */
  private credentials(s: SshSettings): Pick<ConnectConfig, 'privateKey' | 'agent'> {
    const agent = process.platform === 'win32' ? WINDOWS_AGENT_PIPE : process.env['SSH_AUTH_SOCK']
    const keyPath = expandHome(s.privateKeyPath)
    const key = keyPath && existsSync(keyPath) ? readFileSync(keyPath) : null
    const usableKey = key && !(utils.parseKey(key) instanceof Error) ? key : null
    if (usableKey) return { privateKey: usableKey, ...(agent ? { agent } : {}) }
    if (agent) return { agent }
    if (key) {
      throw new HostUnreachableError(this.label(), `SSH-Schlüssel ${s.privateKeyPath} hat eine Passphrase; bitte den SSH-Agent starten (ssh-add)`)
    }
    throw new HostUnreachableError(this.label(), `SSH-Schlüssel ${s.privateKeyPath} fehlt und kein SSH-Agent läuft`)
  }

  private reset(): void {
    this.client = null
    this.sftpChannel = null
  }
}
