/**
 * Realistische Beispieldaten für den Browser-Modus (`npm run dev:web`).
 * Alles wird relativ zu „jetzt“ erzeugt und ist durch einen festen Seed stabil.
 */
import { DEFAULT_NAVIGATION } from '@shared/layout'
import type { KnowledgeProject, KnowledgeStats, MonthActivity, ProjectKnowledge } from '@shared/knowledge'
import type {
  Category,
  CustomModel,
  DailyUsage,
  Favorite,
  HeatmapCell,
  HostId,
  ImageMeta,
  ModelPrice,
  ModelUsage,
  OllamaStatus,
  PriceTable,
  ProjectTasks,
  ProjectUsage,
  SessionSummary,
  Settings,
  TodoItem,
  UsageTotals,
  Source
} from '@shared/types'
import { todayIso } from '@renderer/lib/format'

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000
const MINUTE_MS = 60_000
const DAYS = 30
const SEED = 20260926

export class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed
  }

  next(): number {
    this.state = (this.state * 1_664_525 + 1_013_904_223) % 4_294_967_296
    return this.state / 4_294_967_296
  }

  between(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(this.next() * items.length)]
    if (item === undefined) throw new Error('pick() auf leerer Liste')
    return item
  }
}

const rng = new SeededRandom(SEED)

const price = (input: number, output: number, cacheRead = input * 0.1): ModelPrice => ({
  input,
  output,
  cacheWrite: input * 1.25,
  cacheRead
})

export const MOCK_PRICES: PriceTable = {
  'claude-opus-5-5': price(4, 20, 0.2),
  'claude-opus-5': price(5, 25),
  'claude-sonnet-5': price(2, 10),
  'claude-sonnet-4-6': price(3, 15),
  'claude-haiku-4-5': price(1, 5)
}

export const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: 'Programmieren', color: '#e08a4f', icon: 'lucide:code', sortOrder: 0 },
  { id: 2, name: 'Smarthome', color: '#5fb3a8', icon: 'lucide:house', sortOrder: 1 },
  { id: 3, name: 'Uni', color: '#6f9bd8', icon: 'lucide:graduation-cap', sortOrder: 2 }
]

export const MOCK_FAVORITES: Favorite[] = [
  { id: 1, host: 'local', path: 'C:\\Users\\Alex\\projects\\ai-interface', name: 'AI Interface', color: '#e08a4f', sortOrder: 0, createdAt: Date.now() - 20 * DAY_MS, categoryId: 1, starred: true, icon: 'lucide:terminal' },
  { id: 2, host: 'mini-pc', path: '/home/alex/projects/Playlist_Builder_v2', name: 'Music Recommender', color: '#8fb573', sortOrder: 1, createdAt: Date.now() - 60 * DAY_MS, categoryId: 3, starred: true, icon: 'emoji:🎵' },
  { id: 3, host: 'mini-pc', path: '/home/alex/projects/wetter-dashboard', name: 'Wetter-Dashboard', color: '#6f9bd8', sortOrder: 2, createdAt: Date.now() - 90 * DAY_MS, categoryId: 1, starred: false, icon: 'lucide:map-pin' },
  { id: 4, host: 'mini-pc', path: '/opt/smarthome', name: 'Smarthome', color: '#5fb3a8', sortOrder: 3, createdAt: Date.now() - 120 * DAY_MS, categoryId: 2, starred: true, icon: 'lucide:house' },
  { id: 5, host: 'local', path: 'C:\\Users\\Alex\\OneDrive\\Obsidian Vault', name: 'Obsidian-Vault', color: '#9b8ad8', sortOrder: 4, createdAt: Date.now() - 12 * DAY_MS, categoryId: null, starred: false, icon: null }
]

const AI = 'C:\\Users\\Alex\\projects\\ai-interface'
const MUSIC = '/home/alex/projects/Playlist_Builder_v2'

/** Beispiel-Quellen: eigene und von der KI, ein Bündel (Wikipedia), Allgemein ohne Projekt. */
export const MOCK_SOURCES: Source[] = [
  { id: 1, url: 'https://music.example.org', title: 'Music Recommender (live)', note: 'Eigene Seite des Projekts', host: 'mini-pc', project: MUSIC, origin: 'user', starred: true, sessionId: null, createdAt: Date.now() - 2 * DAY_MS },
  { id: 2, url: 'https://developer.spotify.com/documentation/web-api', title: 'Spotify Web API', note: 'Endpunkte für Empfehlungen und Audio-Features', host: 'mini-pc', project: MUSIC, origin: 'user', starred: false, sessionId: null, createdAt: Date.now() - 5 * DAY_MS },
  { id: 3, url: 'https://de.wikipedia.org/wiki/Kosinus-%C3%84hnlichkeit', title: 'Kosinus-Ähnlichkeit · de.wikipedia.org', note: 'Wie berechnet man die Kosinus-Ähnlichkeit zweier Vektoren?', host: 'mini-pc', project: MUSIC, origin: 'ai', starred: false, sessionId: 's1', createdAt: Date.now() - 1 * DAY_MS },
  { id: 4, url: 'https://de.wikipedia.org/wiki/Mel-Frequenz-Cepstrum', title: 'Mel Frequenz Cepstrum · de.wikipedia.org', note: 'Was sind MFCCs und wofür nutzt man sie bei Audio?', host: 'mini-pc', project: MUSIC, origin: 'ai', starred: false, sessionId: 's1', createdAt: Date.now() - 1 * DAY_MS },
  { id: 5, url: 'https://de.wikipedia.org/wiki/Collaborative_Filtering', title: 'Collaborative Filtering · de.wikipedia.org', note: 'Grundidee von Collaborative Filtering', host: 'mini-pc', project: MUSIC, origin: 'ai', starred: false, sessionId: 's2', createdAt: Date.now() - 3 * DAY_MS },
  { id: 6, url: 'https://librosa.org/doc/latest/feature.html', title: 'feature.html · librosa.org', note: 'Which librosa feature functions exist for spectral analysis?', host: 'mini-pc', project: MUSIC, origin: 'ai', starred: false, sessionId: 's2', createdAt: Date.now() - 3 * DAY_MS },
  { id: 7, url: 'https://www.electronjs.org/docs/latest/api/webview-tag', title: 'webview tag · electronjs.org', note: 'Welche Attribute und Ereignisse hat das webview-Tag?', host: 'local', project: AI, origin: 'ai', starred: false, sessionId: 's3', createdAt: Date.now() - 4 * 3_600_000 },
  { id: 8, url: 'https://tailwindcss.com/docs/theme', title: 'Tailwind Theme', note: 'Eigene Farben als Theme-Variablen', host: 'local', project: AI, origin: 'user', starred: true, sessionId: null, createdAt: Date.now() - 8 * DAY_MS },
  { id: 9, url: 'https://news.ycombinator.com', title: 'Hacker News', note: '', host: null, project: null, origin: 'user', starred: true, sessionId: null, createdAt: Date.now() - 30 * DAY_MS },
  { id: 10, url: 'https://www.zigbee2mqtt.io/supported-devices', title: 'supported devices · zigbee2mqtt.io', note: 'Wird der SONOFF Dongle Max unterstützt?', host: null, project: null, origin: 'ai', starred: false, sessionId: 's4', createdAt: Date.now() - 6 * DAY_MS }
]

interface ProjectSeed {
  readonly host: HostId
  readonly path: string
  /** Anteil am Gesamtverbrauch des Hosts. */
  readonly weight: number
}

export const PROJECT_SEEDS: readonly ProjectSeed[] = [
  { host: 'local', path: 'C:\\Users\\Alex\\projects\\ai-interface', weight: 0.46 },
  { host: 'local', path: 'C:\\Users\\Alex\\projects\\ai-interface\\src\\renderer', weight: 0.12 },
  { host: 'local', path: 'C:\\Users\\Alex\\OneDrive\\Obsidian Vault', weight: 0.14 },
  { host: 'local', path: 'C:\\Users\\Alex\\projects\\notizen-2026', weight: 0.16 },
  { host: 'local', path: 'C:\\Users\\Alex\\projects\\ha-dashboard-cards', weight: 0.12 },
  { host: 'mini-pc', path: '/home/alex/projects/Playlist_Builder_v2', weight: 0.44 },
  { host: 'mini-pc', path: '/home/alex/projects/wetter-dashboard', weight: 0.22 },
  { host: 'mini-pc', path: '/opt/smarthome', weight: 0.2 },
  { host: 'mini-pc', path: '/home/alex/projects', weight: 0.14 }
]

const MODELS = ['claude-opus-5-5', 'claude-sonnet-5', 'claude-haiku-4-5'] as const
/** Durchschnittlicher Preis je Mio. Token inkl. Cache-Lesezugriffen. */
const AVG_USD_PER_MTOK: Readonly<Record<string, number>> = { 'claude-opus-5-5': 0.72, 'claude-sonnet-5': 0.38, 'claude-haiku-4-5': 0.19 }
const MODEL_SHARE: Readonly<Record<string, number>> = { 'claude-opus-5-5': 0.71, 'claude-sonnet-5': 0.21, 'claude-haiku-4-5': 0.075 }
const UNPRICED_MODEL = '<synthetic>'
const UNPRICED_SHARE = 0.005
const BLENDED_USD_PER_MTOK = MODELS.reduce((sum, m) => sum + (MODEL_SHARE[m] ?? 0) * (AVG_USD_PER_MTOK[m] ?? 0), 0)

function dayString(offset: number): string {
  return todayIso(new Date(Date.now() - offset * DAY_MS))
}

function buildDaily(): DailyUsage[] {
  const rows: DailyUsage[] = []
  for (let offset = DAYS - 1; offset >= 0; offset--) {
    const date = new Date(Date.now() - offset * DAY_MS)
    const weekend = date.getDay() === 0 || date.getDay() === 6
    const trend = 0.75 + (DAYS - offset) / DAYS / 2
    const localBase = weekend ? rng.between(1.5, 9) : rng.between(8, 26)
    const miniBase = weekend ? rng.between(3, 14) : rng.between(2, 11)
    const quietDay = rng.next() < 0.08 && offset > 0
    for (const [host, base] of [['local', localBase], ['mini-pc', miniBase]] as const) {
      const tokens = quietDay ? 0 : Math.round(base * trend * 1_000_000)
      rows.push({ day: dayString(offset), host, totalTokens: tokens, costUsd: (tokens / 1_000_000) * BLENDED_USD_PER_MTOK })
    }
  }
  return rows
}

function buildHeatmap(): HeatmapCell[] {
  const cells: HeatmapCell[] = []
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = 0; hour < 24; hour++) {
      const weekend = weekday >= 5
      const work = hour >= 9 && hour <= 12 ? 1 : hour >= 14 && hour <= 18 ? 0.85 : 0
      const evening = hour >= 19 && hour <= 23 ? (weekend ? 0.9 : 0.65) : 0
      const late = hour <= 1 ? 0.25 : 0
      const base = weekend ? work * 0.3 + evening + late : work + evening * 0.8 + late
      const noise = rng.between(0.55, 1.2)
      const value = base * noise
      cells.push({ weekday, hour, totalTokens: value < 0.08 ? 0 : Math.round(value * 4_200_000) })
    }
  }
  return cells
}

export const MOCK_DAILY = buildDaily()
export const MOCK_HEATMAP = buildHeatmap()

function sumDays(days: number, host?: HostId): { tokens: number; cost: number } {
  const since = dayString(days - 1)
  const rows = MOCK_DAILY.filter((d) => d.day >= since && (host === undefined || d.host === host))
  return { tokens: rows.reduce((s, r) => s + r.totalTokens, 0), cost: rows.reduce((s, r) => s + r.costUsd, 0) }
}

export function totalsFor(days: number): UsageTotals {
  const { tokens, cost } = sumDays(days)
  const cacheRead = Math.round(tokens * 0.86)
  const cacheWrite = Math.round(tokens * 0.09)
  const output = Math.round(tokens * 0.035)
  return {
    tokens: { inputTokens: tokens - cacheRead - cacheWrite - output, outputTokens: output, cacheCreationTokens: cacheWrite, cacheReadTokens: cacheRead },
    totalTokens: tokens,
    messages: Math.round(tokens / 62_000),
    costUsd: cost,
    hasUnpriced: days > 1
  }
}

export function projectsFor(days: number): ProjectUsage[] {
  const r = new SeededRandom(SEED + days)
  return PROJECT_SEEDS.map((seed, i) => {
    const { tokens, cost } = sumDays(days, seed.host)
    const share = seed.weight * r.between(0.85, 1.1)
    const total = Math.round(tokens * share)
    return {
      project: seed.path,
      host: seed.host,
      totalTokens: total,
      costUsd: cost * share,
      messages: Math.round(total / 60_000),
      sessions: Math.max(1, Math.round((total / 9_000_000) * days ** 0.2)),
      lastActive: Date.now() - (i * 5 + r.between(3, 50)) * HOUR_MS * (i % 3 === 0 ? 0.08 : 1)
    }
  })
    .filter((p) => p.totalTokens > 0)
    .sort((a, b) => b.totalTokens - a.totalTokens)
}

export function modelUsage(): ModelUsage[] {
  const { tokens } = sumDays(DAYS)
  const rows: ModelUsage[] = MODELS.map((model, i) => {
    const total = Math.round(tokens * (MODEL_SHARE[model] ?? 0))
    return {
      model,
      totalTokens: total,
      outputTokens: Math.round(total * 0.035),
      costUsd: (total / 1_000_000) * (AVG_USD_PER_MTOK[model] ?? 0),
      messages: Math.round(total / 62_000),
      lastUsed: Date.now() - (i + 1) * 23 * MINUTE_MS * (i + 1)
    }
  })
  const unpriced = Math.round(tokens * UNPRICED_SHARE)
  rows.push({ model: UNPRICED_MODEL, totalTokens: unpriced, outputTokens: 0, costUsd: null, messages: 41, lastUsed: Date.now() - 2 * DAY_MS })
  return rows
}

function buildSessions(): SessionSummary[] {
  const sessions: SessionSummary[] = []
  let cursor = Date.now() - 4 * MINUTE_MS
  for (let i = 0; i < 48; i++) {
    const seed = rng.pick(PROJECT_SEEDS.filter((p) => p.weight > 0.11))
    const duration = rng.between(8, 190) * MINUTE_MS
    const endedAt = cursor
    const startedAt = endedAt - duration
    const tokens = Math.round(rng.between(0.6, 14) * 1_000_000)
    const model = rng.next() < 0.72 ? 'claude-opus-5-5' : rng.next() < 0.7 ? 'claude-sonnet-5' : 'claude-haiku-4-5'
    const models = rng.next() < 0.25 ? [model, 'claude-haiku-4-5'] : [model]
    sessions.push({
      sessionId: `${(0x1000_0000 + i * 7_919_133).toString(16)}-${i.toString(16).padStart(4, '0')}-4b1e-9c2d-${(i * 97_531).toString(16).padStart(12, '0')}`,
      host: seed.host,
      project: seed.path,
      models,
      startedAt,
      endedAt,
      activeMs: duration * rng.between(0.45, 0.9),
      messages: Math.round(tokens / 70_000),
      totalTokens: tokens,
      costUsd: i === 5 ? null : (tokens / 1_000_000) * (AVG_USD_PER_MTOK[model] ?? 0.5)
    })
    cursor = startedAt - rng.between(0.3, 14) * HOUR_MS
  }
  return sessions
}

export const MOCK_SESSIONS = buildSessions()

export const MOCK_OLLAMA: OllamaStatus[] = [
  {
    host: 'local',
    installed: true,
    models: [
      { name: 'qwen3-coder:30b', sizeBytes: 18_556_000_000, modifiedAt: Date.now() - 9 * DAY_MS, family: 'qwen3moe', parameterSize: '30.5B', quantization: 'Q4_K_M', running: true },
      { name: 'gemma3:12b', sizeBytes: 8_149_000_000, modifiedAt: Date.now() - 31 * DAY_MS, family: 'gemma3', parameterSize: '12.2B', quantization: 'Q4_K_M', running: false },
      { name: 'llama3.2-vision:11b', sizeBytes: 7_816_000_000, modifiedAt: Date.now() - 64 * DAY_MS, family: 'mllama', parameterSize: '10.7B', quantization: 'Q4_K_M', running: false },
      { name: 'nomic-embed-text:latest', sizeBytes: 274_302_450, modifiedAt: Date.now() - 88 * DAY_MS, family: 'nomic-bert', parameterSize: '137M', quantization: 'F16', running: false }
    ]
  },
  { host: 'mini-pc', installed: false, models: [] }
]

export const MOCK_CUSTOM_MODELS: CustomModel[] = [
  { id: 1, name: 'music-taste-encoder', host: 'mini-pc', path: '/srv/music-recommender/models/encoder-v3', kind: 'Embedding · PyTorch', note: 'Empfehlungen für music.gittingboor.de, 256 Dimensionen', status: 'aktiv', updatedAt: Date.now() - 6 * DAY_MS },
  { id: 2, name: 'wetter-intent', host: 'local', path: 'C:\\Users\\Alex\\models\\wetter-intent', kind: 'Klassifikator · ONNX', note: 'Fragen am Wetter in 14 Kategorien einordnen', status: 'training', updatedAt: Date.now() - 3 * HOUR_MS },
  { id: 3, name: 'zigbee-anomalie-v1', host: 'mini-pc', path: '/opt/smarthome/ml/anomaly-v1', kind: 'Isolation Forest · scikit-learn', note: 'Ersetzt durch Regeln in Home Assistant', status: 'archiviert', updatedAt: Date.now() - 140 * DAY_MS }
]

const todo = (section: string, text: string, extra: Partial<TodoItem> = {}): TodoItem => ({
  id: Math.floor(rng.next() * 0xffffffff).toString(16).padStart(8, '0'),
  line: 0,
  text,
  done: false,
  priority: 'normal',
  due: null,
  doneDate: null,
  section,
  notes: '',
  ...extra
})

export function buildTodos(): TodoItem[] {
  return [
    todo('AI Interface', 'Windows-Installer mit Autostart testen', { priority: 'high', due: dayString(0) }),
    todo('AI Interface', 'Preistabelle mit aktuellen Listenpreisen abgleichen', { due: dayString(-3) }),
    todo('AI Interface', 'Galerie: Bilder per Strg+V einfügen', { done: true, doneDate: dayString(1) }),
    todo('AI Interface', 'SSH-Fingerabdruck beim ersten Verbinden anzeigen', { priority: 'low' }),
    todo('Music Recommender', 'Encoder v3 gegen v2 evaluieren (Recall@20)', { priority: 'high', due: dayString(2), notes: 'Testset: letzte 90 Tage Hörverlauf' }),
    todo('Music Recommender', 'Cloudflare-Tunnel-Logs rotieren'),
    todo('Music Recommender', 'Spotify-Import auf Rate-Limits prüfen', { done: true, doneDate: dayString(4) }),
    todo('Smarthome', 'Backup von zigbee2mqtt/data nach OneDrive', { priority: 'high', due: dayString(3) }),
    todo('Smarthome', 'Mosquitto auf 2.1 aktualisieren (vorher Backup)', { due: dayString(-9) }),
    todo('Smarthome', 'Heizungsautomation Winterprofil anlegen', { priority: 'low', due: dayString(-20) }),
    todo('Wetter-Dashboard', 'Neue Wetterquelle einbinden'),
    todo('Wetter-Dashboard', 'Deploy-Key auf upload/switch beschränken', { done: true, doneDate: dayString(6) }),
    todo('Server', 'Debian-Updates auf dem Mini-PC einspielen', { due: dayString(1) }),
    todo('Server', 'Protokoll-Vorlage um Abschnitt „Offen“ ergänzen', { priority: 'low', done: true, doneDate: dayString(2) })
  ]
}

export const MOCK_SETTINGS: Settings = {
  // Vorschau: `?setup` in der Adresse zeigt die erste Einrichtung.
  setupDone: !new URLSearchParams(globalThis.location?.search ?? '').has('setup'),
  devices: [
    {
      id: 'mini-pc',
      name: 'Mini-PC',
      color: '#5fb37a',
      icon: 'lucide:server',
      projectsDir: '~/projects',
      enabled: true,
      host: '192.168.1.20',
      port: 22,
      user: 'alex',
      privateKeyPath: 'C:\\Users\\Alex\\.ssh\\id_ed25519',
      hostFingerprint: 'SHA256:q8Vd3kR0mZ1xT7cN5bHfW2yLpA9sE4uJ6oGiKvQ0rXc'
    }
  ],
  links: [{ id: 'smart-home', name: 'Smart Home', url: 'http://192.168.1.20:8123', color: '#5fb3c8', icon: 'lucide:house', deviceId: 'mini-pc' }],
  vault: { host: 'local', path: 'C:\\Users\\Alex\\OneDrive\\Obsidian Vault' },
  todoFile: 'Programmieren/Server/TODO.md',
  protocolDir: 'Programmieren/Server/homeserver/Protokoll',
  notesDir: 'Programmieren',
  navigation: DEFAULT_NAVIGATION,
  layouts: {},
  claudeCommand: 'claude',
  launchOnStartup: true,
  updateMode: 'manual',
  prices: MOCK_PRICES,
  terminalLayout: { mode: 'tabs', sizes: {} },
  notifications: { permission: true, question: true, done: true, quotaFree: true },
  orchestrator: { enabled: true, confirmBeforeSend: true },
  images: { importReadImages: false },
  sources: { openIn: 'app', hintSeen: false },
  projectsRoot: 'D:\\GitHub',
  speech: { model: 'large-v3-turbo-q5_0', deviceId: '', hotkeyEnabled: false },
  // IDs der Beispielprojekte in MOCK_KNOWLEDGE_PROJECTS.
  knowledge: { projects: [101, 102, 103] },
  language: 'system'
}

const SMARTHOME_PROTOCOLS = 'Programmieren/Server/homeserver/Protokoll'
const CLOUD_PROTOCOLS = 'Programmieren/Server/Cloud/Protokoll'
const WEATHER_PROTOCOLS = 'Programmieren/Wetter-Dashboard/Protokoll'

/** Beispielgruppen in der Reihenfolge der Projekte. */
export const MOCK_PROTOCOL_GROUPS: readonly { id: string; label: string; favoriteId: number | null; color: string | null; icon: string | null }[] = [
  { id: SMARTHOME_PROTOCOLS, label: 'Server · homeserver', favoriteId: 2, color: '#a39e96', icon: 'lucide:server' },
  { id: CLOUD_PROTOCOLS, label: 'Server · Cloud', favoriteId: 2, color: '#a39e96', icon: 'lucide:server' },
  { id: WEATHER_PROTOCOLS, label: 'Wetter-Dashboard', favoriteId: 3, color: '#6f9bd8', icon: 'lucide:cloud-sun' }
]

const DAY_START = (offset: number): number => {
  const d = new Date(Date.now() - offset * DAY_MS)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Offene Aufgaben je Projekt, wie sie aus dem Feld „Offen:“ der Protokolle kommen. */
export const MOCK_PROJECT_TASKS: readonly ProjectTasks[] = [
  {
    groupId: 'Programmieren/AI Interface/Protokoll',
    label: 'AI Interface',
    favoriteId: 1,
    color: '#e08a4f',
    icon: null,
    protocolPath: `Programmieren/AI Interface/Protokoll/${dayString(0)}.md`,
    protocolDate: DAY_START(0),
    tasks: [
      { key: 'startseite in der echten app prüfen', text: 'Startseite in der echten App prüfen' },
      { key: 'prompts nach dem ersten abruf kontrollieren', text: 'Prompts nach dem ersten Abruf kontrollieren' },
      { key: 'release bauen und installieren', text: 'Release bauen und installieren' }
    ]
  },
  {
    groupId: SMARTHOME_PROTOCOLS,
    label: 'Server · homeserver',
    favoriteId: 2,
    color: '#a39e96',
    icon: 'lucide:server',
    protocolPath: `${SMARTHOME_PROTOCOLS}/${dayString(2)}.md`,
    protocolDate: DAY_START(2),
    tasks: [{ key: 'backup-skript nach dem neustart testen', text: 'Backup-Skript nach dem Neustart testen' }]
  },
  {
    groupId: WEATHER_PROTOCOLS,
    label: 'Wetter-Dashboard',
    favoriteId: 3,
    color: '#6f9bd8',
    icon: 'lucide:cloud-sun',
    protocolPath: `${WEATHER_PROTOCOLS}/${dayString(7)}.md`,
    protocolDate: DAY_START(7),
    tasks: [
      { key: 'regenradar als karte einbauen', text: 'Regenradar als Karte einbauen' },
      { key: 'api-aufrufe zwischenspeichern', text: 'API-Aufrufe zwischenspeichern' }
    ]
  }
]

export function buildProtocols(): { path: string; name: string; content: string; modifiedAt: number }[] {
  const d0 = dayString(0)
  const d2 = dayString(2)
  const d7 = dayString(7)
  return [
    {
      path: `${SMARTHOME_PROTOCOLS}/${d0}.md`,
      name: `${d0}.md`,
      modifiedAt: Date.now() - 40 * MINUTE_MS,
      content: `---
tags: [protokoll, mini-pc]
datum: ${d0}
---
# Protokoll ${d0}

Arbeit am [[homeserver]] und am [[Music-Recommender|Music Recommender]].

## Backup vor Update

- Backup von \`/opt/smarthome\` nach \`/srv/backup/smarthome-${d0}.tar.gz\` (412 MB)
- \`zigbee2mqtt/data/\` separat gesichert und mit \`sha256sum\` geprüft
- Letztes Backup lag 23 Tage zurück

## Update Home Assistant

\`\`\`bash
cd /opt/smarthome
docker compose pull homeassistant
docker compose up -d homeassistant
docker compose logs --tail 50 homeassistant
\`\`\`

Nach dem Neustart waren alle 38 Zigbee-Geräte wieder erreichbar. Das neue Dashboard sieht so aus:

![[ha-dashboard.png]]

| Dienst | Vorher | Nachher | Status |
|---|---|---|---|
| Home Assistant | 2026.8.3 | 2026.9.2 | läuft |
| Zigbee2MQTT | 2.6.1 | 2.6.1 | unverändert |
| Mosquitto | 2.0.22 | 2.0.22 | unverändert |

> Mosquitto bleibt vorerst auf 2.0, das Update auf 2.1 steht in der [[TODO]].

## Offen

- [ ] Mosquitto-Update planen
- [x] Protokoll in den Vault
`
    },
    {
      path: `${SMARTHOME_PROTOCOLS}/${d2}.md`,
      name: `${d2}.md`,
      modifiedAt: Date.now() - 2 * DAY_MS - 3 * HOUR_MS,
      content: `---
tags: [protokoll, music-recommender]
---
# Music Recommender: Encoder v3

Neues Modell \`music-taste-encoder\` auf dem Mini-PC trainiert. Details in [[Music-Recommender]].

## Ergebnis

1. Training über 14 Epochen, 3 Std. 12 Min. auf der CPU
2. Recall@20 von **0,312** auf **0,347** verbessert
3. Deploy über den Stack \`musicrec\`, danach Cloudflare Tunnel geprüft

![[recall-kurve.png]]

Die Empfehlungen wirken für Nischen-Genres deutlich treffender. Der Cold-Start für neue Nutzer bleibt schwach.

## Nächste Schritte

- Evaluation gegen v2 auf dem Testset der letzten 90 Tage
- Embeddings im Cache vorwärmen
`
    },
    {
      path: `${CLOUD_PROTOCOLS}/${d7}.md`,
      name: `${d7}.md`,
      modifiedAt: Date.now() - 7 * DAY_MS,
      content: `# Wetter: Deploy-Key eingeschränkt

Der Deploy-Key für \`ssh wetter-server\` erlaubt nur noch \`upload\`, \`switch\`, \`prune\` und \`list\`.

- \`authorized_keys\` mit \`command=\` und \`restrict\`
- Test: \`ssh wetter-server list\` liefert die letzten fünf Releases
- Siehe [[Server Cloud]]
`
    },
    {
      path: `${WEATHER_PROTOCOLS}/${d2}.md`,
      name: `${d2}.md`,
      modifiedAt: Date.now() - 2 * DAY_MS - 6 * HOUR_MS,
      content: `# Wetter-Dashboard: Vorhersage eingebaut

- Sieben-Tage-Vorhersage als Balken unter der Karte
- Ladezeit mit Zwischenspeicher von 2,1 s auf 0,4 s
`
    }
  ]
}

export interface MockImageSeed {
  readonly meta: ImageMeta
  readonly width: number
  readonly height: number
}

export const MOCK_IMAGE_SEEDS: readonly MockImageSeed[] = [
  { meta: { id: 1, fileName: '1.png', title: 'Von dir · 07.10.26, 21:40', project: 'C:\\Users\\Alex\\projects\\ai-interface', tags: ['entwurf', 'ui'], bytes: 482_113, createdAt: Date.now() - 2 * HOUR_MS, host: 'local', source: 'user', sessionId: 'mock-s1' }, width: 1600, height: 1000 },
  { meta: { id: 2, fileName: '2.png', title: 'Screenshot · browser_take_screenshot · Recall@20', project: '/home/alex/projects/Playlist_Builder_v2', tags: ['auswertung'], bytes: 118_004, createdAt: Date.now() - 2 * DAY_MS, host: 'mini-pc', source: 'auto', sessionId: 'mock-s2' }, width: 1200, height: 800 },
  { meta: { id: 3, fileName: '3.png', title: 'Zigbee-Netz Erdgeschoss', project: '/opt/smarthome', tags: ['zigbee', 'karte'], bytes: 904_551, createdAt: Date.now() - 4 * DAY_MS, host: 'mini-pc', source: 'manual', sessionId: null }, width: 1000, height: 1250 },
  { meta: { id: 4, fileName: '4.png', title: 'Screenshot · take_screenshot · Terminal-Farben', project: 'C:\\Users\\Alex\\projects\\ai-interface', tags: ['farben'], bytes: 64_220, createdAt: Date.now() - 5 * DAY_MS, host: 'local', source: 'auto', sessionId: 'mock-s4' }, width: 1200, height: 900 },
  { meta: { id: 5, fileName: '5.png', title: 'Screenshot · browser_take_screenshot · Wetter', project: '/home/alex/projects/wetter-dashboard', tags: ['screenshot'], bytes: 1_204_778, createdAt: Date.now() - 9 * DAY_MS, host: 'mini-pc', source: 'auto', sessionId: 'mock-s5' }, width: 900, height: 1400 },
  { meta: { id: 6, fileName: '6.png', title: 'Stromverbrauch September', project: '/opt/smarthome', tags: ['energie', 'auswertung'], bytes: 233_091, createdAt: Date.now() - 12 * DAY_MS, host: 'mini-pc', source: 'manual', sessionId: null }, width: 1400, height: 800 },
  { meta: { id: 7, fileName: '7.png', title: 'Whiteboard-Foto Architektur', project: null, tags: ['notiz'], bytes: 2_310_442, createdAt: Date.now() - 15 * DAY_MS, host: null, source: 'manual', sessionId: null }, width: 1300, height: 975 }
]

/** Commits je Monat der letzten 14 Monate, mit Pausen und einem Schub zuletzt. */
const NOTE_APP_ACTIVITY: readonly number[] = [4, 11, 7, 0, 0, 3, 9, 14, 6, 2, 0, 12, 23, 17]

function mockActivity(counts: readonly number[]): MonthActivity[] {
  const now = new Date()
  return counts.map((commits, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (counts.length - 1 - i), 1)
    return { month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, commits }
  })
}

const NOTE_APP_STATS: KnowledgeStats = {
  computedAt: Date.now() - 2 * DAY_MS,
  files: 214,
  lines: 31_480,
  languages: [
    { name: 'TypeScript', lines: 21_950, files: 142 },
    { name: 'CSS', lines: 2_310, files: 9 },
    { name: 'Markdown', lines: 2_020, files: 18 },
    { name: 'Rust', lines: 1_870, files: 11 },
    { name: 'JSON', lines: 1_640, files: 14 },
    { name: 'Shell', lines: 420, files: 6 },
    { name: 'YAML', lines: 310, files: 5 },
    { name: 'Other', lines: 960, files: 9 }
  ],
  areas: [
    { path: 'src', lines: 22_400, files: 151 },
    { path: 'src/renderer', lines: 12_900, files: 88 },
    { path: 'src/main', lines: 8_300, files: 54 },
    { path: 'tests', lines: 4_100, files: 31 },
    { path: 'server', lines: 2_400, files: 14 },
    { path: 'server/src', lines: 2_050, files: 11 },
    { path: 'docs', lines: 1_700, files: 12 },
    { path: 'src/shared', lines: 1_200, files: 9 },
    { path: 'mobile', lines: 520, files: 4 },
    { path: 'scripts', lines: 430, files: 6 },
    { path: '.', lines: 330, files: 7 }
  ],
  commits: NOTE_APP_ACTIVITY.reduce((a, b) => a + b, 0),
  firstCommit: '2025-09-14',
  lastCommit: todayIso(),
  activity: mockActivity(NOTE_APP_ACTIVITY),
  contributorCount: 4,
  contributors: [
    { name: 'Alex Morgan', commits: 71 },
    { name: 'Sam Lee', commits: 26 },
    { name: 'Kim Ito', commits: 9 },
    { name: 'dependabot[bot]', commits: 2 }
  ],
  hotspots: [
    { path: 'src/main/sync/SyncService.ts', changes: 34, lines: 612 },
    { path: 'src/renderer/Editor.tsx', changes: 29, lines: 488 },
    { path: 'src/main/links/LinkIndex.ts', changes: 21, lines: 301 },
    { path: 'src/shared/api.ts', changes: 18, lines: 244 },
    { path: 'server/src/conflicts.rs', changes: 15, lines: 389 },
    { path: 'src/renderer/stores/notesStore.ts', changes: 12, lines: 206 },
    { path: 'src/main/store/NoteStore.ts', changes: 11, lines: 342 },
    { path: 'package.json', changes: 9, lines: 61 }
  ],
  dependencies: [
    { name: 'electron', version: '^33.0.0', ecosystem: 'npm', dev: true, manifest: 'package.json' },
    { name: 'react', version: '^19.0.0', ecosystem: 'npm', dev: false, manifest: 'package.json' },
    { name: 'codemirror', version: '^6.0.1', ecosystem: 'npm', dev: false, manifest: 'package.json' },
    { name: 'ssh2', version: '^1.16.0', ecosystem: 'npm', dev: false, manifest: 'package.json' },
    { name: 'better-sqlite3', version: '^11.5.0', ecosystem: 'npm', dev: false, manifest: 'package.json' },
    { name: 'zustand', version: '^5.0.0', ecosystem: 'npm', dev: false, manifest: 'package.json' },
    { name: 'marked', version: '^15.0.0', ecosystem: 'npm', dev: false, manifest: 'package.json' },
    { name: 'vitest', version: '^3.0.0', ecosystem: 'npm', dev: true, manifest: 'package.json' },
    { name: 'typescript', version: '^5.7.0', ecosystem: 'npm', dev: true, manifest: 'package.json' },
    { name: 'electron-vite', version: '^3.0.0', ecosystem: 'npm', dev: true, manifest: 'package.json' },
    { name: 'tokio', version: '1.41', ecosystem: 'crates', dev: false, manifest: 'server/Cargo.toml' },
    { name: 'axum', version: '0.7', ecosystem: 'crates', dev: false, manifest: 'server/Cargo.toml' },
    { name: 'serde', version: '1', ecosystem: 'crates', dev: false, manifest: 'server/Cargo.toml' }
  ]
}

const NOTE_APP_KNOWLEDGE: ProjectKnowledge = {
  version: 2,
  generatedAt: Date.now() - 2 * DAY_MS,
  basedOn: { head: 'a1b2c3d', protocolDate: todayIso() },
  summary: 'Notiz-App: Desktop-Programm zum Schreiben und Verknüpfen von Markdown-Notizen mit Synchronisation über einen eigenen Server.',
  architecture: {
    nodes: [
      { id: 'ui', label: 'Editor-Oberfläche', kind: 'ui', where: 'src/renderer', note: 'React-Oberfläche mit Editor, Notizliste und Graph der Verknüpfungen.' },
      { id: 'main', label: 'Hauptprozess', kind: 'service', where: 'src/main', note: 'Electron-Hauptprozess: Dateien, Fenster und alle IPC-Kanäle.' },
      { id: 'store', label: 'Notiz-Speicher', kind: 'data', where: 'src/main/store', note: 'SQLite-Index über den Markdown-Dateien, inklusive Rückverweisen.' },
      { id: 'sync', label: 'Sync-Dienst', kind: 'service', where: 'src/main/sync', note: 'Gleicht Änderungen mit dem Server ab und markiert Konflikte.' },
      { id: 'server', label: 'Sync-Server', kind: 'external', where: 'server', note: 'Kleiner Rust-Server (axum), speichert Versionen je Notiz.' },
      { id: 'phone', label: 'Handy-App', kind: 'device', where: 'mobile', note: 'Geplante Leseansicht für unterwegs.' }
    ],
    edges: [
      { from: 'ui', to: 'main', label: 'IPC' },
      { from: 'main', to: 'store' },
      { from: 'main', to: 'sync' },
      { from: 'sync', to: 'server', label: 'SSH-Tunnel' },
      { from: 'phone', to: 'server' }
    ]
  },
  features: [
    { name: 'Markdown-Editor mit Vorschau', where: 'src/renderer/Editor.tsx', status: 'fertig' },
    { name: 'Verknüpfungen zwischen Notizen', where: 'src/main/links', status: 'teilweise' },
    { name: 'Synchronisation', where: 'src/main/sync', status: 'teilweise' },
    { name: 'Handy-Ansicht', where: 'mobile/', status: 'geplant' }
  ],
  timeline: [
    {
      date: '2026-10-02',
      title: 'Erster Editor',
      detail: 'Markdown-Bearbeitung mit Live-Vorschau steht.',
      links: [
        { kind: 'commit', ref: '9f8e7d6' },
        { kind: 'file', ref: 'src/renderer/Editor.tsx' }
      ]
    },
    {
      date: '2026-10-15',
      title: 'Notizen verknüpfen',
      detail: 'Wiki-Links und Rückverweise im Speicher.',
      links: [
        { kind: 'protocol', ref: 'Programmieren/Notiz-App/Protokoll/2026-10-15.md' },
        { kind: 'file', ref: 'src/main/links/LinkIndex.ts' }
      ]
    },
    {
      date: '2026-10-28',
      title: 'Sync über SSH-Tunnel',
      detail: 'Abgleich mit dem eigenen Server, Konflikte werden markiert.',
      links: [
        { kind: 'commit', ref: 'a1b2c3d' },
        { kind: 'protocol', ref: 'Programmieren/Notiz-App/Protokoll/2026-10-28.md' }
      ]
    }
  ],
  concepts: [
    {
      term: 'SSH-Tunnel',
      short: 'Verschlüsselter Weg zum Server, ohne dass er öffentlich erreichbar ist.',
      explanation: 'Der Sync-Dienst öffnet eine SSH-Verbindung und leitet einen lokalen Port an den Server weiter. So bleibt der Server hinter der Firewall.',
      links: [{ title: 'ssh2 – Port Forwarding', url: 'https://github.com/mscdex/ssh2#readme' }],
      files: ['src/main/sync/tunnel.ts']
    },
    {
      term: 'IPC zwischen Main und Renderer',
      short: 'Oberfläche und Hauptprozess reden nur über benannte Kanäle.',
      explanation: 'Die Oberfläche läuft getrennt vom Hauptprozess und fragt Daten über benannte Kanäle an, statt direkt auf Dateien zuzugreifen.',
      links: [
        { title: 'Electron: Inter-Process Communication', url: 'https://www.electronjs.org/docs/latest/tutorial/ipc' },
        { title: 'contextBridge', url: 'https://www.electronjs.org/docs/latest/api/context-bridge' }
      ],
      files: ['src/shared/api.ts', 'src/preload/index.ts']
    },
    {
      term: 'Rückverweis',
      short: 'Zu jeder Notiz ist bekannt, wer auf sie zeigt.',
      explanation: 'Beim Speichern werden Wiki-Links ausgelesen und im Index in beide Richtungen eingetragen.',
      links: [],
      files: ['src/main/links/LinkIndex.ts']
    },
    {
      term: 'Drei-Wege-Abgleich',
      short: 'Konflikte erkennt der Server am gemeinsamen Vorgänger.',
      explanation: 'Server und Client vergleichen beide Fassungen mit der letzten gemeinsamen. Nur wenn beide dieselbe Stelle ändern, entsteht ein Konflikt.',
      links: [{ title: 'Three-way merge', url: 'https://en.wikipedia.org/wiki/Merge_(version_control)' }],
      files: ['server/src/conflicts.rs']
    }
  ],
  gaps: ['Wie Sync-Konflikte bei gleichzeitiger Bearbeitung aufgelöst werden, steht nirgends dokumentiert.', 'Ob die Handy-App noch geplant ist, geht aus den letzten Protokollen nicht hervor.'],
  flows: [
    {
      title: 'Notiz speichern',
      question: 'Was passiert, wenn ich eine Notiz speichere?',
      steps: [
        { from: 'Editor-Oberfläche', to: 'Hauptprozess', label: 'notes:save (IPC) mit Text' },
        { from: 'Hauptprozess', to: 'Notiz-Speicher', label: 'Datei schreiben, Index aktualisieren' },
        { from: 'Notiz-Speicher', to: 'Hauptprozess', label: 'neue Rückverweise' },
        { from: 'Hauptprozess', to: 'Sync-Dienst', label: 'Änderung vormerken' },
        { from: 'Hauptprozess', to: 'Editor-Oberfläche', label: 'notes:changed (Event)' }
      ]
    },
    {
      title: 'Synchronisieren',
      question: 'Wie kommen Änderungen auf den Server?',
      steps: [
        { from: 'Sync-Dienst', to: 'Sync-Server', label: 'SSH-Tunnel öffnen' },
        { from: 'Sync-Dienst', to: 'Sync-Server', label: 'POST /sync mit Änderungen seit letzter Version' },
        { from: 'Sync-Server', to: 'Sync-Server', label: 'Drei-Wege-Abgleich' },
        { from: 'Sync-Server', to: 'Sync-Dienst', label: 'neue Versionen und Konflikte' },
        { from: 'Sync-Dienst', to: 'Notiz-Speicher', label: 'Versionen übernehmen, Konflikte markieren' }
      ]
    },
    {
      title: 'App-Start',
      question: 'Was läuft beim Start der App?',
      steps: [
        { from: 'Hauptprozess', to: 'Notiz-Speicher', label: 'Index öffnen, fehlende Dateien nachziehen' },
        { from: 'Hauptprozess', to: 'Editor-Oberfläche', label: 'Fenster laden' },
        { from: 'Editor-Oberfläche', to: 'Hauptprozess', label: 'notes:list' },
        { from: 'Hauptprozess', to: 'Sync-Dienst', label: 'Sync im Hintergrund starten' }
      ]
    }
  ],
  orientation: {
    start: [
      { label: 'Installieren', command: 'npm install' },
      { label: 'Starten mit Hot Reload', command: 'npm run dev' },
      { label: 'Tests', command: 'npm test' },
      { label: 'Server lokal', command: 'cd server && cargo run' }
    ],
    readFirst: [
      { path: 'src/main/index.ts', why: 'Einstieg: Fenster, IPC-Kanäle und Dienste werden hier verdrahtet.' },
      { path: 'src/shared/api.ts', why: 'Vertrag zwischen Oberfläche und Hauptprozess.' },
      { path: 'src/main/sync/SyncService.ts', why: 'Herz der Synchronisation und meistgeänderte Datei.' },
      { path: 'server/src/conflicts.rs', why: 'Wie der Server Konflikte erkennt.' }
    ]
  },
  pitfalls: [
    { title: 'Index und Dateien laufen auseinander', detail: 'Wer Markdown-Dateien außerhalb der App ändert, muss den Index neu aufbauen.', where: 'src/main/store/NoteStore.ts' },
    { title: 'IPC-Kanäle doppelt pflegen', detail: 'Neue Kanäle gehören in api.ts und in den Preload, sonst kommt im Renderer nur undefined an.', where: 'src/shared/api.ts' },
    { title: 'Server-Version muss passen', detail: 'Client und Server prüfen eine Protokollnummer; nach Änderungen an /sync beide gleichzeitig ausliefern.', where: 'server/src/protocol.rs' }
  ],
  resources: [
    { title: 'Electron-Dokumentation', url: 'https://www.electronjs.org/docs/latest', about: 'Prozessmodell, IPC, Sicherheit.' },
    { title: 'CodeMirror 6', url: 'https://codemirror.net/docs/', about: 'Editor-Komponente der Oberfläche.' },
    { title: 'axum', url: 'https://docs.rs/axum/latest/axum/', about: 'Web-Framework des Sync-Servers.' },
    { title: 'better-sqlite3 API', url: 'https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md', about: 'Synchrone SQLite-Anbindung für den Index.' }
  ],
  stats: NOTE_APP_STATS
}

const MOCK_KNOWLEDGE_BASE = { host: 'local', color: '#e08a4f', icon: null, error: null } as const

export const MOCK_KNOWLEDGE_PROJECTS: readonly KnowledgeProject[] = [
  { ...MOCK_KNOWLEDGE_BASE, favoriteId: 101, name: 'Notiz-App', path: '/home/user/projects/notiz-app', status: 'current', knowledge: NOTE_APP_KNOWLEDGE },
  {
    ...MOCK_KNOWLEDGE_BASE,
    favoriteId: 102,
    name: 'Wetterstation',
    path: '/home/user/projects/wetterstation',
    color: '#6f9bd8',
    status: 'stale',
    // Wissen der Fassung 1: ohne Abläufe, Einstieg, Stolperfallen, Links und Kennzahlen.
    knowledge: {
      version: 1,
      generatedAt: Date.now() - 20 * DAY_MS,
      basedOn: { head: '1234abc', protocolDate: '2026-10-05' },
      summary: 'Wetterstation: Sensoren melden Messwerte an einen kleinen Server, der sie als Diagramme zeigt.',
      architecture: NOTE_APP_KNOWLEDGE.architecture,
      features: NOTE_APP_KNOWLEDGE.features,
      timeline: NOTE_APP_KNOWLEDGE.timeline,
      concepts: NOTE_APP_KNOWLEDGE.concepts.map(({ term, explanation }) => ({ term, explanation })),
      gaps: []
    }
  },
  { ...MOCK_KNOWLEDGE_BASE, favoriteId: 103, name: 'Spiel-Prototyp', path: '/home/user/projects/spiel-prototyp', color: '#8fb573', status: 'missing', knowledge: null }
]
