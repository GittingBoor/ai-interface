const NEWLINE = '\n'
const MAX_PROMPT_LENGTH = 200
const RATE_LIMIT_ERROR = 'rate_limit'
const HTTP_TOO_MANY = 429
/** Eingaben, die keine echten Aufträge sind (Slash-Befehle, Unterbrechungen, Systemhinweise). */
const NOT_A_PROMPT = /^(<command-|<local-command-|\[Request interrupted|Caveat:)/

export interface Interruption {
  readonly sessionId: string
  readonly project: string
  readonly timestamp: number
  readonly message: string
}

export interface SessionMoment {
  readonly sessionId: string
  readonly timestamp: number
}

export interface SessionPrompt extends SessionMoment {
  readonly text: string
}

export interface RunEvents {
  readonly interruptions: readonly Interruption[]
  /** Normale Antworten; eine spätere Antwort beendet einen offenen Abbruch. */
  readonly answers: readonly SessionMoment[]
  /** Letzte echte Eingabe je Session in diesem Ausschnitt. */
  readonly prompts: readonly SessionPrompt[]
  readonly consumedBytes: number
}

interface RawEntry {
  readonly type?: string
  readonly isApiErrorMessage?: boolean
  readonly isMeta?: boolean
  readonly error?: string
  readonly apiErrorStatus?: number
  readonly cwd?: string
  readonly sessionId?: string
  readonly timestamp?: string
  readonly message?: { readonly content?: unknown }
}

interface TextBlock {
  readonly type?: string
  readonly text?: string
}

function textOf(content: unknown): string | null {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return null
  const blocks = content as TextBlock[]
  if (blocks.some((b) => b.type === 'tool_result')) return null
  const text = blocks
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join(' ')
  return text || null
}

const isLimitHit = (e: RawEntry): boolean => e.isApiErrorMessage === true && (e.error === RATE_LIMIT_ERROR || e.apiErrorStatus === HTTP_TOO_MANY)

/** Findet Limit-Abbrüche, spätere Antworten und die letzte Eingabe je Session in einem JSONL-Ausschnitt. */
export function extractRunEvents(chunk: string): RunEvents {
  const lastNewline = chunk.lastIndexOf(NEWLINE)
  if (lastNewline === -1) return { interruptions: [], answers: [], prompts: [], consumedBytes: 0 }
  const complete = chunk.slice(0, lastNewline + 1)
  const interruptions: Interruption[] = []
  const answers = new Map<string, SessionMoment>()
  const prompts = new Map<string, SessionPrompt>()
  for (const line of complete.split(NEWLINE)) {
    if (!line.includes('"sessionId"')) continue
    let entry: RawEntry
    try {
      entry = JSON.parse(line) as RawEntry
    } catch {
      continue
    }
    const timestamp = Date.parse(entry.timestamp ?? '')
    if (!entry.sessionId || Number.isNaN(timestamp)) continue
    const sessionId = entry.sessionId
    if (entry.type === 'assistant' && isLimitHit(entry)) {
      interruptions.push({ sessionId, project: entry.cwd ?? '', timestamp, message: textOf(entry.message?.content)?.trim() ?? 'Kontingent erreicht' })
    } else if (entry.type === 'assistant' && entry.isApiErrorMessage !== true) {
      answers.set(sessionId, { sessionId, timestamp })
    } else if (entry.type === 'user' && entry.isMeta !== true) {
      const text = textOf(entry.message?.content)?.trim()
      if (text && !NOT_A_PROMPT.test(text)) prompts.set(sessionId, { sessionId, timestamp, text: text.slice(0, MAX_PROMPT_LENGTH) })
    }
  }
  return { interruptions, answers: [...answers.values()], prompts: [...prompts.values()], consumedBytes: Buffer.byteLength(complete, 'utf8') }
}
