import { z } from 'zod'
import type { KnowledgeDraft, KnowledgeStats } from '@shared/knowledge'
import type { ProtocolEntry } from '@shared/types'
import { ValidationError } from '../errors'
import { joinPath, type Host } from '../hosts/Host'
import { assertRelativePath, clip, quoteFor, readProjectFile, runGit } from '../hosts/projectRead'
import { defineTool, type OrchestratorTool } from '../orchestrator/orchestratorTools'
import type { InspectedProject } from './KnowledgeInspector'
import { knowledgeDraftSchema } from './knowledgeSchema'

export const KNOWLEDGE_SERVER = 'projektwissen'

const DEFAULT_LOG_LIMIT = 40
const MAX_LOG_LIMIT = 200
const GREP_MAX_PER_FILE = 5
const COMMIT_HASH = /^[0-9a-f]{4,64}$/i
const ROOT_ISSUE = '(gesamt)'

/** Was die Werkzeuge eines Laufs brauchen; alles ist an genau ein Projekt gebunden. */
export interface KnowledgeToolDeps {
  readonly project: InspectedProject
  readonly hostLabel: string
  host(): Host
  /** Nur die Protokollgruppe dieses Projekts. */
  protocols(): Promise<readonly ProtocolEntry[]>
  /** Lehnt Pfade außerhalb dieser Gruppe mit `NotFoundError` ab. */
  readProtocol(path: string): Promise<string>
  /** Von der App berechnete Kennzahlen; `null` ohne Git. */
  stats(): Promise<KnowledgeStats | null>
  save(draft: KnowledgeDraft): Promise<void>
  finish(summary: string): void
}

const json = (value: unknown): string => JSON.stringify(value, null, 2)
const hashSchema = z.string().regex(COMMIT_HASH, 'Nur ein Commit-Hash (4–64 Hex-Zeichen) ist erlaubt.')

function parseDraft(input: unknown): KnowledgeDraft {
  const parsed = knowledgeDraftSchema.safeParse(input)
  if (parsed.success) return parsed.data
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.') || ROOT_ISSUE}: ${issue.message}`)
  throw new ValidationError(`Projektwissen nicht gespeichert, bitte nachbessern:\n${issues.join('\n')}`)
}

export function createKnowledgeTools(deps: KnowledgeToolDeps): OrchestratorTool[] {
  const { favorite } = deps.project
  const git = (args: string): Promise<string> => runGit(deps.host(), favorite.path, args)
  const quote = (value: string): string => quoteFor(deps.host(), value)

  const listDir = async (dir: string): Promise<string> => {
    const host = deps.host()
    const entries = await host.readDir(joinPath(host, favorite.path, dir))
    return clip(entries.map((entry) => (entry.isDirectory ? `${entry.name}/` : entry.name)).join('\n') || '(leer)')
  }

  return [
    defineTool({
      name: 'project_info',
      description: 'Projekt dieses Laufs: Name, Rechner, Pfad, Shell, Zustand, aktueller Stand (HEAD, neuestes Protokoll), Stand des bisherigen Wissens (basedOn), Anzahl neuer Protokolle und Commits.',
      schema: {},
      mutating: false,
      run: async () =>
        json({
          name: favorite.name,
          device: deps.hostLabel,
          path: favorite.path,
          shell: deps.host().separator === '/' ? 'posix' : 'windows',
          status: deps.project.status,
          current: deps.project.current,
          basedOn: deps.project.knowledge?.basedOn ?? null,
          newProtocols: deps.project.newProtocols,
          newCommits: deps.project.newCommits
        })
    }),
    defineTool({
      name: 'read_knowledge',
      description: 'Bisheriges Projektwissen als JSON, oder null beim ersten Lauf.',
      schema: {},
      mutating: false,
      run: async () => json(deps.project.knowledge)
    }),
    defineTool({
      name: 'list_protocols',
      description: 'Protokolle dieses Projekts aus dem Vault (path, name, size). Der Name ist das Datum.',
      schema: {},
      mutating: false,
      run: async () => json((await deps.protocols()).map((entry) => ({ path: entry.path, name: entry.name, size: entry.size })))
    }),
    defineTool({
      name: 'read_protocol',
      description: 'Liest ein Protokoll; path genau aus list_protocols übernehmen.',
      schema: { path: z.string().trim().min(1) },
      mutating: false,
      run: async ({ path }) => clip(await deps.readProtocol(path))
    }),
    defineTool({
      name: 'git_log',
      description: 'Commits (Hash, Betreff, Datum), neueste zuerst. since: Commit-Hash, dann nur Commits danach.',
      schema: { limit: z.number().int().min(1).max(MAX_LOG_LIMIT).optional(), since: hashSchema.optional() },
      mutating: false,
      run: async ({ limit, since }) => git(`log -n ${limit ?? DEFAULT_LOG_LIMIT} --pretty=reference${since ? ` ${since}..HEAD` : ''}`)
    }),
    defineTool({
      name: 'git_show_stat',
      description: 'Ein Commit mit Nachricht und geänderten Dateien (ohne Diff).',
      schema: { ref: hashSchema },
      mutating: false,
      run: async ({ ref }) => git(`show --stat --format=medium --date=short ${ref}`)
    }),
    defineTool({
      name: 'git_grep',
      description: 'Sucht einen festen Text (keine Regex) in den versionierten Dateien; Datei:Zeile:Inhalt.',
      schema: { text: z.string().trim().min(1) },
      mutating: false,
      run: async ({ text }) => git(`grep -n -I -F -i --max-count=${GREP_MAX_PER_FILE} -e ${quote(text)}`)
    }),
    defineTool({
      name: 'list_files',
      description: 'Dateien des Projekts. Mit Git alle versionierten Dateien (optional unter dir), sonst eine Ordnerebene.',
      schema: { dir: z.string().trim().min(1).optional() },
      mutating: false,
      run: async ({ dir }) => {
        if (dir !== undefined) assertRelativePath(dir)
        if (deps.project.current.head === null) return listDir(dir ?? '')
        return git(dir === undefined ? 'ls-files' : `ls-files -- ${quote(dir)}`)
      }
    }),
    defineTool({
      name: 'project_stats',
      description: 'Von der App berechnete Kennzahlen: Zeilen und Dateien, Sprachen, größte Ordner, Commits je Monat, Mitwirkende, oft geänderte Dateien (Hotspots), Abhängigkeiten aus den Manifesten. null ohne Git.',
      schema: {},
      mutating: false,
      run: async () => clip(json(await deps.stats()))
    }),
    defineTool({
      name: 'read_project_file',
      description: 'Liest eine Datei im Projektordner (Pfad relativ zum Projekt, ohne ..). Lange Dateien werden gekürzt.',
      schema: { path: z.string().trim().min(1) },
      mutating: false,
      run: async ({ path }) => readProjectFile(deps.host(), favorite.path, path)
    }),
    defineTool({
      name: 'save_knowledge',
      description: 'Prüft und speichert das Projektwissen (summary, architecture, features, flows, orientation, pitfalls, concepts, resources, timeline, gaps). Bei Fehlern kommen alle Probleme zurück.',
      schema: { knowledge: z.record(z.string(), z.unknown()) },
      mutating: true,
      run: async ({ knowledge }) => {
        await deps.save(parseDraft(knowledge))
        return 'Projektwissen gespeichert. Jetzt finish aufrufen.'
      }
    }),
    defineTool({
      name: 'finish',
      description: 'Beendet den Lauf. Die App schließt danach dieses Terminal. summary: ein bis zwei Sätze.',
      schema: { summary: z.string().trim().min(1) },
      mutating: true,
      run: async ({ summary }) => {
        deps.finish(summary)
        return 'Lauf beendet, das Terminal schließt sich gleich.'
      }
    })
  ]
}
