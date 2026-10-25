import { randomUUID } from 'node:crypto'
import type { AssistantEvent } from '@shared/types'
import { ValidationError } from '../errors'
import type { AssistantTool } from './tools'

/** Name des In-Process-MCP-Servers mit den App-Werkzeugen. */
export const TOOL_SERVER = 'aii'
const TOOL_PREFIX = `mcp__${TOOL_SERVER}__`
/** Eingebaute Claude-Code-Werkzeuge, die nur lesen. */
export const BUILTIN_READ_TOOLS: readonly string[] = ['Read', 'Glob', 'Grep']
const DEFAULT_CONFIRM_TIMEOUT_MS = 600_000
const ERROR_HINT = 'Prüfen, ob Claude Code angemeldet ist und das Kontingent frei ist (unten links).'

export type PermissionDecision = { behavior: 'allow'; updatedInput: Record<string, unknown> } | { behavior: 'deny'; message: string }

/** Das, was der Assistent vom SDK-Aufruf braucht (Teilmenge der SDK-Optionen). */
export interface RunOptions {
  readonly resume: string | undefined
  readonly abortController: AbortController
  canUseTool(toolName: string, input: Record<string, unknown>): Promise<PermissionDecision>
}

/** Teilmenge der SDK-Nachrichten, die das Panel braucht. */
export interface AgentMessage {
  readonly type: string
  readonly subtype?: string
  readonly session_id?: string
  readonly is_error?: boolean
  readonly result?: string
  readonly message?: { readonly content?: readonly { readonly type: string; readonly text?: string; readonly name?: string; readonly input?: unknown }[] }
}

export interface AssistantDepsForService {
  run(prompt: string, options: RunOptions): AsyncIterable<AgentMessage>
  readonly tools: readonly AssistantTool[]
  emit(event: AssistantEvent): void
  readonly confirmTimeoutMs?: number
}

interface PendingConfirm {
  resolve(allowed: boolean): void
}

/** Pfade, die der Assistent nie lesen darf: SSH-Ordner/Schlüssel, Claude-Anmeldung, .env-Dateien. */
const SECRET_PATH = /(^|[\\/])(\.ssh([\\/]|$)|\.credentials\.json$|\.env(\.[^\\/]*)?$|id_(rsa|ed25519|ecdsa|dsa)[^\\/]*$)/i
const PATH_FIELDS: readonly string[] = ['file_path', 'path', 'pattern', 'notebook_path']

/** Prüft die Pfadfelder der eingebauten Lesewerkzeuge (Read, Glob, Grep). */
/** Auch vom PreToolUse-Hook genutzt: Lesewerkzeuge fragen im SDK nicht immer über canUseTool nach. */
export const touchesSecret = (input: Record<string, unknown>): boolean =>
  PATH_FIELDS.some((field) => {
    const value = input[field]
    return typeof value === 'string' && SECRET_PATH.test(value)
  })

const shortName = (name: string): string => (name.startsWith(TOOL_PREFIX) ? name.slice(TOOL_PREFIX.length) : name)

function summarize(input: unknown): string {
  const text = JSON.stringify(input ?? {})
  return text.length > 120 ? `${text.slice(0, 119)}…` : text
}

/** Führt Gespräche mit dem Assistenten; jede ändernde Aktion braucht die Bestätigung des Nutzers. */
export class AssistantService {
  private sessionId: string | undefined
  private abort: AbortController | null = null
  private readonly pending = new Map<string, PendingConfirm>()

  constructor(private readonly deps: AssistantDepsForService) {}

  async send(text: string): Promise<void> {
    if (this.abort) throw new ValidationError('Der Assistent läuft noch. Warten oder „Stopp“ drücken.')
    const turnId = randomUUID()
    const abort = new AbortController()
    this.abort = abort
    try {
      const stream = this.deps.run(text, { resume: this.sessionId, abortController: abort, canUseTool: (name, input) => this.decide(name, input, abort.signal) })
      for await (const message of stream) this.handle(turnId, message)
    } catch (error) {
      if (!abort.signal.aborted) this.deps.emit({ type: 'error', message: error instanceof Error ? error.message : String(error), hint: ERROR_HINT })
    } finally {
      this.abort = null
      for (const [id, confirm] of this.pending) {
        confirm.resolve(false)
        this.pending.delete(id)
      }
      this.deps.emit({ type: 'done', turnId })
    }
  }

  stop(): void {
    this.abort?.abort()
  }

  /** Neuer Chat: die Session wird nicht fortgesetzt. */
  reset(): void {
    this.stop()
    this.sessionId = undefined
  }

  confirm(requestId: string, allowed: boolean): void {
    this.pending.get(requestId)?.resolve(allowed)
  }

  private handle(turnId: string, message: AgentMessage): void {
    if (message.session_id && (message.type === 'result' || (message.type === 'system' && message.subtype === 'init'))) this.sessionId = message.session_id
    if (message.type === 'assistant') {
      for (const block of message.message?.content ?? []) {
        if (block.type === 'text' && block.text?.trim()) this.deps.emit({ type: 'text', turnId, text: block.text })
        if (block.type === 'tool_use' && block.name) this.deps.emit({ type: 'tool', turnId, name: shortName(block.name), summary: summarize(block.input) })
      }
    }
    if (message.type === 'result' && message.is_error) {
      this.deps.emit({ type: 'error', message: message.result?.trim() || 'Der Assistent hat mit einem Fehler aufgehört.', hint: ERROR_HINT })
    }
  }

  private async decide(name: string, input: Record<string, unknown>, signal: AbortSignal): Promise<PermissionDecision> {
    if (BUILTIN_READ_TOOLS.includes(name)) {
      return touchesSecret(input)
        ? { behavior: 'deny', message: 'Schlüssel-, Anmelde- und .env-Dateien sind für den Assistenten gesperrt.' }
        : { behavior: 'allow', updatedInput: input }
    }
    const tool = name.startsWith(TOOL_PREFIX) ? this.deps.tools.find((t) => t.name === shortName(name)) : undefined
    if (!tool) return { behavior: 'deny', message: `Das Werkzeug ${name} ist für den Assistenten nicht freigegeben.` }
    if (!tool.mutating) return { behavior: 'allow', updatedInput: input }
    const allowed = await this.askUser(tool, input, signal)
    return allowed ? { behavior: 'allow', updatedInput: input } : { behavior: 'deny', message: 'Der Nutzer hat die Aktion abgelehnt.' }
  }

  private askUser(tool: AssistantTool, input: Record<string, unknown>, signal: AbortSignal): Promise<boolean> {
    const requestId = randomUUID()
    let preview: string
    try {
      preview = tool.preview(input)
    } catch (error) {
      preview = `Eingabe fehlerhaft: ${error instanceof Error ? error.message : String(error)}`
    }
    return new Promise((resolve) => {
      const finish = (allowed: boolean): void => {
        if (!this.pending.has(requestId)) return
        this.pending.delete(requestId)
        clearTimeout(timer)
        this.deps.emit({ type: 'confirm-resolved', requestId, allowed })
        resolve(allowed)
      }
      const timer = setTimeout(() => finish(false), this.deps.confirmTimeoutMs ?? DEFAULT_CONFIRM_TIMEOUT_MS)
      this.pending.set(requestId, { resolve: finish })
      signal.addEventListener('abort', () => finish(false), { once: true })
      this.deps.emit({ type: 'confirm', requestId, tool: tool.name, preview })
    })
  }
}
