import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { ApiEvents } from '@shared/api'
import type { DeviceSettings, HostId, ImageMeta, InterruptedRun, ProjectTasks, Settings, SettingsPatch } from '@shared/types'
import { DbChangeWatcher } from './db/DbChangeWatcher'
import { openDatabase } from './db/Database'
import { CategoriesRepo } from './favorites/CategoriesRepo'
import { FavoritesRepo } from './favorites/FavoritesRepo'
import { FolderLister } from './files/FolderLister'
import { HostRegistry } from './hosts/HostRegistry'
import { SshConnection } from './hosts/SshConnection'
import { SetupService } from './setup/SetupService'
import { ScanOffsets } from './images/ScanOffsets'
import { ImageStore } from './images/ImageStore'
import { SessionImageScanner } from './images/SessionImageScanner'
import { CustomModelRepo } from './models/CustomModelRepo'
import { OllamaSource } from './models/OllamaSource'
import { defaultSettings, SettingsService } from './settings/SettingsService'
import { HookBridge } from './notify/HookBridge'
import { TerminalStatusTracker } from './terminal/TerminalStatusTracker'
import { NotificationService, type ShownNotification } from './notify/NotificationService'
import { MiniPcService } from './minipc/MiniPcService'
import { SkillsService } from './skills/SkillsService'
import type { AssistantService } from './assistant/AssistantService'
import { createAssistant } from './assistant/createAssistant'
import { QuotaService } from './quota/QuotaService'
import { InterruptedRunsRepo } from './runs/InterruptedRunsRepo'
import { QuotaFreeNotifier } from './runs/QuotaFreeNotifier'
import { RunScanner } from './runs/RunScanner'
import { PasteImageService } from './terminal/PasteImageService'
import { TerminalService } from './terminal/TerminalService'
import { TodoMarkdownStore } from './todos/TodoMarkdownStore'
import { UsageCollector } from './usage/UsageCollector'
import { UsageRepo } from './usage/UsageRepo'
import { UsageService } from './usage/UsageService'
import { UsageAnalytics } from './usage/UsageAnalytics'
import { VaultReader } from './vault/VaultReader'
import { OpenTasksService } from './tasks/OpenTasksService'
import { TaskChecksRepo } from './tasks/TaskChecksRepo'
import { TaskReviewService } from './tasks/TaskReviewService'
import { createTaskReviewTools } from './tasks/taskReviewTools'
import { PrivacyService, type PinStore } from './privacy/PrivacyService'
import { PrivateProjectsRepo } from './privacy/PrivateProjectsRepo'
import { filterFavorites, filterGit, filterMiniPc, filterRuns, filterSkills, filterTerminals, imagesAddedPayload, isTerminalHidden } from './privacy/filters'
import { WHISPER_ASSETS } from './speech/whisperAssets'
import { WhisperInstaller } from './speech/WhisperInstaller'
import { WhisperServer } from './speech/WhisperServer'
import { SpeechService } from './speech/SpeechService'
import { extractZip, freePort, spawnServer } from './speech/nodeAdapters'
import { AppError, OrchestratorUnavailableError } from './errors'
import { createOrchestratorTools } from './orchestrator/orchestratorTools'
import { OrchestratorMcpServer } from './orchestrator/OrchestratorMcpServer'
import { OrchestratorRelay } from './orchestrator/OrchestratorRelay'
import { OrchestratorService } from './orchestrator/OrchestratorService'
import { OrchestratorWorkspace } from './orchestrator/OrchestratorWorkspace'
import { pasteAndSubmit } from './orchestrator/terminalText'

const OLLAMA_TIMEOUT_MS = 2_000
const LOCAL_USAGE_INTERVAL_MS = 60_000
const REMOTE_USAGE_INTERVAL_MS = 5 * 60_000
const LOCAL_TODO_POLL_MS = 2_000
const REMOTE_TODO_POLL_MS = 30_000
const DB_WATCH_INTERVAL_MS = 2_000
/** Anmeldedaten von Claude Code (nur gelesen). */
const CREDENTIALS_FILE = '.credentials.json'
const PASTE_CLEANUP_INTERVAL_MS = 3_600_000
const PASTE_MAX_AGE_MS = 86_400_000
/** Settings-Schlüssel des PIN-Hashs (nicht Teil von `Settings`, geht nie an den Renderer). */
const PIN_KEY = 'privacyPin'
const WHISPER_READY_TIMEOUT_MS = 120_000
/** Wie oft wartende Statuszeilen an den Orchestrator geprüft werden. */
const RELAY_TICK_MS = 1_000
const ORCHESTRATOR_DIR = 'orchestrator'
const TASK_REVIEW_DIR = 'aufgaben-pruefung'
const TASK_TERMINAL_COLS = 120
const TASK_TERMINAL_ROWS = 32

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** Fingerabdrücke kommen nur aus TOFU oder dem Zurücksetzen, nie aus einem normalen Speichern. */
function keepFingerprints(next: readonly DeviceSettings[], current: readonly DeviceSettings[]): DeviceSettings[] {
  return next.map((d) => ({ ...d, hostFingerprint: current.find((c) => c.id === d.id)?.hostFingerprint ?? '' }))
}

/** Anbindung an den Desktop (Electron), damit der Container ohne Electron testbar bleibt. */
export interface Desktop {
  showNotification(notification: ShownNotification): void
  focusWindow(): void
  showInFolder(path: string): void
}

export type Emit = <E extends keyof ApiEvents>(event: E, payload: ApiEvents[E]) => void

const localDate = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

/** Baut alle Dienste zusammen und startet die Hintergrund-Abfragen. */
export class Container {
  readonly settings: SettingsService
  readonly hosts: HostRegistry
  readonly usage: UsageService
  readonly analytics: UsageAnalytics
  readonly favorites: FavoritesRepo
  readonly categories: CategoriesRepo
  readonly customModels: CustomModelRepo
  readonly images: ImageStore
  readonly ollama = new OllamaSource(fetchJson)
  readonly todos: TodoMarkdownStore
  readonly vault: VaultReader
  readonly tasks: OpenTasksService
  readonly terminals: TerminalService
  readonly pasteImages: PasteImageService
  readonly folders: FolderLister
  readonly notifications: NotificationService
  readonly terminalStatus = new TerminalStatusTracker()
  readonly quota: QuotaService
  readonly minipc: MiniPcService
  readonly skills: SkillsService
  readonly assistant: AssistantService
  readonly speech: SpeechService
  readonly privacy: PrivacyService
  readonly setup: SetupService
  readonly orchestrator: OrchestratorService
  readonly orchestratorRelay: OrchestratorRelay
  readonly taskReview: TaskReviewService
  private readonly hookBridge: HookBridge
  private readonly imageScanner: SessionImageScanner
  readonly runs: InterruptedRunsRepo
  private readonly runScanner: RunScanner
  private runsSignature = ''
  private readonly scanning = new Set<HostId>()
  private readonly timers: NodeJS.Timeout[] = []
  private readonly dbWatcher: DbChangeWatcher
  private todoSignature = ''
  private todoTimer: NodeJS.Timeout | null = null

  constructor(
    dataDir: string,
    private readonly emit: Emit,
    private readonly logError: (message: string, error: unknown) => void,
    desktop: Desktop
  ) {
    const db = openDatabase(join(dataDir, 'ai-interface.db'))
    this.dbWatcher = new DbChangeWatcher(db, () => this.emit('data:changed', { at: Date.now() }))
    this.settings = new SettingsService(db, defaultSettings(homedir(), process.platform))
    this.settings.migrate()
    this.hosts = new HostRegistry(
      () => this.settings.get().devices,
      (id, fingerprint) => this.updateDevice(id, { hostFingerprint: fingerprint })
    )
    const pins: PinStore = {
      get: () => {
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(PIN_KEY) as { value: string } | undefined
        return row ? (JSON.parse(row.value) as string) : null
      },
      set: (value) => void db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(PIN_KEY, JSON.stringify(value))
    }
    this.privacy = new PrivacyService(new PrivateProjectsRepo(db), pins, {
      now: Date.now,
      knownHosts: () => this.hosts.ids(),
      extraPrivate: () => [],
      onChange: (status) => {
        // Was der Assistent entsperrt über private Projekte erfahren hat, darf gesperrt nicht weiterleben.
        if (status.locked) void this.assistant.reset()
        this.emit('privacy:changed', status)
        this.emit('data:changed', { at: Date.now() })
      }
    })
    const hidden = (host: HostId, path: string | null): boolean => this.privacy.isHidden(host, path)
    const usageRepo = new UsageRepo(db, () => this.settings.get().prices, hidden)
    this.usage = new UsageService(usageRepo, new UsageCollector(usageRepo), this.hosts)
    this.analytics = new UsageAnalytics(db, () => this.settings.get().prices)
    this.favorites = new FavoritesRepo(db)
    this.categories = new CategoriesRepo(db)
    this.customModels = new CustomModelRepo(db)
    this.images = new ImageStore(db, join(dataDir, 'images'))
    this.imageScanner = new SessionImageScanner(
      new ScanOffsets(db, 'image_offsets'),
      this.images,
      () => this.favorites.list(),
      () => this.settings.get().images
    )
    const vaultHost = (): ReturnType<HostRegistry['get']> => this.hosts.get(this.settings.get().vault.host)
    this.todos = new TodoMarkdownStore(vaultHost, () => this.settings.get(), localDate)
    this.vault = new VaultReader(vaultHost, () => this.settings.get(), () => this.favorites.list())
    this.tasks = new OpenTasksService(this.vault, new TaskChecksRepo(db), logError)
    this.notifications = new NotificationService({
      settings: () => this.settings.get().notifications,
      terminal: (id) => this.terminals.list().find((t) => t.id === id && !hidden(t.host, t.path)),
      show: (n) => desktop.showNotification(n),
      focusTerminal: (id) => {
        // Alte Windows-Meldung eines inzwischen verborgenen Terminals: nichts öffnen.
        if (this.terminalHidden(id)) return
        desktop.focusWindow()
        this.emit('terminal:focus', { id })
      },
      now: Date.now
    })
    this.hookBridge = new HookBridge(
      (id) => this.hosts.get(id),
      dataDir,
      (id) => this.isEnabled(id),
      (events) => {
        this.notifications.handle(events)
        this.terminalStatus.handle(events)
        if (events.some((e) => e.kind === 'done')) void this.quota.refreshSoon()
      },
      logError,
      () => this.remoteIds()
    )
    this.terminals = new TerminalService(
      (id) => this.hosts.connection(id),
      () => this.settings.get().claudeCommand,
      {
        // Ausgabe verborgener Terminals bleibt im Main-Prozess (Snapshot nach dem Entsperren).
        onData: (id, data) => {
          if (!this.terminalHidden(id)) this.emit('terminal:data', { id, data })
        },
        onExit: (id, code) => {
          this.terminalStatus.exit(id)
          this.emit('terminal:exit', { id, code })
        },
        onOpen: (id) => this.terminalStatus.add(id),
        onClose: (id) => {
          this.terminalStatus.remove(id)
          this.orchestratorRelay.unwatch(id)
          void this.orchestrator.handleClosed(id).catch((error: unknown) => logError('Orchestrator-Server stoppen', error))
          void this.taskReview.handleClosed(id).catch((error: unknown) => logError('Server der Aufgaben-Prüfung stoppen', error))
        }
      },
      this.hookBridge
    )
    this.terminalStatus.subscribe((change) => {
      if (!this.terminalHidden(change.id)) this.emit('terminal:status', change)
    })
    this.orchestratorRelay = new OrchestratorRelay({
      orchestratorId: () => this.orchestrator.currentId(),
      status: (id) => this.terminalStatus.status(id),
      describe: (id) => {
        const info = this.terminals.list().find((t) => t.id === id)
        return info && !this.terminalHidden(id) ? `${info.title} (${this.hosts.label(info.host)}, Terminal ${info.id})` : null
      },
      deliver: async (text) => {
        const id = this.orchestrator.currentId()
        if (id) await pasteAndSubmit((data) => this.terminals.write(id, data), text, sleep)
      },
      now: Date.now
    })
    this.terminalStatus.subscribe((change) => this.orchestratorRelay.onStatus(change))
    this.orchestrator = this.createOrchestrator(dataDir, hidden)
    this.taskReview = this.createTaskReview(dataDir, hidden)
    this.runs = new InterruptedRunsRepo(db)
    this.minipc = new MiniPcService((id) => this.hosts.get(id))
    this.skills = new SkillsService(db, (id) => this.hosts.get(id), () => this.favorites.list(), () => this.settings.get().claudeCommand, (p) => this.emit('skills:progress', p))
    this.runScanner = new RunScanner(new ScanOffsets(db, 'run_offsets'), this.runs)
    const quotaFree = new QuotaFreeNotifier({
      openRuns: () => this.openRuns().length,
      enabled: () => this.settings.get().notifications.quotaFree,
      show: (title, body) =>
        desktop.showNotification({
          title,
          body,
          onClick: () => {
            desktop.focusWindow()
            this.emit('runs:show', { at: Date.now() })
          }
        })
    })
    this.quota = new QuotaService({
      readCredentials: () => readFile(join(homedir(), '.claude', CREDENTIALS_FILE), 'utf8').catch(() => null),
      fetch: (url, init) => fetch(url, init),
      now: Date.now,
      onUpdate: (state) => {
        this.emit('quota:updated', state)
        quotaFree.update(state)
      }
    })
    this.assistant = createAssistant({
      hosts: (id) => this.hosts.get(id),
      hostIds: () => this.hosts.ids().filter((id) => this.isEnabled(id)),
      settings: () => this.settings.get(),
      favorites: this.favorites,
      privacy: { filterFavorites: (items) => filterFavorites(items, hidden), filterSkills: (result) => filterSkills(result, hidden), filterMiniPc: (host, snapshot) => filterMiniPc(host, snapshot, hidden), filterGit: (host, items) => filterGit(host, items, hidden) },
      categories: this.categories,
      usage: this.usage,
      quota: this.quota,
      todos: this.todos,
      minipc: this.minipc,
      skills: this.skills,
      emit: (event) => this.emit('assistant:event', event),
      onDataChanged: () => this.emit('data:changed', { at: Date.now() })
    })
    this.folders = new FolderLister((id) => this.hosts.get(id))
    this.pasteImages = new PasteImageService((id) => this.hosts.get(id), this.terminals)
    const whisperInstaller = new WhisperInstaller({ rootDir: join(dataDir, 'whisper'), assets: WHISPER_ASSETS, fetch: (url, init) => fetch(url, init), extractZip })
    const whisperServer = new WhisperServer(whisperInstaller.serverPath, {
      spawn: spawnServer((line) => logError('Spracherkennung', line)),
      fetch: (url, init) => fetch(url, init),
      freePort,
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      log: (message) => logError('Spracherkennung', message),
      readyTimeoutMs: WHISPER_READY_TIMEOUT_MS
    })
    this.setup = new SetupService({
      host: this.hosts.get('local'),
      platform: process.platform,
      settings: () => this.settings.get(),
      updateSettings: (patch) => this.updateSettings(patch),
      favorites: () => this.favorites.list(),
      addFavorite: (input) => this.favorites.add(input),
      categories: () => this.categories.list(),
      addCategory: (input) => this.categories.add(input),
      testSsh: async (device) => {
        // Eigene Verbindung, die keinen Fingerabdruck speichert: das Gerät ist evtl. noch gar nicht gespeichert.
        const probe = new SshConnection(() => device, () => undefined, () => device.name)
        try {
          await probe.exec('true')
        } finally {
          probe.dispose()
        }
      }
    })
    this.speech = new SpeechService({
      installer: whisperInstaller,
      server: whisperServer,
      fetch: (url, init) => fetch(url, init),
      settings: () => this.settings.get().speech,
      saveSettings: (speech) => this.settings.update({ speech }),
      onProgress: (p) => this.emit('speech:progress', p),
      platform: process.platform
    })
  }

  /** Werkzeuge, MCP-Server und Dienst des Orchestrators; Terminals sieht er nur außerhalb des Privatmodus. */
  private createOrchestrator(dataDir: string, hidden: (host: HostId, path: string | null) => boolean): OrchestratorService {
    const tools = createOrchestratorTools({
      projects: () => filterFavorites(this.favorites.list(), hidden),
      categories: () => this.categories.list(),
      hostLabel: (host) => this.hosts.label(host),
      terminals: () => filterTerminals(this.terminals.list(), hidden),
      status: (id) => this.terminalStatus.status(id),
      lastAnswer: (id) => this.terminalStatus.lastAnswer(id),
      pendingPrompt: (id) => this.terminalStatus.pendingPrompt(id),
      snapshot: (id) => this.terminals.snapshot(id),
      openTerminal: async (project, task) => {
        const request = { host: project.host, path: project.path, mode: 'new' as const, title: project.name, cols: TASK_TERMINAL_COLS, rows: TASK_TERMINAL_ROWS }
        const info = await this.terminals.open(request, { initialPrompt: task })
        this.emit('terminal:opened', info)
        return info
      },
      write: (id, data) => this.terminals.write(id, data),
      sleep,
      track: (id) => this.orchestratorRelay.watch(id)
    })
    const server = new OrchestratorMcpServer(() => tools, this.logError)
    return new OrchestratorService({
      workspace: new OrchestratorWorkspace(join(dataDir, ORCHESTRATOR_DIR)),
      server: {
        start: () =>
          server.start().catch((error: unknown) => {
            throw error instanceof AppError ? error : new OrchestratorUnavailableError(error instanceof Error ? error.message : String(error))
          }),
        stop: () => server.stop()
      },
      tools,
      settings: () => this.settings.get().orchestrator,
      openTerminal: (request, extras) => this.terminals.open(request, extras),
      terminal: (id) => this.terminals.list().find((t) => t.id === id)
    })
  }

  /** Offene Aufgaben ohne die verborgener Projekte. */
  async visibleTasks(): Promise<ProjectTasks[]> {
    const visible = new Set(filterFavorites(this.favorites.list(), (host, path) => this.privacy.isHidden(host, path)).map((f) => f.id))
    return (await this.tasks.list()).filter((t) => t.favoriteId === null || visible.has(t.favoriteId))
  }

  /** Claude prüft die offenen Aufgaben über eigene Werkzeuge und hakt erledigte ab. */
  private createTaskReview(dataDir: string, hidden: (host: HostId, path: string | null) => boolean): TaskReviewService {
    const tools = createTaskReviewTools({
      tasks: () => this.visibleTasks(),
      project: (favoriteId) => filterFavorites(this.favorites.list(), hidden).find((f) => f.id === favoriteId),
      hostLabel: (host) => this.hosts.label(host),
      host: (id) => this.hosts.get(id),
      markDone: (task) => this.taskReview.markDone(task),
      finish: (summary) => this.taskReview.finish(summary)
    })
    const server = new OrchestratorMcpServer(() => tools, this.logError)
    return new TaskReviewService({
      dir: join(dataDir, TASK_REVIEW_DIR),
      toolNames: tools.map((t) => t.name),
      server,
      openTerminal: (request, extras) => this.terminals.open(request, extras),
      closeTerminal: (id) => {
        this.terminals.close(id)
        this.emit('terminal:closed', { id })
      },
      terminal: (id) => this.terminals.list().find((t) => t.id === id),
      onFinished: (result) => this.emit('tasks:reviewed', result),
      check: (groupId, key) => this.tasks.check(groupId, key),
      schedule: (run, ms) => void setTimeout(run, ms)
    })
  }

  start(): void {
    void this.refreshUsage(this.hosts.ids())
    this.timers.push(setInterval(() => void this.refreshUsage(['local']), LOCAL_USAGE_INTERVAL_MS))
    this.timers.push(setInterval(() => void this.refreshUsage(this.remoteIds()), REMOTE_USAGE_INTERVAL_MS))
    this.scheduleTodoPoll()
    this.dbWatcher.start(DB_WATCH_INTERVAL_MS)
    this.hookBridge.start()
    this.quota.start()
    void this.cleanupPastedImages()
    this.timers.push(setInterval(() => void this.cleanupPastedImages(), PASTE_CLEANUP_INTERVAL_MS))
    this.timers.push(setInterval(() => void this.orchestratorRelay.tick().catch((error: unknown) => this.logError('Orchestrator-Statuszeile', error)), RELAY_TICK_MS))
  }

  stop(): void {
    this.timers.forEach(clearInterval)
    this.dbWatcher.stop()
    this.hookBridge.stop()
    this.quota.stop()
    if (this.todoTimer) clearTimeout(this.todoTimer)
    void this.orchestrator.stop()
    void this.taskReview.stop()
    this.terminals.closeAll()
    this.speech.stop()
    this.hosts.resetConnection()
  }

  /** Normale Updates dürfen gespeicherte Host-Fingerabdrücke nicht ändern (nur TOFU und `resetFingerprint`). */
  updateSettings(patch: SettingsPatch): Settings {
    const safePatch = patch.devices ? { ...patch, devices: keepFingerprints(patch.devices, this.settings.get().devices) } : patch
    const updated = this.settings.update(safePatch)
    if (patch.devices) {
      this.hosts.sync()
      this.hookBridge.forgetRemotes()
      // Neue oder geänderte Geräte gleich einlesen, damit Verbrauch und Rechner-Liste stimmen.
      void this.refreshUsage(this.remoteIds())
    }
    this.todoSignature = ''
    return updated
  }

  resetFingerprint(id: HostId): Settings {
    const updated = this.updateDevice(id, { hostFingerprint: '' })
    this.hosts.resetConnection(id)
    this.hookBridge.forgetRemotes()
    return updated
  }

  private updateDevice(id: HostId, patch: Partial<DeviceSettings>): Settings {
    return this.settings.update({ devices: this.settings.get().devices.map((d) => (d.id === id ? { ...d, ...patch } : d)) })
  }

  /** Dieser PC und alle eingeschalteten Geräte. */
  enabledHostIds(): HostId[] {
    return this.hosts.ids().filter((id) => this.isEnabled(id))
  }

  /** Eingeschaltete Geräte (ohne diesen PC). */
  private remoteIds(): HostId[] {
    return this.hosts.ids().filter((id) => id !== 'local' && this.isEnabled(id))
  }

  async refreshUsage(ids: readonly HostId[]): Promise<void> {
    try {
      this.emit('usage:updated', await this.usage.refresh(ids))
    } catch (error) {
      this.logError('Verbrauch sammeln fehlgeschlagen', error)
    }
    await this.scanSessions(ids)
  }

  /** Bilder und Durchläufe aus neuen Session-Zeilen; ein Host wird nie doppelt gleichzeitig gelesen. */
  private async scanSessions(ids: readonly HostId[]): Promise<void> {
    const free = ids.filter((id) => !this.scanning.has(id))
    if (!free.length) return
    free.forEach((id) => this.scanning.add(id))
    try {
      await this.scanSessionImages(free)
      await this.scanRuns(free)
    } finally {
      free.forEach((id) => this.scanning.delete(id))
    }
  }

  /** Abgebrochene Durchläufe aktualisieren und bei Änderung melden. */
  private async scanRuns(ids: readonly HostId[]): Promise<void> {
    for (const id of ids.filter((h) => this.isEnabled(h))) {
      try {
        await this.runScanner.scan(this.hosts.get(id))
      } catch (error) {
        if (id === 'local') this.logError('Offene Durchläufe lesen fehlgeschlagen', error)
      }
    }
    const open = this.openRuns()
    const signature = JSON.stringify(open)
    if (signature === this.runsSignature) return
    this.runsSignature = signature
    this.emit('runs:updated', open)
  }

  /** Offene Durchläufe ohne gerade private Projekte. */
  openRuns(): InterruptedRun[] {
    return filterRuns(this.runs.open(), (host, path) => this.privacy.isHidden(host, path))
  }

  /** Liegt das Terminal gerade in einem privaten Ordner? */
  terminalHidden(id: string): boolean {
    return isTerminalHidden(this.terminals.list(), id, (host, path) => this.privacy.isHidden(host, path))
  }

  /** Für „Aktualisieren“: Bilder aller Hosts sofort übernehmen. */
  scanImagesNow(): Promise<void> {
    return this.scanSessions(this.hosts.ids())
  }

  /** KI-Bilder aus neuen Session-Zeilen übernehmen; ein Offline-Gerät ist kein Fehler. */
  private async scanSessionImages(ids: readonly HostId[]): Promise<void> {
    const added: ImageMeta[] = []
    for (const id of ids.filter((h) => this.isEnabled(h))) {
      try {
        added.push(...(await this.imageScanner.scan(this.hosts.get(id))))
      } catch (error) {
        if (id === 'local') this.logError('KI-Bilder übernehmen fehlgeschlagen', error)
      }
    }
    const payload = imagesAddedPayload(added, (host, path) => this.privacy.isHidden(host, path))
    if (payload) this.emit('images:added', payload)
  }

  /** Alte eingefügte Bilder löschen; ein Offline-Gerät ist kein Fehler. */
  private async cleanupPastedImages(): Promise<void> {
    for (const id of this.hosts.ids().filter((h) => this.isEnabled(h))) {
      try {
        await this.pasteImages.cleanup(this.hosts.get(id), PASTE_MAX_AGE_MS)
      } catch (error) {
        if (id === 'local') this.logError('Eingefügte Bilder aufräumen fehlgeschlagen', error)
      }
    }
  }

  private isEnabled(id: HostId): boolean {
    return this.hosts.isEnabled(id)
  }

  /** Erkennt Änderungen an der TODO-Datei (Obsidian, OneDrive, andere Geräte) und meldet sie dem Renderer. */
  private scheduleTodoPoll(): void {
    const interval = this.settings.get().vault.host === 'local' ? LOCAL_TODO_POLL_MS : REMOTE_TODO_POLL_MS
    this.todoTimer = setTimeout(() => {
      void this.pollTodos().finally(() => this.scheduleTodoPoll())
    }, interval)
  }

  private async pollTodos(): Promise<void> {
    try {
      const signature = await this.todos.signature()
      if (signature === this.todoSignature) return
      const firstRun = this.todoSignature === ''
      this.todoSignature = signature
      if (!firstRun) this.emit('todos:changed', await this.todos.load())
    } catch {
      // Host offline: nächster Versuch im nächsten Intervall, der Renderer sieht den Fehler beim Laden.
    }
  }
}
