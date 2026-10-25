import { z } from 'zod'
import type { HostId, ProjectTasks, ReviewedTask } from '@shared/types'
import { NotFoundError, ValidationError } from '../errors'
import { joinPath, type Host } from '../hosts/Host'
import { shellQuote } from '../hosts/shellQuote'
import { defineTool, type OrchestratorTool } from '../orchestrator/orchestratorTools'

const DEFAULT_LOG_LIMIT = 40
const MAX_LOG_LIMIT = 200
const GREP_MAX_PER_FILE = 5
const MAX_OUTPUT_CHARS = 12_000
const READ_LIMIT_BYTES = 64 * 1024
/** Zeichen, die `cmd.exe` auch in doppelten Anführungszeichen auswertet. */
const CMD_UNSAFE = /["%\r\n]/
const PARENT_SEGMENT = /(^|[\\/])\.\.([\\/]|$)/
const ABSOLUTE_PATH = /^([\\/]|[a-zA-Z]:)/

/** Projekt eines Protokollordners (aus dem Favoriten). */
export interface ReviewProject {
  readonly name: string
  readonly host: HostId
  readonly path: string
}

/** Was die Werkzeuge der Aufgaben-Prüfung aus der App brauchen (in Tests gefälscht). */
export interface TaskReviewToolDeps {
  /** Bereits ohne verborgene Projekte. */
  tasks(): Promise<readonly ProjectTasks[]>
  project(favoriteId: number): ReviewProject | undefined
  hostLabel(host: HostId): string
  host(id: HostId): Pick<Host, 'exec' | 'readFile' | 'separator'>
  markDone(task: ReviewedTask): void
  finish(summary: string): void
}

const json = (value: unknown): string => JSON.stringify(value, null, 2)

const clip = (text: string): string => (text.length > MAX_OUTPUT_CHARS ? `${text.slice(0, MAX_OUTPUT_CHARS)}\n… (gekürzt)` : text)

const isoDay = (ms: number): string => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Argument für die Shell des Rechners: `cmd.exe` unter Windows, sonst POSIX. */
function quoteFor(host: Pick<Host, 'separator'>, value: string): string {
  if (host.separator === '/') return shellQuote(value)
  if (CMD_UNSAFE.test(value)) throw new ValidationError(`„${value}“ enthält " oder %, das geht unter Windows nicht. Anderen Suchtext wählen.`)
  return `"${value}"`
}

export function createTaskReviewTools(deps: TaskReviewToolDeps): OrchestratorTool[] {
  const findGroup = async (groupId: string): Promise<ProjectTasks> => {
    const group = (await deps.tasks()).find((g) => g.groupId === groupId)
    if (!group) throw new NotFoundError(`Projekt ${groupId}`, 'Hole die Liste mit list_open_tasks.')
    return group
  }
  const projectOf = async (groupId: string): Promise<ReviewProject> => {
    const group = await findGroup(groupId)
    const project = group.favoriteId === null ? undefined : deps.project(group.favoriteId)
    if (!project) throw new NotFoundError(`Ein Projektordner zu ${group.label}`, 'Diese Gruppe hat keinen Projektordner; nur aus dem Protokoll urteilen.')
    return project
  }
  const git = async (project: ReviewProject, args: string): Promise<string> => {
    const host = deps.host(project.host)
    const result = await host.exec(`git -C ${quoteFor(host, project.path)} ${args}`)
    if (result.code !== 0 && result.stdout.trim() === '') throw new ValidationError(`git meldet Code ${result.code}: ${result.stderr.trim() || 'keine Ausgabe'}`)
    return clip(result.stdout.trim() || '(keine Treffer)')
  }

  return [
    defineTool({
      name: 'list_open_tasks',
      description: 'Alle offenen Aufgaben je Projekt: groupId, Projekt, Rechner, Pfad (null = kein Projektordner), Protokolldatum, Aufgaben mit key und Text.',
      schema: {},
      mutating: false,
      run: async () =>
        json(
          (await deps.tasks()).map((g) => {
            const project = g.favoriteId === null ? undefined : deps.project(g.favoriteId)
            return {
              groupId: g.groupId,
              project: g.label,
              device: project ? deps.hostLabel(project.host) : null,
              path: project?.path ?? null,
              protocolDate: isoDay(g.protocolDate),
              protocolPath: g.protocolPath,
              tasks: g.tasks.map((t) => ({ key: t.key, text: t.text }))
            }
          })
        )
    }),
    defineTool({
      name: 'git_log',
      description: 'Letzte Commits im Repo des Projekts (Hash, Betreff, Datum), neueste zuerst.',
      schema: { groupId: z.string().min(1), limit: z.number().int().min(1).max(MAX_LOG_LIMIT).optional() },
      mutating: false,
      run: async ({ groupId, limit }) => git(await projectOf(groupId), `log --all -n ${limit ?? DEFAULT_LOG_LIMIT} --pretty=reference`)
    }),
    defineTool({
      name: 'git_grep',
      description: 'Sucht einen festen Text (keine Regex) in den versionierten Dateien des Projekts; Datei:Zeile:Inhalt.',
      schema: { groupId: z.string().min(1), text: z.string().trim().min(1) },
      mutating: false,
      run: async ({ groupId, text }) => {
        const project = await projectOf(groupId)
        return git(project, `grep -n -I -F -i --max-count=${GREP_MAX_PER_FILE} -e ${quoteFor(deps.host(project.host), text)}`)
      }
    }),
    defineTool({
      name: 'read_project_file',
      description: 'Liest eine Datei im Projektordner (Pfad relativ zum Projekt, ohne ..). Lange Dateien werden gekürzt.',
      schema: { groupId: z.string().min(1), path: z.string().trim().min(1) },
      mutating: false,
      run: async ({ groupId, path }) => {
        if (ABSOLUTE_PATH.test(path) || PARENT_SEGMENT.test(path)) throw new ValidationError(`„${path}“ muss relativ zum Projekt sein und darf kein .. enthalten.`)
        const project = await projectOf(groupId)
        const host = deps.host(project.host)
        const data = await host.readFile(joinPath(host, project.path, path), 0, READ_LIMIT_BYTES)
        const text = data.toString('utf8')
        return data.length >= READ_LIMIT_BYTES ? `${text}\n… (nach ${READ_LIMIT_BYTES} Byte gekürzt)` : text
      }
    }),
    defineTool({
      name: 'mark_done',
      description: 'Hakt eine Aufgabe ab, die eindeutig erledigt ist. reason: kurzer Beleg (Commit, Datei).',
      schema: { groupId: z.string().min(1), key: z.string().min(1), reason: z.string().trim().min(1) },
      mutating: true,
      run: async ({ groupId, key, reason }) => {
        const group = await findGroup(groupId)
        const task = group.tasks.find((t) => t.key === key)
        if (!task) throw new NotFoundError(`Aufgabe ${key} in ${group.label}`, 'key genau aus list_open_tasks übernehmen.')
        deps.markDone({ groupId, key, text: task.text, label: group.label, reason })
        return `Abgehakt: ${task.text}`
      }
    }),
    defineTool({
      name: 'finish',
      description: 'Beendet die Prüfung. Die App schließt danach dieses Terminal. summary: ein bis zwei Sätze.',
      schema: { summary: z.string().trim().min(1) },
      mutating: true,
      run: async ({ summary }) => {
        deps.finish(summary)
        return 'Prüfung beendet, das Terminal schließt sich gleich.'
      }
    })
  ]
}
