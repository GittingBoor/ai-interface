import { createHash } from 'node:crypto'
import type { Favorite, SkillAi, SkillCatalogResult, SkillEntry, SkillKind, SkillScope } from '@shared/types'
import { HostUnreachableError } from '../errors'
import { type Host, joinPath } from '../hosts/Host'
import { asList, asText, parseFrontmatter } from './frontmatter'
import { buildRelations } from './relations'

const SKILL_FILE = 'SKILL.md'
const MARKDOWN = '.md'
const SYNCED_DIR = 'synced'
const EXCERPT_LENGTH = 600

interface Origin {
  readonly scope: SkillScope
  readonly ai: SkillAi
  readonly plugin: string | null
  readonly project: string | null
}

interface InstalledPlugins {
  readonly plugins?: Readonly<Record<string, readonly { readonly installPath?: string }[]>>
}

const isMissing = (error: unknown): boolean => (error as { code?: unknown }).code === 'ENOENT'

const USER: Origin = { scope: 'user', ai: 'claude', plugin: null, project: null }

/** Liest alle Skills, Agents und Befehle eines Hosts (nur lesen, nichts ändern). */
export class SkillCatalog {
  private readonly entries: SkillEntry[] = []
  private readonly bodies = new Map<string, string>()
  private readonly errors: string[] = []

  constructor(
    private readonly host: Host,
    private readonly projects: () => readonly Favorite[]
  ) {}

  async scan(): Promise<SkillCatalogResult> {
    this.entries.length = 0
    this.bodies.clear()
    this.errors.length = 0
    const home = await this.host.homeDir()
    const claude = joinPath(this.host, home, '.claude')
    await this.scanRoot(claude, USER)
    await this.scanSkills(joinPath(this.host, claude, 'skills-disabled'), { ...USER, scope: 'disabled' })
    for (const bucket of await this.dirs(joinPath(this.host, claude, 'skills', SYNCED_DIR))) {
      await this.scanSkills(bucket, { ...USER, scope: 'synced' })
    }
    await this.scanPlugins(claude)
    for (const project of this.projects().filter((p) => p.host === this.host.id)) {
      await this.scanRoot(joinPath(this.host, project.path, '.claude'), { ...USER, scope: 'project', project: project.name })
    }
    await this.scanSkills(joinPath(this.host, home, '.codex', 'skills'), { ...USER, ai: 'codex' })
    return { host: this.host.id, entries: [...this.entries], relations: buildRelations(this.entries, this.bodies), errors: [...this.errors] }
  }

  /** `skills/`, `agents/` und `commands/` unter einem `.claude`-Ordner. */
  private async scanRoot(root: string, origin: Origin): Promise<void> {
    await this.scanSkills(joinPath(this.host, root, 'skills'), origin)
    await this.scanFiles(joinPath(this.host, root, 'agents'), 'agent', origin)
    await this.scanFiles(joinPath(this.host, root, 'commands'), 'command', origin)
  }

  private async scanSkills(dir: string, origin: Origin): Promise<void> {
    for (const skillDir of await this.dirs(dir)) {
      if (skillDir.endsWith(`${this.host.separator}${SYNCED_DIR}`)) continue
      const file = joinPath(this.host, skillDir, SKILL_FILE)
      if (await this.host.stat(file)) await this.add(file, 'skill', origin)
    }
  }

  private async scanFiles(dir: string, kind: SkillKind, origin: Origin): Promise<void> {
    for (const entry of await this.list(dir)) {
      if (!entry.isDirectory && entry.name.endsWith(MARKDOWN)) await this.add(joinPath(this.host, dir, entry.name), kind, origin)
    }
  }

  private async scanPlugins(claude: string): Promise<void> {
    const file = joinPath(this.host, claude, 'plugins', 'installed_plugins.json')
    let installed: InstalledPlugins
    try {
      installed = JSON.parse((await this.host.readFile(file)).toString('utf8')) as InstalledPlugins
    } catch (error) {
      if (error instanceof HostUnreachableError) throw error
      if (!isMissing(error)) this.errors.push(`${file}: nicht lesbar`)
      return
    }
    for (const [key, installs] of Object.entries(installed.plugins ?? {})) {
      const plugin = key.split('@')[0] ?? key
      for (const install of installs) {
        if (install.installPath) await this.scanRoot(install.installPath, { ...USER, scope: 'plugin', plugin })
      }
    }
  }

  private async add(path: string, kind: SkillKind, origin: Origin): Promise<void> {
    let content: string
    try {
      content = (await this.host.readFile(path)).toString('utf8')
    } catch (error) {
      if (error instanceof HostUnreachableError) throw error
      this.errors.push(`${path}: nicht lesbar`)
      return
    }
    const { data, body } = parseFrontmatter(content)
    const parts = path.split(/[\\/]/)
    const fallbackName = kind === 'skill' ? (parts[parts.length - 2] ?? path) : (parts[parts.length - 1] ?? path).replace(/\.md$/, '')
    const id = `${this.host.id}:${path}`
    this.bodies.set(id, body)
    this.entries.push({
      id,
      kind,
      name: asText(data['name']) || fallbackName,
      description: asText(data['description']),
      path,
      host: this.host.id,
      ...origin,
      tools: asList(data['tools']),
      model: asText(data['model']) || null,
      skills: asList(data['skills']),
      hash: createHash('sha256').update(content).digest('hex'),
      bodyExcerpt: body.trim().slice(0, EXCERPT_LENGTH)
    })
  }

  private async dirs(path: string): Promise<string[]> {
    return (await this.list(path)).filter((e) => e.isDirectory).map((e) => joinPath(this.host, path, e.name))
  }

  private async list(path: string): Promise<{ name: string; isDirectory: boolean }[]> {
    try {
      return await this.host.readDir(path)
    } catch (error) {
      if (error instanceof HostUnreachableError) throw error
      if (!isMissing(error)) this.errors.push(`${path}: nicht lesbar`)
      return []
    }
  }
}
