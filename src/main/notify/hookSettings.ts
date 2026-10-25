import type { HostId } from '@shared/types'
import { shellQuote } from '../hosts/shellQuote'

export type HookEventKind = 'permission' | 'question' | 'done' | 'working' | 'ended'

export interface HookEvent {
  readonly terminalId: string
  readonly kind: HookEventKind
  readonly message: string
  readonly host: HostId
  readonly at: number
}

/** Umgebungsvariable, über die ein Hook sein Terminal in der App kennt. */
export const TERMINAL_ID_ENV = 'AI_INTERFACE_TERMINAL_ID'

const KINDS: readonly HookEventKind[] = ['permission', 'question', 'done', 'working', 'ended']
const FIELD_SEPARATOR = '\t'
const NEWLINE = '\n'

const DEFAULT_MESSAGE: Readonly<Record<HookEventKind, string>> = {
  permission: 'Claude braucht deine Erlaubnis.',
  question: 'Claude hat eine Frage.',
  done: 'Claude ist fertig.',
  working: '',
  ended: ''
}

/**
 * Hook-Befehl: hängt `<terminal-id>\t<art>\t<payload ohne Zeilenumbrüche>` an die Spool-Datei.
 * Läuft unter POSIX-sh; Claude Code nutzt unter Windows Git Bash (geprüft mit 2.1.283).
 */
function spoolCommand(spoolPath: string, kind: HookEventKind): string {
  const file = shellQuote(spoolPath)
  return `{ printf '%s\t${kind}\t' "$${TERMINAL_ID_ENV}"; tr -d '\r\n'; echo; } >> ${file}`
}

const hook = (spoolPath: string, kind: HookEventKind, matcher?: string): object => ({
  ...(matcher ? { matcher } : {}),
  hooks: [{ type: 'command', command: spoolCommand(spoolPath, kind) }]
})

/** Einstellungen für `claude --settings`: meldet Arbeitsbeginn, Erlaubnis, Frage, Antwortende und Sitzungsende an die App. */
export function buildHookSettings(spoolPath: string): string {
  return JSON.stringify({
    hooks: {
      UserPromptSubmit: [hook(spoolPath, 'working')],
      // Nach jedem Werkzeug wieder „arbeitet“, auch nach beantworteter Frage oder erteilter Erlaubnis.
      PostToolUse: [hook(spoolPath, 'working')],
      Notification: [hook(spoolPath, 'permission', 'permission_prompt'), hook(spoolPath, 'question', 'elicitation_dialog')],
      PreToolUse: [hook(spoolPath, 'question', 'AskUserQuestion')],
      Stop: [hook(spoolPath, 'done')],
      // Claude beendet, die Shell läuft weiter: nichts mehr in dieses Terminal schicken.
      SessionEnd: [hook(spoolPath, 'ended')]
    }
  })
}

/** `SessionEnd`-Gründe, nach denen Claude im selben Terminal weiterläuft (neuer Chat bzw. andere Sitzung). */
const SESSION_CONTINUES: readonly string[] = ['clear', 'resume']

interface HookPayload {
  readonly reason?: unknown
  readonly message?: unknown
  readonly last_assistant_message?: unknown
  readonly tool_input?: { readonly questions?: readonly { readonly question?: unknown }[] }
}

function messageOf(kind: HookEventKind, raw: string): string {
  if (kind === 'working' || kind === 'ended') return DEFAULT_MESSAGE[kind]
  let payload: HookPayload
  try {
    payload = JSON.parse(raw) as HookPayload
  } catch {
    return DEFAULT_MESSAGE[kind]
  }
  const question = payload.tool_input?.questions?.[0]?.question
  if (typeof question === 'string' && question.trim()) return question.trim()
  if (typeof payload.message === 'string' && payload.message.trim()) return payload.message.trim()
  const answer = payload.last_assistant_message
  if (kind === 'done' && typeof answer === 'string' && answer.trim()) return answer.trim()
  return DEFAULT_MESSAGE[kind]
}

/** `/clear` und `/resume` melden ein `SessionEnd`, beenden Claude aber nicht. */
function continuesSession(raw: string): boolean {
  try {
    const reason = (JSON.parse(raw) as HookPayload).reason
    return typeof reason === 'string' && SESSION_CONTINUES.includes(reason)
  } catch {
    return false
  }
}

/** Liest vollständige Zeilen der Spool-Datei; die unvollständige letzte bleibt für den nächsten Lauf. */
export function parseSpool(chunk: string, host: HostId, now: number): { events: HookEvent[]; consumedBytes: number } {
  const lastNewline = chunk.lastIndexOf(NEWLINE)
  if (lastNewline === -1) return { events: [], consumedBytes: 0 }
  const complete = chunk.slice(0, lastNewline + 1)
  const events: HookEvent[] = []
  for (const line of complete.split(NEWLINE)) {
    const [terminalId = '', kind = '', ...rest] = line.replace(/\r$/, '').split(FIELD_SEPARATOR)
    if (!terminalId || !(KINDS as readonly string[]).includes(kind)) continue
    const typed = kind as HookEventKind
    const payload = rest.join(FIELD_SEPARATOR)
    if (typed === 'ended' && continuesSession(payload)) continue
    events.push({ terminalId, kind: typed, message: messageOf(typed, payload), host, at: now })
  }
  return { events, consumedBytes: Buffer.byteLength(complete, 'utf8') }
}
