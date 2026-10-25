/**
 * Realistische Beispieldaten für den Browser-Modus (`npm run dev:web`).
 * Alles wird relativ zu „jetzt“ erzeugt und ist durch einen festen Seed stabil.
 */
import { DEFAULT_NAVIGATION } from '@shared/layout'
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
  UsageTotals
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
  projectsRoot: 'D:\\GitHub',
  speech: { model: 'large-v3-turbo-q5_0', deviceId: '', hotkeyEnabled: false }
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
