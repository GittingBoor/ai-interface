import type { Result } from './result'
import type { PrivacyStatus, PrivateProject, PrivateProjectInput } from './privacy'
import type { SpeechModelId, SpeechProgress, SpeechStatus } from './speech'
import type {
  AnalyticsQuery,
  AnalyticsResult,
  AppInfo,
  BreakdownRange,
  DetectedProject,
  DeviceSettings,
  DeviceTestResult,
  PrerequisiteStatus,
  SetupDetection,
  SetupInput,
  VaultScan,
  HostFilter,
  ProjectActivity,
  Category,
  CategoryInput,
  CustomModel,
  CustomModelInput,
  Favorite,
  FavoriteInput,
  FavoritePatch,
  FolderEntry,
  HostId,
  HostStatus,
  ImageInput,
  ImageMeta,
  OllamaStatus,
  ProjectUsage,
  ProtocolDocument,
  GitState,
  AssistantEvent,
  InterruptedRun,
  SkillCatalogResult,
  MiniPcInfo,
  MiniPcSnapshot,
  OrchestratorLaunchMode,
  ProjectTasks,
  TaskReviewResult,
  ProtocolGroup,
  QuotaState,
  SessionSummary,
  Settings,
  UpdateState,
  SettingsPatch,
  TerminalInfo,
  TerminalOpenRequest,
  TerminalStatus,
  TerminalStatusChange,
  TodoChange,
  TodoState,
  UsageOverview
} from './types'

/** Alle Aufrufe des Renderers; jede Antwort ist ein `Result`. */
export interface AiApiCalls {
  readonly usage: {
    overview(): Promise<Result<UsageOverview>>
    projects(days: number): Promise<Result<ProjectUsage[]>>
    projectBreakdown(range: BreakdownRange, host: HostFilter): Promise<Result<ProjectActivity[]>>
    analytics(query: AnalyticsQuery): Promise<Result<AnalyticsResult>>
    sessions(limit: number, project?: string): Promise<Result<SessionSummary[]>>
    refresh(): Promise<Result<HostStatus[]>>
  }
  readonly hosts: {
    status(): Promise<Result<HostStatus[]>>
  }
  readonly favorites: {
    list(): Promise<Result<Favorite[]>>
    add(input: FavoriteInput): Promise<Result<Favorite>>
    update(id: number, patch: FavoritePatch): Promise<Result<Favorite>>
    remove(id: number): Promise<Result<void>>
    reorder(ids: number[]): Promise<Result<void>>
    pickFolder(): Promise<Result<string | null>>
    checkPath(host: HostId, path: string): Promise<Result<boolean>>
  }
  readonly categories: {
    list(): Promise<Result<Category[]>>
    add(input: CategoryInput): Promise<Result<Category>>
    update(id: number, patch: Partial<CategoryInput>): Promise<Result<Category>>
    /** Liefert die Zahl der Projekte, die dadurch „Ohne Art“ werden. */
    remove(id: number): Promise<Result<number>>
    reorder(ids: number[]): Promise<Result<void>>
  }
  readonly terminal: {
    open(request: TerminalOpenRequest): Promise<Result<TerminalInfo>>
    list(): Promise<Result<TerminalInfo[]>>
    snapshot(id: string): Promise<Result<string>>
    close(id: string): Promise<Result<void>>
    /** Bild aus der Zwischenablage ablegen und den Pfad einfügen; `null`, wenn kein Bild vorhanden ist. */
    pasteImage(id: string): Promise<Result<string | null>>
    /** Welche Terminals gerade sichtbar sind (unterdrückt Benachrichtigungen für diese). */
    setViewing(ids: string[], windowFocused: boolean): Promise<Result<void>>
    /** Aktueller Status je Terminal (danach Ereignis `terminal:status`). */
    statuses(): Promise<Result<Record<string, TerminalStatus>>>
  }
  readonly orchestrator: {
    /** Öffnet den Orchestrator oder liefert das offene Terminal. */
    open(mode: OrchestratorLaunchMode): Promise<Result<TerminalInfo>>
    /** Legt die CLAUDE.md bei Bedarf an und öffnet sie im Standard-Editor. */
    openClaudeMd(): Promise<Result<void>>
  }
  readonly todos: {
    load(): Promise<Result<TodoState>>
    apply(change: TodoChange): Promise<Result<TodoState>>
    create(): Promise<Result<TodoState>>
  }
  readonly images: {
    list(project?: string): Promise<Result<ImageMeta[]>>
    add(data: Uint8Array, input: ImageInput): Promise<Result<ImageMeta>>
    update(id: number, patch: Partial<Pick<ImageMeta, 'title' | 'project' | 'tags'>>): Promise<Result<ImageMeta>>
    remove(id: number): Promise<Result<void>>
  }
  readonly tasks: {
    /** Offene Aufgaben je Projekt aus dem neuesten Protokoll. */
    list(): Promise<Result<ProjectTasks[]>>
    check(groupId: string, key: string): Promise<Result<void>>
    uncheck(groupId: string, key: string): Promise<Result<void>>
    /** Startet die Aufgaben-Prüfung mit Claude oder liefert ihr offenes Terminal. */
    review(): Promise<Result<TerminalInfo>>
  }
  readonly vault: {
    list(): Promise<Result<ProtocolGroup[]>>
    /** `path` relativ zum Vault, aus `ProtocolEntry.path`. */
    read(path: string): Promise<Result<ProtocolDocument>>
  }
  readonly models: {
    ollama(): Promise<Result<OllamaStatus[]>>
    listCustom(): Promise<Result<CustomModel[]>>
    upsertCustom(input: CustomModelInput): Promise<Result<CustomModel>>
    removeCustom(id: number): Promise<Result<void>>
  }
  readonly settings: {
    get(): Promise<Result<Settings>>
    update(patch: SettingsPatch): Promise<Result<Settings>>
    /** Gespeicherten SSH-Fingerabdruck eines Geräts vergessen (nach Neuinstallation des Geräts). */
    resetFingerprint(deviceId: HostId): Promise<Result<Settings>>
  }
  readonly setup: {
    detect(): Promise<Result<SetupDetection>>
    scanProjects(root: string): Promise<Result<DetectedProject[]>>
    scanVault(path: string): Promise<Result<VaultScan>>
    testDevice(device: DeviceSettings): Promise<Result<DeviceTestResult>>
    finish(input: SetupInput): Promise<Result<Settings>>
    /** Claude Code, Anmeldung und (Windows) Git Bash; bei jedem Aufruf neu geprüft. */
    prerequisites(): Promise<Result<PrerequisiteStatus[]>>
  }
  readonly assistant: {
    /** Schickt eine Nachricht; kehrt zurück, wenn die Antwort fertig ist (Verlauf über `assistant:event`). */
    send(text: string): Promise<Result<void>>
    stop(): Promise<Result<void>>
    reset(): Promise<Result<void>>
    confirm(requestId: string, allowed: boolean): Promise<Result<void>>
  }
  readonly skills: {
    catalog(host: HostId): Promise<Result<SkillCatalogResult>>
    /** Gecachte KI-Zusammenfassungen je Inhalts-Hash. */
    summaries(hashes: string[]): Promise<Result<Record<string, string>>>
    /** Erzeugt fehlende Zusammenfassungen (Fortschritt über `skills:progress`); liefert die Anzahl neuer. */
    summarize(ids: string[]): Promise<Result<number>>
  }
  /** Zustand der angebundenen Geräte (früher nur der Mini-PC). */
  readonly minipc: {
    snapshot(host: HostId): Promise<Result<MiniPcSnapshot>>
    /** Gerät, Betriebssystem und Docker-Container (teurer als `snapshot`). */
    info(host: HostId): Promise<Result<MiniPcInfo>>
    git(host: HostId, projectsDir: string): Promise<Result<GitState[]>>
    /** `git fetch` (ändert nur Remote-Referenzen), danach der neue Stand. */
    fetch(host: HostId, path: string): Promise<Result<GitState>>
  }
  readonly runs: {
    list(): Promise<Result<InterruptedRun[]>>
    dismiss(host: HostId, sessionId: string): Promise<Result<InterruptedRun[]>>
  }
  readonly quota: {
    get(): Promise<Result<QuotaState>>
    refresh(): Promise<Result<QuotaState>>
  }
  readonly speech: {
    status(): Promise<Result<SpeechStatus>>
    /** Lädt fehlende Binärdateien und das Modell (Fortschritt über `speech:progress`). */
    install(model: SpeechModelId): Promise<Result<SpeechStatus>>
    cancelInstall(): Promise<Result<void>>
    removeModel(model: SpeechModelId): Promise<Result<SpeechStatus>>
    setModel(model: SpeechModelId): Promise<Result<SpeechStatus>>
    /** 16-kHz-Mono-WAV → erkannter deutscher Text. */
    transcribe(wav: Uint8Array): Promise<Result<string>>
  }
  readonly privacy: {
    status(): Promise<Result<PrivacyStatus>>
    unlock(pin: string): Promise<Result<PrivacyStatus>>
    lock(): Promise<Result<PrivacyStatus>>
    /** Ohne bisherige PIN: `current = null`. Setzt die PIN und entsperrt. */
    setPin(current: string | null, next: string): Promise<Result<PrivacyStatus>>
    /** Nur entsperrt, sonst PRIVACY_LOCKED. */
    list(): Promise<Result<PrivateProject[]>>
    add(input: PrivateProjectInput): Promise<Result<PrivateProject>>
    remove(id: number): Promise<Result<void>>
  }
  readonly fs: {
    list(host: HostId, path: string, showHidden: boolean): Promise<Result<FolderEntry[]>>
    home(host: HostId): Promise<Result<string>>
    /** Datei-Dialog (lokal), z. B. für ein Start-Skript; `null` = abgebrochen. */
    pickFile(): Promise<Result<string | null>>
    /** Gibt es die Datei bzw. den Ordner auf diesem Rechner? */
    exists(path: string): Promise<Result<boolean>>
  }
  readonly update: {
    state(): Promise<Result<UpdateState>>
    /** Fragt GitHub nach einem neueren Stand (danach Ereignis `update:state`). */
    check(): Promise<Result<UpdateState>>
    /** Startet Bauen und Installieren im Hintergrund; die App beendet sich danach selbst. */
    install(): Promise<Result<void>>
  }
  readonly app: {
    info(): Promise<Result<AppInfo>>
    openLog(): Promise<Result<void>>
    showInFolder(path: string): Promise<Result<void>>
  }
}

/** Ereignisse vom Main-Prozess an den Renderer. */
export interface ApiEvents {
  readonly 'terminal:data': { readonly id: string; readonly data: string }
  readonly 'terminal:exit': { readonly id: string; readonly code: number }
  readonly 'terminal:status': TerminalStatusChange
  /** Der Orchestrator hat ein Terminal geöffnet. */
  readonly 'terminal:opened': TerminalInfo
  /** Die App hat ein Terminal selbst geschlossen (z. B. nach der Aufgaben-Prüfung). */
  readonly 'terminal:closed': { readonly id: string }
  /** Die Aufgaben-Prüfung ist beendet. */
  readonly 'tasks:reviewed': TaskReviewResult
  readonly 'todos:changed': TodoState
  readonly 'usage:updated': readonly HostStatus[]
  /** Eine andere Verbindung (z. B. ein Skript) hat die Datenbank geändert. */
  readonly 'data:changed': { readonly at: number }
  readonly 'quota:updated': QuotaState
  /** Offene, am Kontingent abgebrochene Durchläufe haben sich geändert. */
  readonly 'runs:updated': readonly InterruptedRun[]
  /** Klick auf „Kontingent wieder frei“: Bereich „Offen“ zeigen. */
  readonly 'runs:show': { readonly at: number }
  readonly 'assistant:event': AssistantEvent
  readonly 'skills:progress': { readonly done: number; readonly total: number; readonly current: string }
  /** Klick auf eine Benachrichtigung: dieses Terminal zeigen. */
  readonly 'terminal:focus': { readonly id: string }
  /** Neue KI-Bilder aus Claude-Sessions (Projektpfade). */
  readonly 'speech:progress': SpeechProgress
  /** Privatmodus gesperrt/entsperrt oder Liste geändert: Daten neu laden. */
  readonly 'privacy:changed': PrivacyStatus
  readonly 'images:added': { readonly count: number; readonly projects: readonly string[] }
  readonly 'update:state': UpdateState
}

export interface AiApi extends AiApiCalls {
  /** Tastatureingaben ohne Antwort (schnell, kein Result). */
  readonly terminalInput: {
    write(id: string, data: string): void
    resize(id: string, cols: number, rows: number): void
  }
  on<E extends keyof ApiEvents>(event: E, listener: (payload: ApiEvents[E]) => void): () => void
}

type Unwrap<T> = T extends Promise<Result<infer U>> ? U : never

/** Implementierung im Main-Prozess: liefert Rohwerte, der Router verpackt sie in `Result`. */
export type ApiHandlers = {
  readonly [NS in keyof AiApiCalls]: {
    readonly [M in keyof AiApiCalls[NS]]: AiApiCalls[NS][M] extends (...args: infer A) => infer R
      ? (...args: A) => Promise<Unwrap<R>> | Unwrap<R>
      : never
  }
}

/** Kanalnamen: `<bereich>.<methode>`. Muss zu `AiApiCalls` passen (Typprüfung in main/ipc.ts). */
export const API_CHANNELS = {
  usage: ['overview', 'projects', 'projectBreakdown', 'analytics', 'sessions', 'refresh'],
  hosts: ['status'],
  favorites: ['list', 'add', 'update', 'remove', 'reorder', 'pickFolder', 'checkPath'],
  categories: ['list', 'add', 'update', 'remove', 'reorder'],
  terminal: ['open', 'list', 'snapshot', 'close', 'pasteImage', 'setViewing', 'statuses'],
  orchestrator: ['open', 'openClaudeMd'],
  todos: ['load', 'apply', 'create'],
  images: ['list', 'add', 'update', 'remove'],
  tasks: ['list', 'check', 'uncheck', 'review'],
  vault: ['list', 'read'],
  models: ['ollama', 'listCustom', 'upsertCustom', 'removeCustom'],
  settings: ['get', 'update', 'resetFingerprint'],
  setup: ['detect', 'scanProjects', 'scanVault', 'testDevice', 'finish', 'prerequisites'],
  assistant: ['send', 'stop', 'reset', 'confirm'],
  skills: ['catalog', 'summaries', 'summarize'],
  minipc: ['snapshot', 'info', 'git', 'fetch'],
  runs: ['list', 'dismiss'],
  quota: ['get', 'refresh'],
  speech: ['status', 'install', 'cancelInstall', 'removeModel', 'setModel', 'transcribe'],
  privacy: ['status', 'unlock', 'lock', 'setPin', 'list', 'add', 'remove'],
  fs: ['list', 'home', 'pickFile', 'exists'],
  update: ['state', 'check', 'install'],
  app: ['info', 'openLog', 'showInFolder']
} as const satisfies { readonly [NS in keyof AiApiCalls]: readonly (keyof AiApiCalls[NS])[] }

export const TERMINAL_WRITE_CHANNEL = 'terminal.write'
export const TERMINAL_RESIZE_CHANNEL = 'terminal.resize'
export const EVENT_CHANNEL_PREFIX = 'event:'

/** Eigenes Protokoll für Bilder: `aiimg://image/<id>` und `aiimg://vault/<dateiname>`. */
export const IMAGE_PROTOCOL = 'aiimg'
