import type { HostId, PromptRecord, UsageRecord } from '@shared/types'

const SYNTHETIC_MODEL = '<synthetic>'
const NEWLINE = '\n'
/** Befehls-, Hook- und Systemausgaben, die Claude Code als Nutzerzeile ablegt. */
const SYSTEM_TAG = /^<[a-z][a-z-]*>/
/** Marker, die Claude Code beim Abbrechen (Esc) als Nutzertext ablegt. */
const INTERRUPTED = /^\[Request interrupted by user[^\]]*\]$/

export interface ParseResult {
  readonly records: UsageRecord[]
  readonly prompts: PromptRecord[]
  /** Anzahl Bytes bis einschließlich des letzten vollständigen Zeilenumbruchs. */
  readonly consumedBytes: number
  readonly skippedLines: number
}

interface RawUsage {
  readonly input_tokens?: number
  readonly output_tokens?: number
  readonly cache_creation_input_tokens?: number
  readonly cache_read_input_tokens?: number
}

interface RawBlock {
  readonly type?: string
  readonly text?: string
}

interface RawEntry {
  readonly type?: string
  readonly uuid?: string
  readonly isMeta?: boolean
  readonly isSidechain?: boolean
  readonly isCompactSummary?: boolean
  readonly sessionId?: string
  readonly cwd?: string
  readonly timestamp?: string
  readonly message?: { readonly id?: string; readonly model?: string; readonly usage?: RawUsage; readonly content?: string | readonly RawBlock[] }
}

const toCount = (value: number | undefined): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

function toRecord(entry: RawEntry, host: HostId, fallbackProject: string): UsageRecord | null {
  const message = entry.message
  if (entry.type !== 'assistant' || !message?.usage || !message.id || !entry.timestamp) return null
  if (!message.model || message.model === SYNTHETIC_MODEL) return null
  const timestamp = Date.parse(entry.timestamp)
  if (Number.isNaN(timestamp)) return null
  return {
    messageId: message.id,
    sessionId: entry.sessionId ?? 'unbekannt',
    host,
    project: entry.cwd ?? fallbackProject,
    model: message.model,
    timestamp,
    inputTokens: toCount(message.usage.input_tokens),
    outputTokens: toCount(message.usage.output_tokens),
    cacheCreationTokens: toCount(message.usage.cache_creation_input_tokens),
    cacheReadTokens: toCount(message.usage.cache_read_input_tokens)
  }
}

/** Text eines echten Prompts oder null (Werkzeug-Antwort, Systemausgabe, kein Text). */
function promptText(content: string | readonly RawBlock[] | undefined): string | null {
  if (typeof content === 'string') return SYSTEM_TAG.test(content.trim()) || INTERRUPTED.test(content.trim()) ? null : content
  if (!Array.isArray(content) || content.some((b) => b.type === 'tool_result')) return null
  const texts = content
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text as string)
    .filter((t) => !INTERRUPTED.test(t.trim()))
  return texts.length ? texts.join(NEWLINE) : null
}

function toPrompt(entry: RawEntry, host: HostId, fallbackProject: string): PromptRecord | null {
  if (entry.type !== 'user' || !entry.uuid || !entry.timestamp || entry.isMeta === true || entry.isSidechain === true || entry.isCompactSummary === true) return null
  const text = promptText(entry.message?.content)
  const timestamp = Date.parse(entry.timestamp)
  if (text === null || Number.isNaN(timestamp)) return null
  return { uuid: entry.uuid, sessionId: entry.sessionId ?? 'unbekannt', host, project: entry.cwd ?? fallbackProject, timestamp, chars: text.length }
}

/**
 * Parst einen Ausschnitt einer Claude-Code-JSONL-Datei.
 * Eine unvollständige letzte Zeile wird nicht verbraucht, damit sie beim nächsten Lauf komplett gelesen wird.
 */
export function parseJsonlChunk(chunk: string, host: HostId, fallbackProject: string): ParseResult {
  const lastNewline = chunk.lastIndexOf(NEWLINE)
  if (lastNewline === -1) return { records: [], prompts: [], consumedBytes: 0, skippedLines: 0 }
  const complete = chunk.slice(0, lastNewline + 1)
  const records: UsageRecord[] = []
  const prompts: PromptRecord[] = []
  let skippedLines = 0
  for (const line of complete.split(NEWLINE)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let entry: RawEntry
    try {
      entry = JSON.parse(trimmed) as RawEntry
    } catch {
      skippedLines++
      continue
    }
    const record = toRecord(entry, host, fallbackProject)
    if (record) records.push(record)
    const prompt = toPrompt(entry, host, fallbackProject)
    if (prompt) prompts.push(prompt)
  }
  return { records, prompts, consumedBytes: Buffer.byteLength(complete, 'utf8'), skippedLines }
}

const WINDOWS_DRIVE = /^([A-Za-z])--(.*)$/

/** Wandelt Claudes kodierten Projektordner (`-home-alex-projects`) näherungsweise in einen Pfad zurück. */
export function decodeProjectDir(dirName: string): string {
  const windows = WINDOWS_DRIVE.exec(dirName)
  if (windows) return `${windows[1]}:\\${(windows[2] ?? '').replaceAll('-', '\\')}`
  return dirName.replaceAll('-', '/')
}
