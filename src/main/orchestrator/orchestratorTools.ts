import { z } from 'zod'
import type { Category, Favorite, HostId, TerminalInfo, TerminalStatus } from '@shared/types'
import { NotFoundError, TerminalBusyError, ValidationError } from '../errors'
import { pasteAndSubmit, READ_TAIL_LINES, tailText } from './terminalText'

/** Hier darf geschrieben werden; `question` beantwortet der Nutzer über den Orchestrator. */
const SENDABLE: readonly TerminalStatus[] = ['idle', 'review', 'question']

/** Was die Werkzeuge aus der App brauchen (vom Container bereitgestellt, in Tests gefälscht). */
export interface OrchestratorDeps {
  /** Bereits ohne verborgene Projekte. */
  projects(): readonly Favorite[]
  categories(): readonly Category[]
  hostLabel(host: HostId): string
  /** Bereits ohne verborgene Terminals. */
  terminals(): readonly TerminalInfo[]
  status(id: string): TerminalStatus | undefined
  lastAnswer(id: string): string | null
  /** Text einer offenen Frage oder Erlaubnis-Abfrage. */
  pendingPrompt(id: string): string | null
  snapshot(id: string): string
  openTerminal(project: Favorite, task: string): Promise<TerminalInfo>
  write(id: string, data: string): void
  sleep(ms: number): Promise<void>
  /** Terminal wurde vom Orchestrator geöffnet oder beauftragt (Statuszeilen). */
  track(id: string): void
}

export interface OrchestratorTool {
  readonly name: string
  readonly description: string
  readonly schema: z.ZodRawShape
  /** Steht bei `confirmBeforeSend` nicht in `--allowedTools`. */
  readonly mutating: boolean
  run(input: unknown): Promise<string>
}

interface ToolDef<S extends z.ZodRawShape> {
  readonly name: string
  readonly description: string
  readonly schema: S
  readonly mutating: boolean
  run(input: z.infer<z.ZodObject<S>>): Promise<string>
}

export function defineTool<S extends z.ZodRawShape>(def: ToolDef<S>): OrchestratorTool {
  return {
    name: def.name,
    description: def.description,
    schema: def.schema,
    mutating: def.mutating,
    run: async (input) => {
      const parsed = z.object(def.schema).safeParse(input ?? {})
      if (!parsed.success) throw new ValidationError(`Ungültige Eingabe für ${def.name}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
      return def.run(parsed.data)
    }
  }
}

const json = (value: unknown): string => JSON.stringify(value, null, 2)
const TRUST_HINT = 'Hat der Nutzer diesem Ordner noch nie vertraut, wartet Claude dort auf die Vertrauensabfrage. Sag ihm dann, dass er sie im neuen Tab bestätigen muss; send_to_terminal würde sie ablehnen.'
const PROMPT_LABEL: Partial<Readonly<Record<TerminalStatus, string>>> = { question: 'Offene Frage', permission: 'Offene Erlaubnis-Abfrage' }
const terminalIdSchema = z.string().min(1).describe('ID aus list_terminals')

export function createOrchestratorTools(deps: OrchestratorDeps): OrchestratorTool[] {
  const findTerminal = (id: string): TerminalInfo => {
    const found = deps.terminals().find((t) => t.id === id)
    if (!found) throw new NotFoundError(`Terminal ${id}`, 'Hole die Liste mit list_terminals.')
    return found
  }
  const findProject = (id: number): Favorite => {
    const found = deps.projects().find((p) => p.id === id)
    if (!found) throw new NotFoundError(`Projekt mit ID ${id}`, 'Hole die Liste mit list_projects.')
    return found
  }
  const categoryName = (id: number | null): string | null => deps.categories().find((c) => c.id === id)?.name ?? null

  return [
    defineTool({
      name: 'list_projects',
      description: 'Projekte der App: ID, Name, Gerät, Pfad, Art. Die ID brauchst du für open_project_terminal.',
      schema: {},
      mutating: false,
      run: async () => json(deps.projects().map((p) => ({ id: p.id, name: p.name, device: deps.hostLabel(p.host), path: p.path, category: categoryName(p.categoryId) })))
    }),
    defineTool({
      name: 'list_terminals',
      description: 'Offene Terminals: ID, Titel, Gerät, Pfad, Status (working, idle, review, question, permission, exited).',
      schema: {},
      mutating: false,
      run: async () =>
        json(
          deps.terminals().map((t) => ({
            id: t.id,
            title: t.title,
            device: deps.hostLabel(t.host),
            path: t.path,
            status: deps.status(t.id) ?? 'idle',
            orchestrator: t.orchestrator === true
          }))
        )
    }),
    defineTool({
      name: 'read_terminal',
      description: `Letzte Antwort von Claude in einem Terminal, sonst die letzten ${READ_TAIL_LINES} Zeilen.`,
      schema: { terminalId: terminalIdSchema },
      mutating: false,
      run: async ({ terminalId }) => {
        const { id } = findTerminal(terminalId)
        const status = deps.status(id) ?? 'idle'
        const head = `Status: ${status}`
        const prompt = deps.pendingPrompt(id)
        const promptLabel = PROMPT_LABEL[status]
        if (prompt && promptLabel) return `${head}\n${promptLabel}:\n${prompt}`
        const answer = deps.lastAnswer(id)
        if (answer) return `${head}\nLetzte Antwort${status === 'working' ? ' (von vorher, Claude arbeitet gerade)' : ''}:\n${answer}`
        return `${head}\nLetzte Zeilen:\n${tailText(deps.snapshot(id), READ_TAIL_LINES)}`
      }
    }),
    defineTool({
      name: 'open_project_terminal',
      description: 'Öffnet Claude im Projekt und übergibt die präzisierte Aufgabe als erste Nachricht. Liefert die terminalId.',
      schema: {
        projectId: z.number().int().describe('ID aus list_projects'),
        task: z.string().trim().min(1).describe('Ziel, Kontext, Akzeptanzkriterien, was nicht angefasst wird')
      },
      mutating: true,
      run: async ({ projectId, task }) => {
        const info = await deps.openTerminal(findProject(projectId), task)
        deps.track(info.id)
        return json({ terminalId: info.id, title: info.title, hint: TRUST_HINT })
      }
    }),
    defineTool({
      name: 'send_to_terminal',
      description: 'Schreibt eine Nachricht in ein Terminal und schickt sie ab. Nur wenn es nicht arbeitet (idle, review, question).',
      schema: { terminalId: terminalIdSchema, text: z.string().trim().min(1) },
      mutating: true,
      run: async ({ terminalId, text }) => {
        const info = findTerminal(terminalId)
        if (info.orchestrator) throw new ValidationError('Der Orchestrator kann nicht an sich selbst schreiben.')
        // Ohne Claude würde die Shell den Text als Befehl ausführen.
        if (info.mode === 'shell') throw new ValidationError(`Terminal ${info.id} ist nur eine Shell ohne Claude. Öffne mit open_project_terminal ein Claude-Terminal.`)
        const status = deps.status(info.id) ?? 'idle'
        if (status === 'exited') throw new ValidationError(`Terminal ${info.id} ist beendet. Öffne mit open_project_terminal ein neues.`)
        if (!SENDABLE.includes(status)) throw new TerminalBusyError(`Terminal ${info.id}`)
        await pasteAndSubmit((data) => deps.write(info.id, data), text, deps.sleep)
        deps.track(info.id)
        return `Gesendet an ${info.title}.`
      }
    })
  ]
}
