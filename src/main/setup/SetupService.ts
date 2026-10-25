import type { Category, DetectedProject, DeviceSettings, DeviceTestResult, Favorite, FavoriteInput, SetupDetection, SetupInput, Settings, SettingsPatch, VaultScan } from '@shared/types'
import { ValidationError } from '../errors'
import { type Host, joinPath } from '../hosts/Host'
import { parseProposal } from './proposal'

/** Dateiname des Einrichtungsvorschlags im Home-Ordner. */
export const PROPOSAL_FILE = 'ai-interface-setup.json'
const MAX_PROJECTS = 300
const VAULT_SCAN_DEPTH = 4
const MAX_VAULT_HITS = 40
const OBSIDIAN_MARKER = '.obsidian'
const SKIPPED_DIRS = new Set(['node_modules', '.git', '.obsidian', '.trash', '.venv', 'venv', '__pycache__', 'dist', 'out', 'build'])
const TODO_FILE = /^todo.*\.md$/i
const PROTOCOL_DIR = /^protokoll/i
/** Übliche Orte für Projektordner, relativ zum Home-Ordner. */
const HOME_PROJECT_DIRS: readonly (readonly string[])[] = [['projects'], ['Projects'], ['Projekte'], ['GitHub'], ['Documents', 'GitHub'], ['source', 'repos'], ['dev'], ['code'], ['repos'], ['src']]
/** Unter Windows zusätzlich direkt auf den Laufwerken. */
const WINDOWS_DRIVES: readonly string[] = ['C', 'D', 'E', 'F']
const DRIVE_PROJECT_DIRS: readonly string[] = ['GitHub', 'Projects', 'Projekte', 'dev', 'repos']
/** Übliche Orte für Obsidian-Vaults (der Vault selbst oder ein Ordner mit Vaults darin). */
const VAULT_PARENTS: readonly (readonly string[])[] = [
  [],
  ['Documents'],
  ['Dokumente'],
  ['OneDrive'],
  ['OneDrive', 'Documents'],
  ['OneDrive', 'Dokumente'],
  ['Obsidian'],
  ['Dropbox'],
  ['iCloudDrive'],
  ['Library', 'Mobile Documents', 'iCloud~md~obsidian', 'Documents']
]
const SSH_KEYS: readonly string[] = ['id_ed25519', 'id_ecdsa', 'id_rsa']

export interface SetupDeps {
  readonly host: Host
  readonly platform: NodeJS.Platform
  settings(): Settings
  updateSettings(patch: SettingsPatch): Settings
  favorites(): Favorite[]
  addFavorite(input: FavoriteInput): Favorite
  categories(): Category[]
  addCategory(input: { name: string; color: string; icon: string | null }): Category
  /** Verbindet testweise (ohne Fingerabdruck zu speichern) und führt einen leeren Befehl aus. */
  testSsh(device: DeviceSettings): Promise<void>
}

/** Erste Einrichtung: vorhandene Ordner erkennen, Vorschlag einlesen, Ergebnis speichern. */
export class SetupService {
  constructor(private readonly deps: SetupDeps) {}

  async detect(): Promise<SetupDetection> {
    const host = this.deps.host
    const home = await host.homeDir()
    const proposalPath = joinPath(host, home, PROPOSAL_FILE)
    const proposal = (await host.stat(proposalPath)) ? parseProposal((await host.readFile(proposalPath)).toString('utf8')) : null
    return {
      platform: this.deps.platform,
      homeDir: home,
      proposalPath,
      proposal: proposal?.proposal ?? null,
      proposalError: proposal?.error ?? null,
      projectRootCandidates: await this.existingDirs(this.projectRootGuesses(home)),
      vaultCandidates: await this.findVaults(home),
      sshKeyCandidates: await this.existingFiles(SSH_KEYS.map((k) => joinPath(host, home, '.ssh', k))),
      existingInstall: this.deps.favorites().length > 0
    }
  }

  /** Unterordner der Projektwurzel; reine Sammelordner (ohne Git/CLAUDE.md, aber mit Repos darin) werden aufgeklappt. */
  async scanProjects(root: string): Promise<DetectedProject[]> {
    const found: DetectedProject[] = []
    for (const dir of await this.subdirs(root)) {
      if (found.length >= MAX_PROJECTS) break
      const project = await this.describe(dir.path, dir.name)
      if (project.isGit || project.hasClaudeMd) {
        found.push(project)
        continue
      }
      const nested = await Promise.all((await this.subdirs(dir.path)).map((d) => this.describe(d.path, d.name)))
      const real = nested.filter((p) => p.isGit || p.hasClaudeMd)
      found.push(...(real.length ? real : [project]))
    }
    return found.slice(0, MAX_PROJECTS).sort((a, b) => a.path.localeCompare(b.path, 'de'))
  }

  /** TODO-Dateien, Protokollordner und oberste Ordner im Vault (Pfade relativ, Trenner `/`). */
  async scanVault(path: string): Promise<VaultScan> {
    const host = this.deps.host
    if (!(await host.stat(path))?.isDirectory) throw new ValidationError(`Der Ordner ${path} existiert nicht.`)
    const todoFiles: string[] = []
    const protocolDirs: string[] = []
    const walk = async (relative: readonly string[], depth: number): Promise<void> => {
      if (depth < 0 || todoFiles.length + protocolDirs.length >= MAX_VAULT_HITS) return
      const entries = await host.readDir(joinPath(host, path, ...relative)).catch(() => [])
      for (const e of entries) {
        if (e.name.startsWith('.') || SKIPPED_DIRS.has(e.name)) continue
        const next = [...relative, e.name]
        if (!e.isDirectory && TODO_FILE.test(e.name)) todoFiles.push(next.join('/'))
        if (e.isDirectory && PROTOCOL_DIR.test(e.name)) protocolDirs.push(next.join('/'))
        if (e.isDirectory) await walk(next, depth - 1)
      }
    }
    await walk([], VAULT_SCAN_DEPTH)
    const topDirs = (await this.subdirs(path)).map((d) => d.name)
    return { todoFiles: todoFiles.sort(), protocolDirs: protocolDirs.sort(), topDirs }
  }

  async testDevice(device: DeviceSettings): Promise<DeviceTestResult> {
    try {
      await this.deps.testSsh({ ...device, enabled: true, hostFingerprint: '' })
      return { ok: true, message: `Verbunden mit ${device.user}@${device.host}.` }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : String(error) }
    }
  }

  /** Speichert die Einrichtung; vorhandene Projekte und Arten bleiben, doppelte werden übersprungen. */
  finish(input: SetupInput): Settings {
    if (!input.projectsRoot.trim()) throw new ValidationError('Bitte einen Projektordner wählen.')
    const ids = new Set<string>()
    for (const d of input.devices) {
      if (!d.id || d.id === 'local' || ids.has(d.id)) throw new ValidationError(`Geräte-ID „${d.id}“ ist ungültig oder doppelt.`)
      ids.add(d.id)
    }
    const current = this.deps.settings()
    this.deps.updateSettings({
      projectsRoot: input.projectsRoot.trim(),
      vault: { host: 'local', path: input.vault.path.trim() },
      todoFile: input.vault.todoFile.trim() || current.todoFile,
      protocolDir: input.vault.protocolDir.trim() || current.protocolDir,
      notesDir: input.vault.notesDir.trim(),
      devices: input.devices,
      launchOnStartup: input.launchOnStartup
    })
    this.addCategories(input)
    this.addProjects(input)
    return this.deps.updateSettings({ setupDone: true })
  }

  private addCategories(input: SetupInput): void {
    const existing = new Set(this.deps.categories().map((c) => c.name.toLowerCase()))
    for (const c of input.categories) {
      if (existing.has(c.name.trim().toLowerCase())) continue
      this.deps.addCategory({ name: c.name.trim(), color: c.color, icon: c.icon })
      existing.add(c.name.trim().toLowerCase())
    }
  }

  private addProjects(input: SetupInput): void {
    const categories = this.deps.categories()
    const known = new Set(this.deps.favorites().map((f) => `${f.host}\n${f.path}`))
    for (const p of input.projects) {
      const key = `${p.host}\n${p.path}`
      if (known.has(key)) continue
      const category = p.category ? categories.find((c) => c.name.toLowerCase() === p.category?.toLowerCase()) : undefined
      this.deps.addFavorite({ host: p.host, path: p.path, name: p.name, color: p.color, categoryId: category?.id ?? null, icon: p.icon, starred: p.starred })
      known.add(key)
    }
  }

  private projectRootGuesses(home: string): string[] {
    const host = this.deps.host
    const fromHome = HOME_PROJECT_DIRS.map((parts) => joinPath(host, home, ...parts))
    if (this.deps.platform !== 'win32') return fromHome
    return [...fromHome, ...WINDOWS_DRIVES.flatMap((drive) => DRIVE_PROJECT_DIRS.map((dir) => `${drive}:\\${dir}`))]
  }

  private async findVaults(home: string): Promise<string[]> {
    const host = this.deps.host
    const vaults = new Set<string>()
    for (const parts of VAULT_PARENTS) {
      const parent = parts.length ? joinPath(host, home, ...parts) : home
      if (!(await host.stat(parent))?.isDirectory) continue
      if (parts.length && (await host.stat(joinPath(host, parent, OBSIDIAN_MARKER)))) vaults.add(parent)
      for (const dir of await this.subdirs(parent)) {
        if (await host.stat(joinPath(host, dir.path, OBSIDIAN_MARKER))) vaults.add(dir.path)
      }
    }
    return [...vaults]
  }

  private async describe(path: string, name: string): Promise<DetectedProject> {
    const host = this.deps.host
    const [git, claude] = await Promise.all([host.stat(joinPath(host, path, '.git')), host.stat(joinPath(host, path, 'CLAUDE.md'))])
    return { path, name, isGit: git !== null, hasClaudeMd: claude !== null }
  }

  private async subdirs(path: string): Promise<{ path: string; name: string }[]> {
    const host = this.deps.host
    const entries = await host.readDir(path).catch(() => [])
    return entries
      .filter((e) => e.isDirectory && !e.name.startsWith('.') && !SKIPPED_DIRS.has(e.name))
      .map((e) => ({ path: joinPath(host, path, e.name), name: e.name }))
  }

  private async existingDirs(paths: readonly string[]): Promise<string[]> {
    const checks = await Promise.all(paths.map(async (p) => ((await this.deps.host.stat(p).catch(() => null))?.isDirectory ? p : null)))
    return checks.filter((p): p is string => p !== null)
  }

  private async existingFiles(paths: readonly string[]): Promise<string[]> {
    const checks = await Promise.all(paths.map(async (p) => ((await this.deps.host.stat(p).catch(() => null)) ? p : null)))
    return checks.filter((p): p is string => p !== null)
  }
}
