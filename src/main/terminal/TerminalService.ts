import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import * as pty from 'node-pty'
import type { ClientChannel } from 'ssh2'
import type { HostId, TerminalInfo, TerminalOpenRequest } from '@shared/types'
import { NotFoundError } from '../errors'
import type { SshConnection } from '../hosts/SshConnection'
import { TERMINAL_ID_ENV } from '../notify/hookSettings'
import { buildLaunch, terminalEnv } from './launchCommand'

/** Letzte Ausgabe je Terminal, damit ein Tab nach Seitenwechsel wieder angezeigt werden kann. */
const SCROLLBACK_LIMIT = 256 * 1024
const TERM_NAME = 'xterm-256color'

/** Liefert die Hook-Einstellungen, mit denen Claude Ereignisse an die App meldet. */
export interface TerminalHooks {
  localSettingsPath(): string
  remoteSettingsPath(host: HostId): Promise<string>
}

/** Zusätze, die nur die App selbst setzt (nicht über IPC vom Renderer). */
export interface LaunchExtras {
  readonly initialPrompt?: string
  readonly extraArgs?: readonly string[]
  readonly orchestrator?: boolean
}

export interface TerminalEvents {
  onData(id: string, data: string): void
  onExit(id: string, code: number): void
  onOpen?(id: string): void
  onClose?(id: string): void
}

interface Session {
  info: TerminalInfo
  buffer: string
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
}

/** Verwaltet laufende Terminals (lokal über node-pty, Geräte über eine SSH-Shell). */
export class TerminalService {
  private readonly sessions = new Map<string, Session>()

  constructor(
    private readonly ssh: (host: HostId) => SshConnection,
    private readonly claudeCommand: () => string,
    private readonly events: TerminalEvents,
    private readonly hooks: TerminalHooks | null = null
  ) {}

  async open(request: TerminalOpenRequest, extras: LaunchExtras = {}): Promise<TerminalInfo> {
    const id = randomUUID()
    const info: TerminalInfo = {
      id,
      host: request.host,
      path: request.path,
      mode: request.mode,
      title: request.title,
      running: true,
      startedAt: Date.now(),
      ...(extras.orchestrator ? { orchestrator: true } : {})
    }
    const session = request.host === 'local' ? this.openLocal(info, request, extras) : await this.openSsh(info, request, extras)
    this.sessions.set(id, session)
    this.events.onOpen?.(id)
    return info
  }

  list(): TerminalInfo[] {
    return [...this.sessions.values()].map((s) => s.info)
  }

  info(id: string): TerminalInfo {
    return this.get(id).info
  }

  snapshot(id: string): string {
    return this.get(id).buffer
  }

  write(id: string, data: string): void {
    this.get(id).write(data)
  }

  resize(id: string, cols: number, rows: number): void {
    this.get(id).resize(cols, rows)
  }

  close(id: string): void {
    const session = this.sessions.get(id)
    if (!session) return
    if (session.info.running) session.kill()
    this.sessions.delete(id)
    this.events.onClose?.(id)
  }

  closeAll(): void {
    for (const id of [...this.sessions.keys()]) this.close(id)
  }

  private openLocal(info: TerminalInfo, request: TerminalOpenRequest, extras: LaunchExtras): Session {
    if (!existsSync(request.path)) throw new NotFoundError(`Der Ordner ${request.path}`, 'Pfad des Favoriten prüfen.')
    const spec = buildLaunch({
      platform: process.platform,
      target: 'local',
      path: request.path,
      mode: request.mode,
      claudeCommand: this.claudeCommand(),
      shell: process.env['SHELL'],
      terminalId: info.id,
      ...(request.sessionId ? { sessionId: request.sessionId } : {}),
      ...(extras.initialPrompt ? { initialPrompt: extras.initialPrompt } : {}),
      ...(extras.extraArgs ? { extraArgs: extras.extraArgs } : {}),
      ...(this.hooks ? { hookSettingsPath: this.hooks.localSettingsPath() } : {})
    })
    if (spec.kind !== 'local') throw new Error('Unerwarteter Startbefehl für lokales Terminal')
    const proc = pty.spawn(spec.file, [...spec.args], {
      name: TERM_NAME,
      cols: request.cols,
      rows: request.rows,
      cwd: spec.cwd,
      env: { ...terminalEnv(process.env), [TERMINAL_ID_ENV]: info.id }
    })
    const session: Session = {
      info,
      buffer: '',
      write: (data) => proc.write(data),
      resize: (cols, rows) => proc.resize(cols, rows),
      kill: () => proc.kill()
    }
    proc.onData((data) => this.emitData(session, data))
    proc.onExit(({ exitCode }) => this.emitExit(session, exitCode))
    return session
  }

  private async openSsh(info: TerminalInfo, request: TerminalOpenRequest, extras: LaunchExtras): Promise<Session> {
    // Ohne Hook-Datei (z. B. Schreibfehler) startet Claude trotzdem, nur ohne Benachrichtigungen.
    const hookSettingsPath = request.mode === 'shell' ? undefined : await this.hooks?.remoteSettingsPath(request.host).catch(() => undefined)
    const spec = buildLaunch({
      platform: 'linux',
      target: 'ssh',
      path: request.path,
      mode: request.mode,
      claudeCommand: this.claudeCommand(),
      shell: undefined,
      terminalId: info.id,
      ...(request.sessionId ? { sessionId: request.sessionId } : {}),
      ...(extras.initialPrompt ? { initialPrompt: extras.initialPrompt } : {}),
      ...(extras.extraArgs ? { extraArgs: extras.extraArgs } : {}),
      ...(hookSettingsPath ? { hookSettingsPath } : {})
    })
    if (spec.kind !== 'ssh') throw new Error('Unerwarteter Startbefehl für SSH-Terminal')
    const channel: ClientChannel = await this.ssh(request.host).shell({ term: TERM_NAME, cols: request.cols, rows: request.rows })
    const session: Session = {
      info,
      buffer: '',
      write: (data) => channel.write(data),
      resize: (cols, rows) => channel.setWindow(rows, cols, 0, 0),
      kill: () => channel.close()
    }
    channel.on('data', (data: Buffer) => this.emitData(session, data.toString('utf8')))
    channel.stderr.on('data', (data: Buffer) => this.emitData(session, data.toString('utf8')))
    channel.on('close', () => this.emitExit(session, 0))
    channel.write(spec.initialInput)
    return session
  }

  private emitData(session: Session, data: string): void {
    session.buffer = (session.buffer + data).slice(-SCROLLBACK_LIMIT)
    this.events.onData(session.info.id, data)
  }

  private emitExit(session: Session, code: number): void {
    if (!session.info.running) return
    session.info = { ...session.info, running: false }
    this.events.onExit(session.info.id, code)
  }

  private get(id: string): Session {
    const session = this.sessions.get(id)
    if (!session) throw new NotFoundError(`Terminal ${id}`, 'Tab schließen und neu öffnen.')
    return session
  }
}
