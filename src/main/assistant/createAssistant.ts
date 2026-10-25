import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type { AssistantEvent, Favorite, GitState, HostId, MiniPcSnapshot, Settings, SkillCatalogResult } from '@shared/types'
import { isFile, resolveClaudeExecutable } from '../claude/claudePath'
import type { CategoriesRepo } from '../favorites/CategoriesRepo'
import type { FavoritesRepo } from '../favorites/FavoritesRepo'
import { GitCommandError } from '../errors'
import type { Host } from '../hosts/Host'
import type { MiniPcService } from '../minipc/MiniPcService'
import type { QuotaService } from '../quota/QuotaService'
import type { SkillsService } from '../skills/SkillsService'
import type { TodoMarkdownStore } from '../todos/TodoMarkdownStore'
import type { UsageService } from '../usage/UsageService'
import { AssistantService } from './AssistantService'
import { createSdkRunner } from './sdkRunner'
import { buildSystemPrompt } from './systemPrompt'
import { type AssistantDeps, buildAssistantTools } from './tools'

const execFileAsync = promisify(execFile)
const CHECKLIST_FILE = 'CLAUDE.md'
const MAX_TODOS = 80

export interface AssistantParts {
  hosts(id: HostId): Host
  hostIds(): HostId[]
  settings(): Settings
  readonly favorites: FavoritesRepo
  /** Privatmodus: der Assistent sieht private Projekte nur entsperrt. */
  readonly privacy: {
    filterFavorites(items: readonly Favorite[]): Favorite[]
    filterSkills(result: SkillCatalogResult): SkillCatalogResult
    filterMiniPc(host: HostId, snapshot: MiniPcSnapshot): MiniPcSnapshot
    filterGit(host: HostId, items: readonly GitState[]): GitState[]
  }
  readonly categories: CategoriesRepo
  readonly usage: UsageService
  readonly quota: QuotaService
  readonly todos: TodoMarkdownStore
  readonly minipc: MiniPcService
  readonly skills: SkillsService
  emit(event: AssistantEvent): void
  /** Projekte/Arten geändert → Oberfläche neu laden lassen. */
  onDataChanged(): void
}

const localDate = (): string => new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

/** Stellt den Assistenten mit echten App-Diensten zusammen. */
export function createAssistant(parts: AssistantParts): AssistantService {
  const local = parts.hosts('local')
  const vaultHost = (): Host => parts.hosts(parts.settings().vault.host)
  const vaultRoot = (): string => parts.settings().vault.path

  const deps: AssistantDeps = {
    platform: process.platform,
    projectsRoot: () => parts.settings().projectsRoot,
    hostIds: () => parts.hostIds(),
    vault: {
      // Vault auf einem Gerät: POSIX-Pfade und SFTP statt lokaler Pfade.
      platform: () => (parts.settings().vault.host === 'local' ? process.platform : 'linux'),
      root: vaultRoot,
      exists: async (path) => (await vaultHost().stat(path)) !== null,
      writeNewFile: (path, content) => vaultHost().writeFileAtomic(path, content)
    },
    onChanged: parts.onDataChanged,
    listDirs: async (path) => (await local.readDir(path)).filter((e) => e.isDirectory && !e.name.startsWith('.')).map((e) => e.name),
    exists: async (path) => (await local.stat(path)) !== null,
    writeNewFile: (path, content) => local.writeFileAtomic(path, content),
    gitInit: async (dir) => {
      // Ohne Shell: kein Quoting, keine %VAR%-Erweiterung durch cmd.exe.
      try {
        await execFileAsync('git', ['-C', dir, 'init', '-b', 'main'], { windowsHide: true })
      } catch (error) {
        throw new GitCommandError(`git init in ${dir}`, error instanceof Error ? error.message : String(error))
      }
    },
    favorites: () => parts.privacy.filterFavorites(parts.favorites.list()),
    categories: () => parts.categories.list(),
    addFavorite: (input) => parts.favorites.add(input),
    addCategory: (input) => parts.categories.add(input),
    addTodo: async (section, text) => {
      await parts.todos.apply({ kind: 'add', section, text, priority: 'normal', due: null })
    },
    readOnly: {
      usage: async (range) => parts.usage.projectBreakdown(range, 'all').slice(0, 30),
      quota: async () => parts.quota.state(),
      todos: async () => {
        const state = await parts.todos.load()
        return { sections: state.sections, open: state.items.filter((t) => !t.done).slice(0, MAX_TODOS) }
      },
      devices: async () =>
        Promise.all(
          parts
            .settings()
            .devices.filter((d) => d.enabled)
            .map(async (d) => ({
              id: d.id,
              name: d.name,
              snapshot: parts.privacy.filterMiniPc(d.id, await parts.minipc.snapshot(d.id)),
              git: await parts.minipc
                .git(d.id, d.projectsDir)
                .then((g) => parts.privacy.filterGit(d.id, g))
                .catch((e: unknown) => String(e))
            }))
        ),
      skills: async () => {
        const hosts = parts.hostIds()
        const results = await Promise.all(hosts.map((h) => parts.skills.catalog(h).then((r) => parts.privacy.filterSkills(r)).catch(() => null)))
        return results.flatMap((r) => r?.entries.map((e) => ({ name: e.name, kind: e.kind, host: e.host, scope: e.scope, ai: e.ai, plugin: e.plugin, description: e.description })) ?? [])
      },
      settings: async () => {
        const s = parts.settings()
        return {
          projectsRoot: s.projectsRoot,
          vault: s.vault,
          todoFile: s.todoFile,
          devices: s.devices.map((d) => ({ id: d.id, name: d.name, enabled: d.enabled, host: d.host, user: d.user, projectsDir: d.projectsDir }))
        }
      }
    }
  }

  const tools = buildAssistantTools(deps)
  return new AssistantService({
    run: createSdkRunner({
      tools,
      cwd: () => parts.settings().projectsRoot,
      claudePath: () => resolveClaudeExecutable(parts.settings().claudeCommand, process.platform, isFile, process.env['PATH'] ?? '', homedir()),
      systemPrompt: async () => {
        const root = parts.settings().projectsRoot
        const checklist = await readFile(join(root, CHECKLIST_FILE), 'utf8').catch(() => null)
        return buildSystemPrompt(localDate(), root, vaultRoot(), checklist, join(root, CHECKLIST_FILE))
      }
    }),
    tools,
    emit: parts.emit
  })
}
