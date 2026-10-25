import type { UpdateMode, UpdatePhase, UpdateState } from '@shared/types'
import type { UpdateCheck } from './StartupUpdater'

export interface UpdateSource {
  check(): Promise<UpdateCheck>
  /** Liefert den Pfad des gebauten Installers. */
  build(): Promise<string>
}

export interface UpdateServiceDeps {
  /** Nur die installierte Windows-App kann sich selbst aktualisieren. */
  readonly supported: boolean
  readonly source: UpdateSource
  readonly mode: () => UpdateMode
  readonly launchInstaller: (installerPath: string) => void
  readonly quit: () => void
  readonly notify: (title: string, body: string) => void
  readonly emit: (state: UpdateState) => void
  readonly log: (message: string) => void
  readonly logError: (message: string, error: unknown) => void
  /** Direkt nach dem Login ist das Netz oft noch nicht da. */
  readonly waitForNetwork: () => Promise<void>
}

const BUSY_PHASES: readonly UpdatePhase[] = ['checking', 'building', 'installing']

/** Sucht nach neuen Ständen auf GitHub; installiert je nach Einstellung selbst oder erst auf Knopfdruck. */
export class UpdateService {
  private current: UpdateState
  private checkedAtStartup = false
  private loginHandled = false
  private notified = false

  constructor(private readonly deps: UpdateServiceDeps) {
    this.current = { phase: deps.supported ? 'idle' : 'unsupported', detail: null, checkedAt: null }
  }

  state(): UpdateState {
    return this.current
  }

  /** Einmal pro Prozess prüfen; der Login-Start darf als zweite Instanz nachkommen und dann automatisch installieren. */
  async startup(login: boolean): Promise<void> {
    if (!this.deps.supported) return
    const autoInstall = login && !this.loginHandled && this.deps.mode() === 'auto'
    if (login) this.loginHandled = true
    if (this.checkedAtStartup && !autoInstall) return
    this.checkedAtStartup = true
    if (login) await this.deps.waitForNetwork()
    await this.check()
    if (this.current.phase !== 'available') return
    if (autoInstall) await this.install()
    else this.notifyAvailable()
  }

  async check(): Promise<UpdateState> {
    if (!this.deps.supported || this.busy()) return this.current
    this.set('checking', null)
    try {
      const result = await this.deps.source.check()
      this.deps.log(`Update-Prüfung: ${JSON.stringify(result)}`)
      this.set(result.kind, result.kind === 'skipped' ? result.reason : null, Date.now())
    } catch (error) {
      this.fail('Update-Prüfung fehlgeschlagen', error)
    }
    return this.current
  }

  /** Baut im Hintergrund und beendet danach die App; das Installationsskript startet sie neu. */
  async install(): Promise<void> {
    if (!this.deps.supported || this.busy()) return
    this.set('building', null)
    try {
      const installerPath = await this.deps.source.build()
      this.deps.log(`Update gebaut: ${installerPath}`)
      this.set('installing', null)
      this.deps.notify('AI Interface wird aktualisiert', 'Neue Version ist gebaut, die App startet gleich neu.')
      this.deps.launchInstaller(installerPath)
      this.deps.quit()
    } catch (error) {
      this.fail('Update fehlgeschlagen', error)
      this.deps.notify('Update fehlgeschlagen', 'Die App läuft mit der alten Version weiter; Details in den Einstellungen.')
    }
  }

  private notifyAvailable(): void {
    if (this.notified) return
    this.notified = true
    this.deps.notify('Update verfügbar', 'Neue Version auf GitHub. In der Seitenleiste auf „Aktualisieren“ klicken.')
  }

  private busy(): boolean {
    return BUSY_PHASES.includes(this.current.phase)
  }

  private fail(message: string, error: unknown): void {
    this.deps.logError(message, error)
    const detail = error instanceof Error ? error.message : String(error)
    this.set('failed', detail, Date.now())
  }

  private set(phase: UpdatePhase, detail: string | null, checkedAt: number | null = this.current.checkedAt): void {
    this.current = { phase, detail, checkedAt }
    this.deps.emit(this.current)
  }
}
