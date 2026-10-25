import { posix, win32 } from 'node:path'
import { z } from 'zod'
import type { Category, CategoryInput, Favorite, FavoriteInput } from '@shared/types'
import { NotFoundError, ValidationError } from '../errors'
import { assertInside } from './pathGuard'
import { planScaffold } from './projectScaffold'

const DEFAULT_PROJECT_COLOR = '#e08a4f'
const PREVIEW_CONTENT_CHARS = 600

/** Was die Werkzeuge aus der App brauchen (vom Container bereitgestellt, in Tests gefälscht). */
export interface AssistantDeps {
  readonly platform: NodeJS.Platform
  projectsRoot(): string
  /** `local` und die IDs aller Geräte. */
  hostIds(): readonly string[]
  /** Der Vault kann auf einem Gerät liegen: eigene Pfadsemantik und eigener Host. */
  readonly vault: {
    platform(): NodeJS.Platform
    root(): string
    exists(path: string): Promise<boolean>
    writeNewFile(path: string, content: string): Promise<void>
  }
  /** Projekte oder Arten wurden geändert (dieselbe DB-Verbindung erzeugt kein `data:changed`). */
  onChanged(): void
  listDirs(path: string): Promise<string[]>
  exists(path: string): Promise<boolean>
  /** Schreibt eine neue Datei (legt Ordner an); die Werkzeuge prüfen vorher, dass sie nicht existiert. */
  writeNewFile(path: string, content: string): Promise<void>
  gitInit(dir: string): Promise<void>
  favorites(): readonly Favorite[]
  categories(): readonly Category[]
  addFavorite(input: FavoriteInput): Favorite
  addCategory(input: CategoryInput): Category
  addTodo(section: string, text: string): Promise<void>
  readonly readOnly: {
    usage(range: 'week' | 'month' | 'all'): Promise<unknown>
    quota(): Promise<unknown>
    todos(): Promise<unknown>
    devices(): Promise<unknown>
    skills(): Promise<unknown>
    settings(): Promise<unknown>
  }
}

/** Ein Werkzeug des Assistenten; `run`/`preview` prüfen die Eingabe selbst gegen `schema`. */
export interface AssistantTool {
  readonly name: string
  readonly description: string
  readonly schema: z.ZodRawShape
  /** Ändert etwas → der Nutzer muss vorher bestätigen. */
  readonly mutating: boolean
  preview(input: unknown): string
  run(input: unknown): Promise<string>
}

interface ToolDef<S extends z.ZodRawShape> {
  readonly name: string
  readonly description: string
  readonly schema: S
  readonly mutating: boolean
  preview?(input: z.infer<z.ZodObject<S>>): string
  run(input: z.infer<z.ZodObject<S>>): Promise<string>
}

function defineTool<S extends z.ZodRawShape>(def: ToolDef<S>): AssistantTool {
  const parse = (input: unknown): z.infer<z.ZodObject<S>> => {
    const result = z.object(def.schema).safeParse(input)
    if (!result.success) throw new ValidationError(`Ungültige Eingabe für ${def.name}: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
    return result.data
  }
  return {
    name: def.name,
    description: def.description,
    schema: def.schema,
    mutating: def.mutating,
    preview: (input) => (def.preview ? def.preview(parse(input)) : JSON.stringify(input, null, 2)),
    run: async (input) => def.run(parse(input))
  }
}

const json = (value: unknown): string => JSON.stringify(value, null, 2)
const excerpt = (text: string): string => (text.length > PREVIEW_CONTENT_CHARS ? `${text.slice(0, PREVIEW_CONTENT_CHARS)}\n…` : text)

function readTools(deps: AssistantDeps): AssistantTool[] {
  const simple = (name: string, description: string, load: () => Promise<unknown>): AssistantTool =>
    defineTool({ name, description, schema: {}, mutating: false, run: async () => json(await load()) })
  return [
    simple('list_projects', 'Alle Projekte der App (Name, Host, Pfad, Art, Stern, Symbol).', async () =>
      deps.favorites().map((f) => ({ ...f, category: deps.categories().find((c) => c.id === f.categoryId)?.name ?? null }))
    ),
    simple('list_categories', 'Projektarten der App (z. B. Programmieren, Arbeit, Lernen, eigene).', async () => deps.categories()),
    simple('list_project_folders', 'Unterordner der Projektwurzel (z. B. Projects, Uni, Tests), wo neue Projektordner hinkommen.', async () => ({
      root: deps.projectsRoot(),
      categories: await deps.listDirs(deps.projectsRoot())
    })),
    defineTool({
      name: 'usage_summary',
      description: 'Arbeitszeit, Token und API-Gegenwert je Projekt für einen Zeitraum.',
      schema: { range: z.enum(['week', 'month', 'all']).optional().describe('Standard: week') },
      mutating: false,
      run: async ({ range }) => json(await deps.readOnly.usage(range ?? 'week'))
    }),
    simple('quota', 'Aktueller Stand des Claude-Abo-Kontingents (5 Stunden, Woche) mit Reset-Zeiten.', () => deps.readOnly.quota()),
    simple('list_todos', 'Offene und erledigte TODOs aus der TODO-Datei im Obsidian-Vault.', () => deps.readOnly.todos()),
    simple('devices_status', 'Angebundene Geräte (SSH): Systemwerte, laufende Claude-Sitzungen, Git-Stand der Projekte.', () => deps.readOnly.devices()),
    simple('list_skills', 'Skills, Agents und Befehle aller Rechner (Name, Art, Herkunft, Beschreibung).', () => deps.readOnly.skills()),
    simple('app_settings', 'Einstellungen der App (Vault-Pfad, Projektwurzel, Geräte ohne Geheimnisse).', () => deps.readOnly.settings())
  ]
}

function writeTools(deps: AssistantDeps): AssistantTool[] {
  const scaffold = (input: Parameters<typeof planScaffold>[1]) => deps.listDirs(deps.projectsRoot()).then((cats) => planScaffold(deps.projectsRoot(), input, cats, deps.platform))
  const notePath = (relative: string): string => {
    const platform = deps.vault.platform()
    const path = platform === 'win32' ? win32 : posix
    return assertInside(deps.vault.root(), path.resolve(deps.vault.root(), relative), platform)
  }
  return [
    defineTool({
      name: 'create_project_folder',
      description:
        'Legt einen neuen Projektordner nach der Checkliste an: <Wurzel>\\<Kategorie>\\<Name> (ohne Kategorie direkt in der Wurzel) mit CLAUDE.md, docs/PLAN.md, README.md, .gitignore und git init -b main. Überschreibt nie etwas.',
      schema: {
        category: z.string().describe('Kategorie-Ordner, siehe list_project_folders; leer, wenn die Projekte direkt in der Wurzel liegen'),
        name: z.string().describe('Ordnername des Projekts'),
        claudeMd: z.string().describe('Inhalt der Projekt-CLAUDE.md'),
        plan: z.string().describe('Inhalt von docs/PLAN.md'),
        readme: z.string().describe('Inhalt der README.md'),
        gitignore: z.enum(['node', 'python', 'other'])
      },
      mutating: true,
      preview: (input) => {
        const plan = planScaffold(deps.projectsRoot(), input, [input.category], deps.platform)
        return [`Ordner: ${plan.dir}`, 'Dateien:', ...plan.files.map((f) => `- ${f.path}`), 'Danach: git init -b main', '', excerpt(input.plan)].join('\n')
      },
      run: async (input) => {
        const plan = await scaffold(input)
        if (await deps.exists(plan.dir)) throw new ValidationError(`Der Ordner ${plan.dir} existiert bereits.`)
        for (const file of plan.files) await deps.writeNewFile(file.path, file.content)
        await deps.gitInit(plan.dir)
        return `Angelegt: ${plan.dir} (${plan.files.length} Dateien, Git-Repository mit Branch main).`
      }
    }),
    defineTool({
      name: 'write_obsidian_note',
      description: 'Schreibt eine NEUE Notiz in den Obsidian-Vault (Pfad relativ zum Vault, z. B. Programmieren/<Projekt>/<Projekt>.md). Vorhandene Notizen werden nie geändert.',
      schema: { path: z.string(), content: z.string() },
      mutating: true,
      preview: ({ path: relative, content }) => `Notiz: ${notePath(relative)}\n\n${excerpt(content)}`,
      run: async ({ path: relative, content }) => {
        const target = notePath(relative)
        if (await deps.vault.exists(target)) throw new ValidationError(`Die Notiz ${target} existiert bereits und wird nicht überschrieben.`)
        await deps.vault.writeNewFile(target, content)
        return `Notiz angelegt: ${target}`
      }
    }),
    defineTool({
      name: 'add_project',
      description: 'Trägt einen Ordner als Projekt (Favorit) in der App ein, mit Art, Farbe, Symbol und Stern.',
      schema: {
        host: z.string().describe('local oder die ID eines Geräts, siehe app_settings'),
        path: z.string(),
        name: z.string(),
        color: z.string().optional().describe('#rrggbb, Standard #e08a4f'),
        category: z.string().optional().describe('Name der Projektart, siehe list_categories'),
        icon: z.string().optional().describe('emoji:<Emoji> oder lucide:<icon-name>'),
        starred: z.boolean().optional().describe('angepinnt, Standard true')
      },
      mutating: true,
      preview: (input) => `Projekt „${input.name}“ (${input.host}) → ${input.path}\nArt: ${input.category ?? 'ohne'} · Farbe ${input.color ?? DEFAULT_PROJECT_COLOR}${input.icon ? ` · Symbol ${input.icon}` : ''}`,
      run: async (input) => {
        if (!deps.hostIds().includes(input.host)) throw new ValidationError(`Unbekannter Rechner „${input.host}“, vorhanden: ${deps.hostIds().join(', ')}.`)
        const category = input.category === undefined ? null : deps.categories().find((c) => c.name.toLowerCase() === input.category?.toLowerCase())
        if (category === undefined) throw new NotFoundError(`Art „${input.category}“`, 'Vorhandene Arten mit list_categories abfragen oder create_category nutzen.')
        const fav = deps.addFavorite({ host: input.host, path: input.path, name: input.name, color: input.color ?? DEFAULT_PROJECT_COLOR, categoryId: category?.id ?? null, icon: input.icon ?? null, starred: input.starred ?? true })
        deps.onChanged()
        return `Projekt eingetragen: ${fav.name} (${fav.host}: ${fav.path})`
      }
    }),
    defineTool({
      name: 'create_category',
      description: 'Legt eine neue Projektart an.',
      schema: { name: z.string(), color: z.string().optional().describe('#rrggbb, Standard #e08a4f'), icon: z.string().optional() },
      mutating: true,
      preview: (input) => `Neue Art „${input.name}“ · Farbe ${input.color ?? DEFAULT_PROJECT_COLOR}${input.icon ? ` · Symbol ${input.icon}` : ''}`,
      run: async (input) => {
        const category = deps.addCategory({ name: input.name, color: input.color ?? DEFAULT_PROJECT_COLOR, icon: input.icon ?? null })
        deps.onChanged()
        return `Art angelegt: ${category.name}`
      }
    }),
    defineTool({
      name: 'add_todo',
      description: 'Fügt einen Eintrag zur TODO-Datei im Vault hinzu (Abschnitt = Projekt/Gruppe).',
      schema: { section: z.string(), text: z.string() },
      mutating: true,
      preview: ({ section, text }) => `TODO in „${section}“: ${text}`,
      run: async ({ section, text }) => {
        await deps.addTodo(section, text)
        return `TODO angelegt in „${section}“.`
      }
    })
  ]
}

export function buildAssistantTools(deps: AssistantDeps): AssistantTool[] {
  return [...readTools(deps), ...writeTools(deps)]
}
