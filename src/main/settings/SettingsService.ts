import type Database from 'better-sqlite3'
import type { DeviceSettings, Settings, SettingsPatch, SshSettings } from '@shared/types'
import { DEFAULT_SPEECH_MODEL } from '@shared/speech'
import { DEFAULT_NAVIGATION, DEVICE_COLORS } from '@shared/layout'
import { DEFAULT_PRICE_TABLE } from '../usage/pricing'

/** Einstellungen, die als Ganzes gelten (gelöschte Einträge dürfen nicht aus den Standardwerten zurückkommen). */
const WHOLE_VALUE_KEYS: readonly string[] = ['prices', 'devices', 'links', 'navigation', 'layouts']
/** Schlüssel der früheren, fest eingebauten Mini-PC-Verbindung (vor der Geräteliste). */
const LEGACY_MINI_PC_KEY = 'miniPc'
/** Pfade, die früher fest vorbelegt waren; erst wenn beide gespeichert sind, ist nichts mehr abzufragen. */
const OWN_PATH_KEYS: readonly string[] = ['vault', 'projectsRoot']
const LEGACY_DEVICE: Pick<DeviceSettings, 'id' | 'name' | 'icon' | 'projectsDir'> = { id: 'mini-pc', name: 'Mini-PC', icon: 'lucide:server', projectsDir: '~/projects' }

const isPlainObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export function defaultSettings(homeDir: string, platform: NodeJS.Platform): Settings {
  const sep = platform === 'win32' ? '\\' : '/'
  const join = (...parts: string[]): string => parts.join(sep)
  return {
    setupDone: false,
    devices: [],
    links: [],
    vault: { host: 'local', path: '' },
    todoFile: 'TODO.md',
    protocolDir: 'Protokolle',
    notesDir: '',
    navigation: DEFAULT_NAVIGATION,
    layouts: {},
    claudeCommand: 'claude',
    launchOnStartup: true,
    updateMode: 'manual',
    prices: DEFAULT_PRICE_TABLE,
    terminalLayout: { mode: 'tabs', sizes: {} },
    notifications: { permission: true, question: true, done: true, quotaFree: true },
    orchestrator: { enabled: true, confirmBeforeSend: true },
    images: { importReadImages: false },
    projectsRoot: join(homeDir, platform === 'win32' ? 'Projects' : 'projects'),
    speech: { model: DEFAULT_SPEECH_MODEL, deviceId: '', hotkeyEnabled: false }
  }
}

/** Einstellungen als JSON je Schlüssel in SQLite, ergänzt um Standardwerte. */
export class SettingsService {
  constructor(
    private readonly db: Database.Database,
    private readonly defaults: Settings
  ) {}

  /**
   * Einmalig beim Start: ältere Installationen übernehmen. Die frühere Mini-PC-Verbindung wird zum Gerät `mini-pc`
   * (gespeicherte Projekte, Sessions und Bilder verweisen auf diese ID). Als eingerichtet gilt nur, wer Vault und
   * Projektordner selbst gespeichert hat; sonst hingen beide an früheren, fest eingebauten Standardwerten und der
   * Assistent fragt sie einmal ab.
   */
  migrate(): void {
    const keys = new Set((this.db.prepare('SELECT key FROM settings').all() as { key: string }[]).map((r) => r.key))
    const legacy = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(LEGACY_MINI_PC_KEY) as { value: string } | undefined
    if (legacy && !keys.has('devices')) {
      const ssh = JSON.parse(legacy.value) as SshSettings
      const device: DeviceSettings = { ...ssh, ...LEGACY_DEVICE, color: DEVICE_COLORS[0] ?? '#5fb37a' }
      this.update({ devices: [device] })
    }
    if (legacy) this.db.prepare('DELETE FROM settings WHERE key = ?').run(LEGACY_MINI_PC_KEY)
    if (!keys.has('setupDone') && OWN_PATH_KEYS.every((k) => keys.has(k))) this.update({ setupDone: true })
  }

  get(): Settings {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
    // Nur bekannte Einstellungen: interne Schlüssel (z. B. der PIN-Hash) gehen nie an den Renderer.
    const known = rows.filter((r) => Object.hasOwn(this.defaults, r.key))
    const stored = Object.fromEntries(known.map((r) => [r.key, this.withDefaults(r.key, JSON.parse(r.value) as unknown)]))
    return { ...this.defaults, ...stored } as Settings
  }

  /** Gespeicherte Objekte um später hinzugekommene Schlüssel ergänzen (z. B. neue Benachrichtigungsarten). */
  private withDefaults(key: string, value: unknown): unknown {
    const fallback = (this.defaults as unknown as Record<string, unknown>)[key]
    if (WHOLE_VALUE_KEYS.includes(key) || !isPlainObject(fallback) || !isPlainObject(value)) return value
    return { ...fallback, ...value }
  }

  update(patch: SettingsPatch): Settings {
    const stmt = this.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    this.db.transaction(() => {
      // Nur bekannte Einstellungen: interne Schlüssel (z. B. der PIN-Hash) sind über die Oberfläche nicht schreibbar.
      for (const [key, value] of Object.entries(patch)) if (value !== undefined && Object.hasOwn(this.defaults, key)) stmt.run(key, JSON.stringify(value))
    })()
    return this.get()
  }
}
