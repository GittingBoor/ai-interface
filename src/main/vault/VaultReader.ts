import type { Favorite, ProtocolDocument, ProtocolEntry, ProtocolGroup, Settings } from '@shared/types'
import { ValidationError } from '../errors'
import { type Host, joinPath } from '../hosts/Host'

const MARKDOWN = '.md'
const ASSET_DIR = 'Assets'
const MAX_ASSET_DEPTH = 4
const PROTOCOL_DIR = 'Protokoll'
const MAX_SEARCH_DEPTH = 3
const GROUP_SEPARATOR = ' · '
const PROJECT_FILE = 'CLAUDE.md'
/** Pfadangaben wie Obsidian `Programmieren\X\Protokoll\JJJJ-MM-TT.md` in einer Projekt-CLAUDE.md. */
const OBSIDIAN_PATH = /Obsidian\s+`([^`]+)`/g
const ABSOLUTE_PATH = /^(?:[A-Za-z]:)?\//

/** Zerlegt einen relativen Vault-Pfad; `..`, `.` und absolute Pfade sind verboten. */
function safeSegments(relative: string): string[] {
  const segments = relative.split(/[\\/]/)
  if (segments.some((s) => s === '' || s === '.' || s === '..') || /^[A-Za-z]:/.test(relative)) {
    throw new ValidationError(`Ungültiger Dateiname „${relative}“.`)
  }
  return segments
}

/** Vereinheitlicht Trenner auf `/`, ohne Trenner am Ende. */
function normalize(path: string): string {
  return path.replace(/[\\/]+/g, '/').replace(/\/$/, '')
}

interface ProtocolSource {
  /** Ordner relativ zum Vault, Trenner `/`. */
  readonly dir: string
  readonly label: string
  readonly favorite: Favorite | null
}

interface FavoriteRoot {
  readonly favorite: Favorite
  /** Projektordner relativ zum Vault, Trenner `/`. */
  readonly relative: string
}

/** Liest Protokolle (Markdown) und eingebettete Bilder aus dem Obsidian-Vault, gruppiert nach Projekt. */
export class VaultReader {
  constructor(
    private readonly host: () => Host,
    private readonly settings: () => Settings,
    private readonly favorites: () => Favorite[]
  ) {}

  async list(): Promise<ProtocolGroup[]> {
    if (!this.settings().vault.path) return []
    const host = this.host()
    const groups = await Promise.all((await this.sources(host)).map((s) => this.group(host, s)))
    return groups.filter((g) => g.entries.length > 0)
  }

  async read(path: string): Promise<ProtocolDocument> {
    const segments = safeSegments(path)
    const name = segments[segments.length - 1] ?? ''
    const dir = segments.slice(0, -1).join('/')
    const host = this.host()
    const known = (await this.sources(host)).some((s) => s.dir === dir)
    if (!known || !name.endsWith(MARKDOWN)) throw new ValidationError(`„${path}“ ist kein Protokoll aus einem Protokollordner.`)
    const relative = segments.join('/')
    const file = this.absolute(host, relative)
    const [data, stat] = await Promise.all([host.readFile(file), host.stat(file)])
    return { path: relative, name, content: data.toString('utf8'), modifiedAt: stat?.mtimeMs ?? 0 }
  }

  /** Sucht ein eingebettetes Bild: als Vault-Pfad, dann per Dateiname in den Protokollordnern und unter `Assets/`. */
  async readAsset(relative: string): Promise<Buffer | null> {
    const segments = safeSegments(relative)
    const name = segments[segments.length - 1] ?? ''
    const host = this.host()
    if (segments.length > 1) {
      const exact = joinPath(host, this.settings().vault.path, ...segments)
      if (await host.stat(exact)) return host.readFile(exact)
    }
    for (const source of await this.sources(host)) {
      const direct = joinPath(host, this.absolute(host, source.dir), name)
      if (await host.stat(direct)) return host.readFile(direct)
    }
    const found = await this.find(host, joinPath(host, this.settings().vault.path, ASSET_DIR), name, MAX_ASSET_DEPTH)
    return found ? host.readFile(found) : null
  }

  private absolute(host: Host, relative: string): string {
    return joinPath(host, this.settings().vault.path, ...relative.split('/'))
  }

  private async group(host: Host, source: ProtocolSource): Promise<ProtocolGroup> {
    const dir = this.absolute(host, source.dir)
    const files = (await host.readDir(dir)).filter((e) => !e.isDirectory && e.name.endsWith(MARKDOWN))
    const entries = await Promise.all(
      files.map(async (f): Promise<ProtocolEntry> => {
        const stat = await host.stat(joinPath(host, dir, f.name))
        return { path: `${source.dir}/${f.name}`, name: f.name, modifiedAt: stat?.mtimeMs ?? 0, size: stat?.size ?? 0 }
      })
    )
    return {
      id: source.dir,
      label: source.label,
      favoriteId: source.favorite?.id ?? null,
      color: source.favorite?.color ?? null,
      icon: source.favorite?.icon ?? null,
      entries: entries.sort((a, b) => b.name.localeCompare(a.name))
    }
  }

  /** Protokollordner der Projekte im Vault (das genaueste Projekt gewinnt), danach `protocolDir` aus den Einstellungen. */
  private async sources(host: Host): Promise<ProtocolSource[]> {
    const roots = await this.favoriteRoots(host)
    const owners = new Map<string, FavoriteRoot>()
    for (const root of roots) {
      for (const dir of await this.findProtocolDirs(host, root.relative, MAX_SEARCH_DEPTH)) {
        const current = owners.get(dir)
        if (!current || root.relative.length > current.relative.length) owners.set(dir, root)
      }
    }
    const sources: ProtocolSource[] = roots.flatMap((root) =>
      [...owners.entries()]
        .filter(([, owner]) => owner === root)
        .map(([dir]) => ({ dir, label: this.labelFor(root, dir), favorite: root.favorite }))
        .sort((a, b) => a.label.localeCompare(b.label, 'de'))
    )
    const fallback = normalize(this.settings().protocolDir)
    if (fallback && !owners.has(fallback) && (await host.stat(this.absolute(host, fallback)))?.isDirectory) {
      const segments = fallback.split('/')
      sources.push({ dir: fallback, label: segments[segments.length - 2] ?? PROTOCOL_DIR, favorite: null })
    }
    return sources
  }

  /** Projekte auf dem Vault-Host: ihr Ordner im Vault oder, für Projekte außerhalb, ihre Protokollordner im Vault. */
  private async favoriteRoots(host: Host): Promise<FavoriteRoot[]> {
    const own = this.favorites().filter((favorite) => favorite.host === host.id)
    return (await Promise.all(own.map((favorite) => this.rootsFor(host, favorite)))).flat()
  }

  private async rootsFor(host: Host, favorite: Favorite): Promise<FavoriteRoot[]> {
    const inside = this.vaultRelative(host, favorite.path)
    if (inside !== null) return [{ favorite, relative: inside }]
    const notesDir = normalize(this.settings().notesDir)
    const projectNotes = notesDir ? `${notesDir}/${favorite.name}` : favorite.name
    const candidates = new Set([`${projectNotes}/${PROTOCOL_DIR}`, ...(await this.protocolDirsFromProjectFile(host, favorite))])
    const existing = await Promise.all(
      [...candidates].map(async (dir) => ((await host.stat(this.absolute(host, dir)))?.isDirectory ? dir : null))
    )
    return existing
      .filter((dir): dir is string => dir !== null)
      .map((dir) => ({ favorite, relative: dir.split('/').slice(0, -1).join('/') }))
  }

  /** Protokollordner, die die CLAUDE.md des Projekts als Obsidian-Pfad nennt. */
  private async protocolDirsFromProjectFile(host: Host, favorite: Favorite): Promise<string[]> {
    const file = joinPath(host, favorite.path, PROJECT_FILE)
    if (!(await host.stat(file))) return []
    const content = (await host.readFile(file)).toString('utf8')
    return [...content.matchAll(OBSIDIAN_PATH)].flatMap((match): string[] => {
      const path = normalize(match[1] ?? '')
      const relative = ABSOLUTE_PATH.test(path) ? this.vaultRelative(host, path) : path
      const segments = (relative ?? '').split('/')
      const end = segments.indexOf(PROTOCOL_DIR)
      if (end < 0 || segments.some((s) => s === '' || s === '.' || s === '..')) return []
      return [segments.slice(0, end + 1).join('/')]
    })
  }

  /** Pfad relativ zum Vault (Trenner `/`), `''` für den Vault selbst, `null` außerhalb. */
  private vaultRelative(host: Host, absolute: string): string | null {
    const fold = (p: string): string => (host.separator === '\\' ? p.toLowerCase() : p)
    const vault = normalize(this.settings().vault.path)
    const path = normalize(absolute)
    if (fold(path) === fold(vault)) return ''
    return fold(path).startsWith(`${fold(vault)}/`) ? path.slice(vault.length + 1) : null
  }

  private labelFor(root: FavoriteRoot, dir: string): string {
    const inner = dir.slice(root.relative.length).split('/').filter((s) => s.length > 0).slice(0, -1)
    return inner.length ? `${root.favorite.name}${GROUP_SEPARATOR}${inner.join(' / ')}` : root.favorite.name
  }

  private async findProtocolDirs(host: Host, relative: string, depth: number): Promise<string[]> {
    const segments = relative.split('/').filter((s) => s.length > 0)
    if (depth < 0 || !(await host.stat(this.absolute(host, relative)))?.isDirectory) return []
    if (segments[segments.length - 1] === PROTOCOL_DIR) return [relative]
    const subdirs = (await host.readDir(this.absolute(host, relative))).filter((e) => e.isDirectory && !e.name.startsWith('.'))
    const found = await Promise.all(subdirs.map((e) => this.findProtocolDirs(host, [...segments, e.name].join('/'), depth - 1)))
    return found.flat()
  }

  private async find(host: Host, dir: string, name: string, depth: number): Promise<string | null> {
    if (depth < 0 || !(await host.stat(dir))?.isDirectory) return null
    const entries = await host.readDir(dir)
    const hit = entries.find((e) => !e.isDirectory && e.name === name)
    if (hit) return joinPath(host, dir, hit.name)
    for (const sub of entries.filter((e) => e.isDirectory)) {
      const found = await this.find(host, joinPath(host, dir, sub.name), name, depth - 1)
      if (found) return found
    }
    return null
  }
}
