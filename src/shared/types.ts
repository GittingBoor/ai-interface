import type { SpeechSettings } from './speech'

/** Gemeinsame Domänentypen für Main-Prozess und Renderer. */

/** `local` = dieser Rechner, sonst die ID eines Geräts aus `Settings.devices`. */
export type HostId = string

export const LOCAL_HOST: HostId = 'local'

export interface TokenCounts {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly cacheCreationTokens: number
  readonly cacheReadTokens: number
}

export interface UsageRecord extends TokenCounts {
  readonly messageId: string
  readonly sessionId: string
  readonly host: HostId
  readonly project: string
  readonly model: string
  readonly timestamp: number
}

/** Eine eigene Nachricht (Prompt) aus einer Claude-Code-Session. */
export interface PromptRecord {
  readonly uuid: string
  readonly sessionId: string
  readonly host: HostId
  readonly project: string
  readonly timestamp: number
  readonly chars: number
}

export interface SessionSummary {
  readonly sessionId: string
  readonly host: HostId
  readonly project: string
  readonly models: readonly string[]
  readonly startedAt: number
  readonly endedAt: number
  readonly activeMs: number
  readonly messages: number
  readonly totalTokens: number
  readonly costUsd: number | null
}

export interface ModelPrice {
  readonly input: number
  readonly output: number
  readonly cacheWrite: number
  readonly cacheRead: number
}

/** Preise in USD pro Million Token, Schlüssel = Modell-ID (Präfix). */
export type PriceTable = Readonly<Record<string, ModelPrice>>

export type Priority = 'high' | 'normal' | 'low'

export interface TodoItem {
  readonly id: string
  readonly line: number
  readonly text: string
  readonly done: boolean
  readonly priority: Priority
  readonly due: string | null
  readonly doneDate: string | null
  readonly section: string
  readonly notes: string
}

export type TodoChange =
  | { readonly kind: 'add'; readonly section: string; readonly text: string; readonly priority: Priority; readonly due: string | null }
  | { readonly kind: 'toggle'; readonly id: string; readonly today: string }
  | { readonly kind: 'edit'; readonly id: string; readonly text: string; readonly priority: Priority; readonly due: string | null }
  | { readonly kind: 'delete'; readonly id: string }

export interface UsageTotals {
  readonly tokens: TokenCounts
  readonly totalTokens: number
  readonly messages: number
  /** Summe der bepreisten Modelle in USD. */
  readonly costUsd: number
  /** true, wenn Token von Modellen ohne Preis enthalten sind. */
  readonly hasUnpriced: boolean
}

export interface DailyUsage {
  /** Lokales Datum JJJJ-MM-TT. */
  readonly day: string
  readonly host: HostId
  readonly totalTokens: number
  readonly costUsd: number
}

export interface ProjectUsage {
  readonly project: string
  readonly host: HostId
  readonly totalTokens: number
  readonly costUsd: number
  readonly messages: number
  readonly sessions: number
  readonly lastActive: number
}

export type BreakdownRange = 'week' | 'month' | 'all'
export type HostFilter = HostId | 'all'

export type AnalyticsRange = '7d' | '30d' | '90d' | '365d' | 'all'
export type AnalyticsSplit = 'project' | 'host' | 'model' | 'none'
export type AnalyticsResolution = 'day' | 'week' | 'month'
export type AnalyticsMetric = 'tokens' | 'cost' | 'hours' | 'prompts' | 'sessions'
export type MetricValues = Readonly<Record<AnalyticsMetric, number>>

export interface AnalyticsQuery {
  readonly range: AnalyticsRange
  readonly host: HostFilter
  readonly split: AnalyticsSplit
  readonly resolution: AnalyticsResolution
  /** Nur diese `host|pfad`-Schlüssel (Drilldown); null = alle Projekte. */
  readonly projects: readonly string[] | null
  /** Abgewählte `host|pfad`-Schlüssel; neue Projekte bleiben dadurch sichtbar. */
  readonly excludedProjects: readonly string[]
  /** Nur diese Modelle (Drilldown); null = alle. */
  readonly models: readonly string[] | null
}

export interface AnalyticsSeries {
  /** project: `host|pfad`, host: HostId, model: Modell, none: 'all' */
  readonly key: string
  readonly host: HostId | null
  readonly values: Readonly<Record<AnalyticsMetric, readonly number[]>>
  readonly totals: MetricValues
}

export interface AnalyticsHeatCell {
  /** 0 = Montag … 6 = Sonntag */
  readonly weekday: number
  readonly hour: number
  readonly tokens: number
  readonly hours: number
  readonly prompts: number
}

export interface AnalyticsResult {
  /** Beginn jeder Zeiteinheit als `JJJJ-MM-TT` (lokal). */
  readonly buckets: readonly string[]
  readonly series: readonly AnalyticsSeries[]
  readonly totals: MetricValues
  /** Gleich langer Zeitraum davor; null bei 'all' oder wenn er vor Datenbeginn liegt. */
  readonly previous: MetricValues | null
  readonly heatmap: readonly AnalyticsHeatCell[]
  readonly dataSince: number | null
  readonly hasUnpriced: boolean
}

/** Arbeitszeit und Verbrauch eines Projekts (Pfad je Host) in einem Zeitraum. */
export interface ProjectActivity {
  readonly project: string
  readonly host: HostId
  readonly activeMs: number
  readonly totalTokens: number
  readonly costUsd: number
  readonly sessions: number
}

export interface ModelUsage {
  readonly model: string
  readonly totalTokens: number
  readonly outputTokens: number
  readonly costUsd: number | null
  readonly messages: number
  readonly lastUsed: number
}

export interface HeatmapCell {
  /** 0 = Montag … 6 = Sonntag */
  readonly weekday: number
  readonly hour: number
  readonly totalTokens: number
}

/** Ein Projekt (historisch „Favorit“). `starred` = angepinnt, `categoryId` null = „Ohne Art“. */
export interface Favorite {
  readonly id: number
  readonly host: HostId
  readonly path: string
  readonly name: string
  readonly color: string
  readonly sortOrder: number
  readonly createdAt: number
  readonly categoryId: number | null
  readonly starred: boolean
  /** `emoji:…` oder `lucide:…`, siehe `shared/projectIcon.ts`. */
  readonly icon: string | null
}

export interface FavoriteInput {
  readonly host: HostId
  readonly path: string
  readonly name: string
  readonly color: string
  readonly categoryId?: number | null
  readonly starred?: boolean
  readonly icon?: string | null
}

export type FavoritePatch = Partial<Pick<Favorite, 'name' | 'color' | 'categoryId' | 'starred' | 'icon'>>

/** Projektart (z. B. Programmieren, Arbeit, Lernen, eigene). */
export interface Category {
  readonly id: number
  readonly name: string
  readonly color: string
  readonly icon: string | null
  readonly sortOrder: number
}

export interface CategoryInput {
  readonly name: string
  readonly color: string
  readonly icon: string | null
}

export type CustomModelStatus = 'aktiv' | 'training' | 'archiviert'

export interface CustomModel {
  readonly id: number
  readonly name: string
  readonly host: HostId
  readonly path: string
  readonly kind: string
  readonly note: string
  readonly status: CustomModelStatus
  readonly updatedAt: number
}

export type CustomModelInput = Omit<CustomModel, 'id' | 'updatedAt'> & { readonly id?: number }

export type ImageSource = 'manual' | 'auto' | 'user'

export interface ImageMeta {
  readonly id: number
  readonly fileName: string
  readonly title: string
  /** Projektpfad (wie `Favorite.path`), `null` = ohne Projekt. */
  readonly project: string | null
  readonly tags: readonly string[]
  readonly bytes: number
  readonly createdAt: number
  /** Host des Projekts; `null` bei älteren, von Hand hinzugefügten Bildern. */
  readonly host: HostId | null
  /** `auto` = von einer KI in einer Claude-Session erzeugt, `user` = vom Nutzer in eine Claude-Session eingefügt. */
  readonly source: ImageSource
  readonly sessionId: string | null
}

export interface ImageInput {
  readonly title: string
  readonly project: string | null
  readonly tags: readonly string[]
  readonly extension: string
}

/** SSH-Zugang zu einem Rechner. */
export interface SshSettings {
  readonly enabled: boolean
  readonly host: string
  readonly port: number
  readonly user: string
  readonly privateKeyPath: string
  /** SHA-256 des Host-Schlüssels, beim ersten Verbinden gespeichert (Trust on first use). */
  readonly hostFingerprint: string
}

/** Ein per SSH angebundenes Gerät (Server, Mini-PC, NAS, Raspberry Pi …). */
export interface DeviceSettings extends SshSettings {
  /** Feste ID (Kleinbuchstaben, Ziffern, `-`); steht in gespeicherten Projekten, Sessions, Bildern. */
  readonly id: HostId
  readonly name: string
  /** Farbe als CSS-Farbwert (z. B. `#5fb37a`). */
  readonly color: string
  /** `emoji:…` oder `lucide:…`, siehe `shared/projectIcon.ts`. */
  readonly icon: string | null
  /** Projektordner auf dem Gerät (Ordnerliste, Git-Stand); `~` = Home. */
  readonly projectsDir: string
}

/** Eine Webseite, die sich als eigene Ansicht in der App öffnet (Router, Home Assistant, Server-Panel …). */
export interface WebLinkSettings {
  /** Feste ID (Kleinbuchstaben, Ziffern, `-`); steht in der Anordnung der Seitenleiste. */
  readonly id: string
  readonly name: string
  /** Vollständige Adresse mit `http://` oder `https://`. */
  readonly url: string
  readonly color: string
  /** `emoji:…` oder `lucide:…`, siehe `shared/projectIcon.ts`. */
  readonly icon: string | null
  /** Gerät, unter dem die Verknüpfung in der Seitenleiste steht; `null` = eigenständig. */
  readonly deviceId: HostId | null
}

/** Eine Gruppe der Seitenleiste mit Einträgen (`ViewId`, `device:<id>` oder `link:<id>`). */
export interface NavGroup {
  readonly id: string
  readonly label: string
  readonly items: readonly string[]
}

export interface NavigationSettings {
  readonly groups: readonly NavGroup[]
  /** Ausgeblendete Einträge. */
  readonly hidden: readonly string[]
  /** Eingeklappte Gruppen. */
  readonly collapsed: readonly string[]
}

export type SectionWidth = 'full' | 'wide' | 'half' | 'narrow'

/** Reihenfolge, Sichtbarkeit und Breite der Abschnitte einer Seite. */
export interface SectionLayout {
  readonly order: readonly string[]
  readonly hidden: readonly string[]
  /** Abweichende Breiten; fehlt ein Abschnitt, gilt seine Standardbreite. */
  readonly widths?: Readonly<Record<string, SectionWidth>>
}

export interface Settings {
  /** Erste Einrichtung abgeschlossen. */
  readonly setupDone: boolean
  readonly devices: readonly DeviceSettings[]
  /** Webseiten als eigene Ansichten; Anmeldungen passieren in der Seite, die App speichert keine Zugangsdaten. */
  readonly links: readonly WebLinkSettings[]
  /** Leerer Pfad = kein Obsidian-Vault eingerichtet. */
  readonly vault: { readonly host: HostId; readonly path: string }
  /** Relativ zum Vault. */
  readonly todoFile: string
  /** Relativ zum Vault. */
  readonly protocolDir: string
  /** Ordner im Vault mit einer Notiz-Mappe je Projekt (z. B. `Projekte`), leer = Vault-Wurzel. */
  readonly notesDir: string
  readonly navigation: NavigationSettings
  /** Abschnitts-Anordnung je Seite (`overview`, `device`). */
  readonly layouts: Readonly<Record<string, SectionLayout>>
  readonly claudeCommand: string
  readonly launchOnStartup: boolean
  /** `manual`: Hinweis mit Knopf „Aktualisieren“; `auto`: beim Anmelden selbst bauen und installieren. */
  readonly updateMode: UpdateMode
  readonly prices: PriceTable
  readonly terminalLayout: TerminalLayoutSettings
  readonly notifications: NotificationSettings
  /** Orchestrator-Terminal im Dialog „Neues Terminal“. */
  readonly orchestrator: OrchestratorSettings
  readonly images: ImageSettings
  /** Wurzel der Projektordner (optionale Checkliste `CLAUDE.md` darin), Arbeitsordner des Assistenten. */
  readonly projectsRoot: string
  readonly speech: SpeechSettings
}

export type UpdateMode = 'manual' | 'auto'

/** `unsupported` = Dev-Modus oder nicht Windows; `installing` = App beendet sich gleich für den Installer. */
export type UpdatePhase = 'unsupported' | 'idle' | 'checking' | 'up-to-date' | 'available' | 'skipped' | 'building' | 'installing' | 'failed'

export interface UpdateState {
  readonly phase: UpdatePhase
  /** Grund bei `skipped`, Fehlermeldung bei `failed`. */
  readonly detail: string | null
  readonly checkedAt: number | null
}

export type SettingsPatch = { readonly [K in keyof Settings]?: Settings[K] }

export interface CollectStats {
  readonly host: HostId
  readonly files: number
  readonly newRecords: number
  readonly skippedLines: number
  /** Dateien, die nicht gelesen werden konnten (übersprungen). */
  readonly failedFiles: number
  readonly finishedAt: number
}

export interface HostStatus {
  readonly id: HostId
  readonly label: string
  readonly enabled: boolean
  readonly online: boolean
  readonly lastCollect: CollectStats | null
  readonly error: string | null
}

export interface ProtocolEntry {
  /** Relativ zum Vault, Trenner `/`. */
  readonly path: string
  readonly name: string
  readonly modifiedAt: number
  readonly size: number
}

/** Ein Protokollordner, gefunden über ein Projekt im Vault oder die Einstellung `protocolDir`. */
export interface ProtocolGroup {
  /** Ordner relativ zum Vault, Trenner `/`. */
  readonly id: string
  readonly label: string
  readonly favoriteId: number | null
  readonly color: string | null
  readonly icon: string | null
  readonly entries: readonly ProtocolEntry[]
}

/** Offene Aufgabe aus dem Feld „Offen:“ des neuesten Protokolls. */
export interface OpenTask {
  /** Normalisierter Text, Schlüssel fürs Abhaken. */
  readonly key: string
  readonly text: string
}

/** Von der Claude-Prüfung abgehakte Aufgabe. */
export interface ReviewedTask {
  readonly groupId: string
  readonly key: string
  readonly text: string
  readonly label: string
  readonly reason: string
}

/** Ergebnis einer Aufgaben-Prüfung; `finished` ist false, wenn das Terminal vorher geschlossen wurde. */
export interface TaskReviewResult {
  readonly checked: readonly ReviewedTask[]
  readonly summary: string | null
  readonly finished: boolean
}

export interface ProjectTasks {
  /** `ProtocolGroup.id` (Protokollordner relativ zum Vault). */
  readonly groupId: string
  readonly label: string
  readonly favoriteId: number | null
  readonly color: string | null
  readonly icon: string | null
  readonly protocolPath: string
  /** Lokaler Tagesbeginn des Protokolldatums aus dem Dateinamen. */
  readonly protocolDate: number
  readonly tasks: readonly OpenTask[]
}

export interface ProtocolDocument {
  readonly path: string
  readonly name: string
  readonly content: string
  readonly modifiedAt: number
}

export interface OllamaModel {
  readonly name: string
  readonly sizeBytes: number
  readonly modifiedAt: number
  readonly family: string
  readonly parameterSize: string
  readonly quantization: string
  readonly running: boolean
}

export interface OllamaStatus {
  readonly host: HostId
  readonly installed: boolean
  readonly models: readonly OllamaModel[]
}

export interface TodoState {
  readonly exists: boolean
  readonly host: HostId
  readonly path: string
  readonly items: readonly TodoItem[]
  readonly sections: readonly string[]
  readonly modifiedAt: number | null
}

export type LaunchMode = 'new' | 'continue' | 'resume' | 'shell'
/** Der Orchestrator startet neu oder setzt seine letzte Sitzung fort. */
export type OrchestratorLaunchMode = Extract<LaunchMode, 'new' | 'continue'>

/** Desktop-Benachrichtigungen je Ereignisart an/aus. */
export interface NotificationSettings {
  readonly permission: boolean
  readonly question: boolean
  readonly done: boolean
  /** Kontingent wieder frei und Durchläufe offen (Punkt 14). */
  readonly quotaFree: boolean
}

export interface OrchestratorSettings {
  readonly enabled: boolean
  /** Claude Code fragt, bevor der Orchestrator ein Projekt öffnet oder einem Terminal schreibt. */
  readonly confirmBeforeSend: boolean
}

export interface ImageSettings {
  /** Auch Bilder übernehmen, die die KI per `Read` nur angesehen hat. */
  readonly importReadImages: boolean
}

export type TerminalLayoutMode = 'tabs' | 'columns' | 'rows' | 'grid'

export interface TerminalLayoutSettings {
  readonly mode: TerminalLayoutMode
  /** Panel-Größen in Prozent je Gruppe (z. B. `columns`, `grid-top`): Panel-ID → Prozent. */
  readonly sizes: Readonly<Record<string, Readonly<Record<string, number>>>>
}

export interface TerminalOpenRequest {
  readonly host: HostId
  readonly path: string
  readonly mode: LaunchMode
  readonly title: string
  readonly cols: number
  readonly rows: number
  /** Für Modus resume: Claude-Session-ID. */
  readonly sessionId?: string
}

export interface TerminalInfo {
  readonly id: string
  readonly host: HostId
  readonly path: string
  readonly mode: LaunchMode
  readonly title: string
  readonly running: boolean
  readonly startedAt: number
  /** Das Orchestrator-Terminal der App. */
  readonly orchestrator?: boolean
}

/** Zustand eines Terminals aus den Claude-Hooks: arbeitet, bereit, fertig (ungesehen), Frage, Erlaubnis, beendet. */
export type TerminalStatus = 'working' | 'idle' | 'review' | 'question' | 'permission' | 'exited'

export interface TerminalStatusChange {
  readonly id: string
  readonly status: TerminalStatus
}

export interface UsageOverview {
  readonly today: UsageTotals
  readonly week: UsageTotals
  readonly month: UsageTotals
  /** Letzte 30 Tage, je Tag und Host. */
  readonly daily: readonly DailyUsage[]
  /** Letzte 12 Wochen. */
  readonly heatmap: readonly HeatmapCell[]
  readonly models: readonly ModelUsage[]
  readonly projects: readonly ProjectUsage[]
  readonly recentSessions: readonly SessionSummary[]
  /** Sessions mit Aktivität in den letzten 15 Minuten. */
  readonly activeSessions: number
}

export interface FolderEntry {
  readonly name: string
  readonly path: string
  readonly isDirectory: boolean
  readonly hidden: boolean
}

export type QuotaWindowKind = 'five_hour' | 'seven_day' | 'seven_day_opus' | 'seven_day_sonnet'

/** Ein Kontingent-Fenster des Claude-Abos (Prozent verbraucht, Zeitpunkt des Zurücksetzens). */
export interface QuotaWindow {
  readonly kind: QuotaWindowKind
  readonly percent: number
  readonly resetsAt: number | null
}

export type QuotaState =
  | { readonly status: 'loading' }
  | { readonly status: 'ok'; readonly windows: readonly QuotaWindow[]; readonly fetchedAt: number }
  | { readonly status: 'expired' | 'unavailable'; readonly reason: string; readonly hint: string; readonly fetchedAt: number }

/** Ein Claude-Durchlauf, der am vollen Kontingent abgebrochen und noch nicht fortgesetzt wurde. */
export interface InterruptedRun {
  readonly host: HostId
  readonly sessionId: string
  /** Arbeitsordner der Session (`cwd`). */
  readonly project: string
  readonly hitAt: number
  readonly message: string
  readonly lastPrompt: string | null
}

/** Git-Stand eines Projektordners auf einem Gerät. */
export interface GitState {
  readonly path: string
  readonly name: string
  readonly branch: string | null
  readonly upstream: string | null
  readonly ahead: number
  readonly behind: number
  readonly staged: number
  readonly unstaged: number
  readonly untracked: number
  readonly error: string | null
}

export interface DiskUsage {
  readonly mount: string
  readonly total: number
  readonly used: number
}

export interface SystemStats {
  readonly cpuPercent: number
  readonly memTotal: number
  readonly memUsed: number
  readonly disks: readonly DiskUsage[]
  readonly uptimeSec: number
  readonly load: readonly [number, number, number]
  readonly cores: number
  /** Auslastung je logischem Kern in Prozent. */
  readonly corePercents: readonly number[]
  /** Aktueller Takt je logischem Kern in MHz. */
  readonly coreMhz: readonly number[]
  readonly governor: string | null
  /** Wie oft die CPU seit dem Start wegen Hitze gedrosselt wurde. */
  readonly throttleCount: number | null
  readonly memCached: number
  readonly swapTotal: number
  readonly swapUsed: number
  readonly temps: readonly TempReading[]
  readonly fans: readonly FanReading[]
  readonly cooling: readonly CoolingDevice[]
  /** WLAN-Signalqualität in Prozent, `null` ohne WLAN. */
  readonly wifiPercent: number | null
  readonly net: readonly NetRate[]
  readonly diskIo: readonly DiskIoRate[]
  readonly processes: readonly TopProcess[]
  readonly processCount: number
  /** Leistungsaufnahme der CPU (RAPL), `null` ohne Leserecht oder vor der zweiten Messung. */
  readonly powerWatts: number | null
}

/** Ein Temperaturfühler aus `/sys/class/hwmon`. */
export interface TempReading {
  readonly chip: string
  readonly label: string
  readonly celsius: number
  readonly critCelsius: number | null
}

export interface FanReading {
  readonly chip: string
  readonly label: string
  readonly rpm: number
}

/** Kühlstufe aus `/sys/class/thermal` (z. B. ACPI-Lüfter: 0 = aus, 1 = an). */
export interface CoolingDevice {
  readonly type: string
  readonly state: number
  readonly maxState: number
}

/** Durchsatz einer Netzwerkschnittstelle; Raten in Bytes/s, `null` vor der zweiten Messung. */
export interface NetRate {
  readonly name: string
  readonly rxBytes: number
  readonly txBytes: number
  readonly rxRate: number | null
  readonly txRate: number | null
}

/** Durchsatz eines Datenträgers in Bytes/s, `null` vor der zweiten Messung. */
export interface DiskIoRate {
  readonly name: string
  readonly readRate: number | null
  readonly writeRate: number | null
}

export interface TopProcess {
  readonly pid: number
  /** CPU-Anteil über die Laufzeit des Prozesses (wie `ps`), 100 = ein Kern. */
  readonly cpuPercent: number
  readonly memBytes: number
  readonly command: string
}

export interface DriveInfo {
  readonly name: string
  readonly sizeBytes: number
  readonly model: string
}

export interface NetAddress {
  readonly name: string
  readonly state: string
  readonly addresses: readonly string[]
}

export interface DockerContainer {
  readonly name: string
  readonly image: string
  /** `running`, `exited`, `restarting`, … */
  readonly state: string
  /** Text von Docker, z. B. „Up 12 hours (healthy)“. */
  readonly status: string
  readonly cpuPercent: number | null
  readonly memBytes: number | null
  readonly memLimitBytes: number | null
}

/** Selten wechselnde Angaben zu einem Gerät und seine Docker-Container (teurer, daher seltener abgefragt). */
export interface MiniPcInfo {
  readonly vendor: string
  readonly model: string
  readonly bios: string
  readonly os: string
  readonly kernel: string
  readonly hostname: string
  readonly cpuModel: string
  readonly cpuMaxMhz: number | null
  readonly drives: readonly DriveInfo[]
  readonly addresses: readonly NetAddress[]
  readonly updates: number
  readonly rebootRequired: boolean
  readonly failedUnits: readonly string[]
  readonly users: number
  /** `null`, wenn Docker nicht installiert oder nicht lesbar ist. */
  readonly docker: readonly DockerContainer[] | null
  readonly fetchedAt: number
}

/** Eine laufende Claude-Code-Sitzung (aus ~/.claude/sessions). */
export interface ClaudeProcess {
  readonly pid: number
  readonly cwd: string | null
  readonly status: string | null
  readonly startedAt: number | null
  readonly name: string | null
}

export interface MiniPcSnapshot {
  readonly online: boolean
  readonly error: string | null
  readonly system: SystemStats | null
  readonly claude: readonly ClaudeProcess[]
  readonly fetchedAt: number
}

export type SkillKind = 'skill' | 'agent' | 'command'
export type SkillAi = 'claude' | 'codex'
/** Herkunft: eigene (~/.claude), per claude.ai synchronisiert, Plugin, Projektordner, deaktiviert. */
export type SkillScope = 'user' | 'synced' | 'plugin' | 'project' | 'disabled'

export interface SkillEntry {
  /** `<host>:<pfad>` */
  readonly id: string
  readonly kind: SkillKind
  readonly name: string
  readonly description: string
  readonly path: string
  readonly host: HostId
  readonly ai: SkillAi
  readonly scope: SkillScope
  readonly plugin: string | null
  /** Projektname bei projektbezogenen Einträgen. */
  readonly project: string | null
  readonly tools: readonly string[]
  readonly model: string | null
  readonly skills: readonly string[]
  /** SHA-256 des Dateiinhalts (Schlüssel für KI-Zusammenfassungen). */
  readonly hash: string
  readonly bodyExcerpt: string
}

export type SkillRelationKind = 'contains' | 'uses-tool' | 'uses-skill' | 'mentions'

/** Kante zwischen Einträgen; Plugins als `plugin:<name>`, Tools als `tool:<Name>`. */
export interface SkillRelation {
  readonly from: string
  readonly to: string
  readonly kind: SkillRelationKind
}

export interface SkillCatalogResult {
  readonly host: HostId
  readonly entries: readonly SkillEntry[]
  readonly relations: readonly SkillRelation[]
  readonly errors: readonly string[]
}

/** Ereignisse des KI-Assistenten an das Panel. */
export type AssistantEvent =
  | { readonly type: 'text'; readonly turnId: string; readonly text: string }
  | { readonly type: 'tool'; readonly turnId: string; readonly name: string; readonly summary: string }
  | { readonly type: 'confirm'; readonly requestId: string; readonly tool: string; readonly preview: string }
  | { readonly type: 'confirm-resolved'; readonly requestId: string; readonly allowed: boolean }
  | { readonly type: 'done'; readonly turnId: string }
  | { readonly type: 'error'; readonly message: string; readonly hint: string }

export interface AppInfo {
  readonly version: string
  readonly platform: 'win32' | 'linux' | 'darwin' | string
  readonly dataDir: string
  readonly logFile: string
  readonly packaged: boolean
}

/** Ein Ordner, den die Einrichtung als mögliches Projekt gefunden hat. */
export interface DetectedProject {
  readonly path: string
  readonly name: string
  readonly isGit: boolean
  readonly hasClaudeMd: boolean
}

/** Vorschlag für die Einrichtung, z. B. von Claude anhand von `docs/CLAUDE-TEMPLATE.md` geschrieben. */
export interface SetupProposal {
  readonly projectsRoot?: string
  readonly vault?: { readonly path: string; readonly todoFile?: string; readonly protocolDir?: string; readonly notesDir?: string } | null
  readonly devices?: readonly {
    readonly id?: string
    readonly name: string
    readonly host: string
    readonly user: string
    readonly port?: number
    readonly privateKeyPath?: string
    readonly projectsDir?: string
    readonly color?: string
    readonly icon?: string | null
  }[]
  readonly categories?: readonly { readonly name: string; readonly color?: string; readonly icon?: string | null }[]
  readonly projects?: readonly {
    readonly path: string
    readonly name?: string
    /** `local` oder ID/Name eines Geräts aus `devices`. */
    readonly device?: string
    readonly category?: string
    readonly color?: string
    readonly icon?: string | null
    readonly starred?: boolean
  }[]
}

/** Was die Einrichtung auf diesem Rechner vorfindet. */
export interface SetupDetection {
  readonly platform: string
  readonly homeDir: string
  /** Datei, in der ein Vorschlag gesucht wurde. */
  readonly proposalPath: string
  readonly proposal: SetupProposal | null
  /** Fehler beim Lesen des Vorschlags (Datei vorhanden, aber ungültig). */
  readonly proposalError: string | null
  readonly projectRootCandidates: readonly string[]
  readonly vaultCandidates: readonly string[]
  readonly sshKeyCandidates: readonly string[]
  /** Bisherige Einstellungen vorhanden (Update einer älteren Version). */
  readonly existingInstall: boolean
}

export interface VaultScan {
  readonly todoFiles: readonly string[]
  readonly protocolDirs: readonly string[]
  readonly topDirs: readonly string[]
}

export interface SetupProjectInput {
  readonly host: HostId
  readonly path: string
  readonly name: string
  readonly category: string | null
  readonly color: string
  readonly icon: string | null
  readonly starred: boolean
}

export interface SetupInput {
  readonly projectsRoot: string
  readonly vault: { readonly path: string; readonly todoFile: string; readonly protocolDir: string; readonly notesDir: string }
  readonly devices: readonly DeviceSettings[]
  readonly categories: readonly CategoryInput[]
  readonly projects: readonly SetupProjectInput[]
  readonly launchOnStartup: boolean
}

export interface DeviceTestResult {
  readonly ok: boolean
  readonly message: string
}

export type PrerequisiteId = 'claude' | 'login' | 'gitBash'

/** Voraussetzung auf diesem PC, geprüft im Einrichtungsassistenten. */
export interface PrerequisiteStatus {
  readonly id: PrerequisiteId
  readonly label: string
  readonly ok: boolean
  /** Fundort, wenn erfüllt; sonst, was ohne sie nicht geht. */
  readonly detail: string
  /** `false` = ohne sie fehlen nur einzelne Funktionen. */
  readonly required: boolean
  /** Befehl, der das Fehlende behebt (zum Kopieren). */
  readonly fixCommand: string | null
  readonly helpUrl: string | null
}

