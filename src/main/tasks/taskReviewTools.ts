import { z } from 'zod'
import type { HostId, ProjectTasks, ReviewedTask } from '@shared/types'
import { NotFoundError, ValidationError } from '../errors'
import type { Host } from '../hosts/Host'
import { assertRelativePath, quoteFor, readProjectFile, runGit } from '../hosts/projectRead'
import { defineTool, type OrchestratorTool } from '../orchestrator/orchestratorTools'

const DEFAULT_LOG_LIMIT = 40
const MAX_LOG_LIMIT = 200
const GREP_MAX_PER_FILE = 5

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

const isoDay = (ms: number): string => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
  const git = async (project: ReviewProject, args: string): Promise<string> => runGit(deps.host(project.host), project.path, args)

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
        assertRelativePath(path)
        const project = await projectOf(groupId)
        return readProjectFile(deps.host(project.host), project.path, path)
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
