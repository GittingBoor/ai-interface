import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { Category, Favorite, FavoriteInput } from '@shared/types'
import { type AssistantDeps, buildAssistantTools } from '../../src/main/assistant/tools'

function fakeDeps(): {
  deps: AssistantDeps
  files: Map<string, string>
  notes: Map<string, string>
  dirs: Set<string>
  commands: string[]
  added: FavoriteInput[]
  todos: string[]
  changes: { count: number }
} {
  const files = new Map<string, string>()
  const dirs = new Set<string>(['D:\\GitHub\\Projects', 'D:\\GitHub\\Uni'])
  const commands: string[] = []
  const added: FavoriteInput[] = []
  const todos: string[] = []
  const notes = new Map<string, string>()
  const changes = { count: 0 }
  const categories: Category[] = [{ id: 1, name: 'Programmieren', color: '#e08a4f', icon: null, sortOrder: 0 }]
  const deps: AssistantDeps = {
    platform: 'win32',
    projectsRoot: () => 'D:\\GitHub',
    hostIds: () => ['local', 'mini-pc'],
    vault: {
      platform: () => 'win32',
      root: () => 'C:\\Users\\B\\Vault',
      exists: async (path) => notes.has(path),
      writeNewFile: async (path, content) => {
        notes.set(path, content)
      }
    },
    onChanged: () => {
      changes.count++
    },
    listDirs: async (path) => [...dirs].filter((d) => d.startsWith(`${path}\\`) && !d.slice(path.length + 1).includes('\\')).map((d) => d.slice(path.length + 1)),
    exists: async (path) => files.has(path) || dirs.has(path),
    writeNewFile: async (path, content) => {
      files.set(path, content)
    },
    gitInit: async (dir) => {
      commands.push(`git init -b main ${dir}`)
    },
    favorites: () => [] as Favorite[],
    categories: () => categories,
    addFavorite: (input) => {
      added.push(input)
      return { ...input, id: 9, sortOrder: 0, createdAt: 0, categoryId: input.categoryId ?? null, starred: input.starred ?? true, icon: input.icon ?? null }
    },
    addCategory: (input) => ({ ...input, id: 2, sortOrder: 1 }),
    addTodo: async (section, text) => {
      todos.push(`${section}: ${text}`)
    },
    readOnly: {
      usage: async () => ({ note: 'usage' }),
      quota: async () => ({ note: 'quota' }),
      todos: async () => ({ note: 'todos' }),
      devices: async () => ({ note: 'devices' }),
      skills: async () => ({ note: 'skills' }),
      settings: async () => ({ note: 'settings' })
    }
  }
  return { deps, files, notes, dirs, commands, added, todos, changes }
}

const find = (deps: AssistantDeps, name: string) => {
  const tool = buildAssistantTools(deps).find((t) => t.name === name)
  if (!tool) throw new Error(`Werkzeug ${name} fehlt`)
  return tool
}

describe('Assistenten-Werkzeuge', () => {
  it('markiert genau die ändernden Werkzeuge', () => {
    const tools = buildAssistantTools(fakeDeps().deps)
    expect(tools.filter((t) => t.mutating).map((t) => t.name).sort()).toEqual(['add_project', 'add_todo', 'create_category', 'create_project_folder', 'write_obsidian_note'])
    expect(tools.filter((t) => !t.mutating).map((t) => t.name)).toContain('list_project_folders')
  })

  it('legt ein Projekt nach Checkliste an und führt git init aus', async () => {
    const { deps, files, commands } = fakeDeps()
    const tool = find(deps, 'create_project_folder')
    const input = { category: 'Projects', name: 'Beat Lab', claudeMd: '# C', plan: '# P', readme: '# R', gitignore: 'node' }
    expect(tool.preview(input)).toContain('D:\\GitHub\\Projects\\Beat Lab\\CLAUDE.md')
    expect(await tool.run(input)).toContain('D:\\GitHub\\Projects\\Beat Lab')
    expect([...files.keys()]).toHaveLength(4)
    expect(commands).toEqual(['git init -b main D:\\GitHub\\Projects\\Beat Lab'])
  })

  it('überschreibt keinen vorhandenen Projektordner', async () => {
    const { deps, dirs } = fakeDeps()
    dirs.add('D:\\GitHub\\Projects\\Beat Lab')
    await expect(find(deps, 'create_project_folder').run({ category: 'Projects', name: 'Beat Lab', claudeMd: '', plan: '', readme: '', gitignore: 'other' })).rejects.toThrow(/existiert bereits/)
  })

  it('schreibt Obsidian-Notizen nur neu und nur im Vault', async () => {
    const { deps, notes } = fakeDeps()
    const tool = find(deps, 'write_obsidian_note')
    await tool.run({ path: 'Programmieren/Beat Lab/Beat Lab.md', content: '# Beat Lab' })
    expect(notes.get('C:\\Users\\B\\Vault\\Programmieren\\Beat Lab\\Beat Lab.md')).toBe('# Beat Lab')
    await expect(tool.run({ path: 'Programmieren/Beat Lab/Beat Lab.md', content: 'x' })).rejects.toThrow(/existiert bereits/)
    await expect(tool.run({ path: '../geheim.md', content: 'x' })).rejects.toThrow(/nicht innerhalb/)
    await expect(tool.run({ path: 'C:\\Windows\\x.md', content: 'x' })).rejects.toThrow(/nicht innerhalb/)
  })

  it('schreibt Notizen in einen Vault auf dem Mini-PC mit POSIX-Pfaden über dessen Host', async () => {
    const { deps, notes, files } = fakeDeps()
    const miniVault: AssistantDeps = { ...deps, vault: { ...deps.vault, platform: () => 'linux', root: () => '/home/alex/vault' } }
    const tool = find(miniVault, 'write_obsidian_note')
    expect(tool.preview({ path: 'Programmieren/X/X.md', content: 'x' })).toContain('/home/alex/vault/Programmieren/X/X.md')
    await tool.run({ path: 'Programmieren/X/X.md', content: '# X' })
    expect([...notes.keys()]).toEqual(['/home/alex/vault/Programmieren/X/X.md'])
    expect(files.size).toBe(0)
    await expect(tool.run({ path: '../../.ssh/authorized_keys', content: 'x' })).rejects.toThrow(/nicht innerhalb/)
  })

  it('meldet Änderungen an Projekten und Arten, damit die Oberfläche neu lädt', async () => {
    const { deps, changes } = fakeDeps()
    await find(deps, 'add_project').run({ host: 'local', path: 'D:/x', name: 'X' })
    await find(deps, 'create_category').run({ name: 'Neu' })
    expect(changes.count).toBe(2)
  })

  it('trägt ein Projekt mit Art per Name ein und prüft die Eingabe', async () => {
    const { deps, added } = fakeDeps()
    const tool = find(deps, 'add_project')
    await tool.run({ host: 'local', path: 'D:\\GitHub\\Projects\\Beat Lab', name: 'Beat Lab', color: '#8fb573', category: 'Programmieren', icon: 'emoji:🎵' })
    expect(added[0]).toMatchObject({ categoryId: 1, icon: 'emoji:🎵', starred: true })
    await expect(tool.run({ host: 'local', path: 'D:\\x', name: 'X', color: '#8fb573', category: 'Gibtsnicht' })).rejects.toThrow(/Art/)
    await expect(tool.run({ host: 'irgendwo', path: 'D:\\x', name: 'X' })).rejects.toThrow()
  })

  it('Lesewerkzeuge liefern JSON-Text', async () => {
    const { deps } = fakeDeps()
    expect(JSON.parse(await find(deps, 'quota').run({}))).toEqual({ note: 'quota' })
    expect(JSON.parse(await find(deps, 'list_project_folders').run({}))).toEqual({ root: 'D:\\GitHub', categories: ['Projects', 'Uni'] })
  })
})

describe('Werkzeug-Schemas', () => {
  it('Felder mit Standardwert sind für das Modell optional (nicht required im JSON-Schema)', () => {
    const optional: Readonly<Record<string, readonly string[]>> = {
      add_project: ['color', 'category', 'icon', 'starred'],
      create_category: ['color', 'icon'],
      usage_summary: ['range']
    }
    for (const tool of buildAssistantTools(fakeDeps().deps)) {
      const required = (z.toJSONSchema(z.object(tool.schema), { io: 'input' }) as { required?: string[] }).required ?? []
      const requiredOutput = (z.toJSONSchema(z.object(tool.schema)) as { required?: string[] }).required ?? []
      for (const field of optional[tool.name] ?? []) {
        expect(required, `${tool.name}.${field} (input)`).not.toContain(field)
        expect(requiredOutput, `${tool.name}.${field} (output)`).not.toContain(field)
      }
    }
  })
})
