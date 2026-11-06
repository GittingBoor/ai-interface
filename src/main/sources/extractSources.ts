import { noteFromPrompt } from '@shared/sources'

const NEWLINE = '\n'
/** Nur Seiten, die Claude wirklich gelesen hat; Suchtreffer (`WebSearch`) zählen nicht. */
const FETCH_TOOL = 'WebFetch'
/** Schneller Vorfilter: nur Zeilen mit Abruf oder Werkzeugergebnis werden als JSON gelesen. */
const FETCH_MARKER = `"name":"${FETCH_TOOL}"`
const RESULT_MARKER = '"tool_result"'

export interface ExtractedSource {
  readonly url: string
  readonly note: string
  readonly sessionId: string
  readonly cwd: string
  readonly timestamp: number
}

interface ContentBlock {
  readonly type?: string
  readonly id?: string
  readonly name?: string
  readonly input?: { readonly url?: unknown; readonly prompt?: unknown }
  readonly tool_use_id?: string
  readonly is_error?: boolean
}

interface RawEntry {
  readonly cwd?: string
  readonly sessionId?: string
  readonly timestamp?: string
  readonly message?: { readonly content?: unknown }
}

interface PendingFetch {
  readonly url: string
  readonly prompt: string
}

const blocks = (value: unknown): ContentBlock[] => (Array.isArray(value) ? (value as ContentBlock[]) : [])

export interface ExtractSourcesResult {
  readonly sources: ExtractedSource[]
  readonly consumedBytes: number
}

/**
 * Erfolgreiche `WebFetch`-Abrufe eines JSONL-Ausschnitts: Adresse aus dem Aufruf, Info aus seiner Frage, Ort aus dem
 * Ergebnis. Steht das Ergebnis erst im nächsten Ausschnitt, fällt der Abruf weg. Eine unvollständige letzte Zeile bleibt liegen.
 */
export function extractSources(chunk: string): ExtractSourcesResult {
  const lastNewline = chunk.lastIndexOf(NEWLINE)
  if (lastNewline === -1) return { sources: [], consumedBytes: 0 }
  const complete = chunk.slice(0, lastNewline + 1)
  const pending = new Map<string, PendingFetch>()
  const sources: ExtractedSource[] = []
  for (const line of complete.split(NEWLINE)) {
    const isFetch = line.includes(FETCH_MARKER)
    if (!isFetch && !(pending.size && line.includes(RESULT_MARKER))) continue
    let entry: RawEntry
    try {
      entry = JSON.parse(line) as RawEntry
    } catch {
      continue
    }
    for (const block of blocks(entry.message?.content)) {
      if (block.type === 'tool_use' && block.name === FETCH_TOOL && block.id && typeof block.input?.url === 'string') {
        pending.set(block.id, { url: block.input.url, prompt: typeof block.input.prompt === 'string' ? block.input.prompt : '' })
      }
      if (block.type !== 'tool_result' || !block.tool_use_id) continue
      const fetch = pending.get(block.tool_use_id)
      if (!fetch) continue
      pending.delete(block.tool_use_id)
      if (block.is_error || !entry.cwd) continue
      const timestamp = Date.parse(entry.timestamp ?? '')
      sources.push({
        url: fetch.url,
        note: noteFromPrompt(fetch.prompt),
        sessionId: entry.sessionId ?? 'unbekannt',
        cwd: entry.cwd,
        timestamp: Number.isNaN(timestamp) ? Date.now() : timestamp
      })
    }
  }
  return { sources, consumedBytes: Buffer.byteLength(complete, 'utf8') }
}
