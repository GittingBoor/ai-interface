import { join } from 'node:path'
import type { Favorite, HostId, Settings } from '@shared/types'
import type { Locale } from '@shared/i18n/locales'

/** Ordnername im Datenordner der App. */
export const APP_NOTES_DIR_NAME = 'Notizen'
const APP_TODO_FILE = 'TODO.md'
const APP_PROTOCOL_DIR = 'Protokolle'
const APP_PROJECTS_DIR = 'Projekte'
/** Name, den der Vault-Leser je Projekt sucht. */
const PROTOCOL_DIR = 'Protokoll'

/** Feldname für offene Aufgaben je Sprache; der Leser der offenen Aufgaben kennt jeden davon. */
const OPEN_FIELD: Readonly<Record<Locale, string>> = {
  de: 'Offen',
  en: 'Open',
  es: 'Pendiente',
  fr: 'À faire',
  it: 'Da fare',
  ja: '未完了',
  zh: '待办'
}

function pathKey(path: string, platform: NodeJS.Platform): string {
  const normalized = path.replace(/[\\/]+/g, '/').replace(/\/$/, '')
  return platform === 'win32' ? normalized.toLowerCase() : normalized
}

/** Wohin TODOs und Protokolle gehen: in den Obsidian-Vault oder in den Notizordner der App. */
export class NotesStorage {
  constructor(
    private readonly settings: () => Settings,
    readonly appDir: string
  ) {}

  isApp(): boolean {
    return this.settings().storage === 'app'
  }

  /** Einstellungen für Vault-Leser und TODO-Speicher; im App-Modus zeigt der Vault auf den Notizordner der App. */
  effective(): Settings {
    const s = this.settings()
    if (s.storage !== 'app') return s
    return { ...s, vault: { host: 'local', path: this.appDir }, todoFile: APP_TODO_FILE, protocolDir: APP_PROTOCOL_DIR, notesDir: APP_PROJECTS_DIR }
  }

  /** Protokollordner eines lokalen Projekts im App-Modus, sonst `null`. */
  protocolDir(favorite: Favorite): string | null {
    if (!this.isApp() || favorite.host !== 'local') return null
    return join(this.appDir, APP_PROJECTS_DIR, favorite.name, PROTOCOL_DIR)
  }

  /** Das Projekt, in dessen Ordner ein Terminal startet. */
  projectFor(favorites: readonly Favorite[], host: HostId, path: string, platform: NodeJS.Platform): Favorite | null {
    const key = pathKey(path, platform)
    return favorites.find((f) => f.host === host && pathKey(f.path, platform) === key) ?? null
  }
}

/** Vorgabe für Claude-Sitzungen im App-Modus: wohin und wie das Sitzungsprotokoll geschrieben wird. */
export function protocolDirective(dir: string, project: string, locale: Locale): string {
  return [
    `Session protocol (required): before you finish, record this session in \`${dir}\` as \`YYYY-MM-DD.md\`, one file per date.`,
    'If the file exists, append a new `## <short title>` section; create the folder if it is missing. This location replaces any protocol location named in CLAUDE.md.',
    `New files start with front matter (\`tags: [protocol]\`, \`Date: YYYY-MM-DD\`) and the heading \`# YYYY-MM-DD — ${project}\`.`,
    'Each section: request, findings, a table `| # | Action | Location | Result |`, result/evidence,',
    `and last \`**${OPEN_FIELD[locale]}:**\` followed by one \`- [ ] task\` line per outstanding item (leave out finished ones; the app shows this list).`
  ].join(' ')
}
