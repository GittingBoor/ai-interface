import type Database from 'better-sqlite3'
import { SummaryError } from '../errors'

/** Obergrenze für den Inhalt, der an das Modell geht. */
export const MAX_INPUT_CHARS = 8000
export const SUMMARY_MODEL = 'haiku'

export const SUMMARY_PROMPT =
  'Fasse in höchstens zwei kurzen deutschen Sätzen zusammen, was dieser Skill oder Agent kann und wann man ihn nutzt. ' +
  'Antworte nur mit der Zusammenfassung, ohne Einleitung.'

export interface SummaryInput {
  readonly hash: string
  readonly name: string
  readonly content: string
}

export interface SummaryProgress {
  readonly done: number
  readonly total: number
  readonly current: string
}

/** Führt das Modell aus (Prompt + Inhalt über stdin) und liefert die Antwort. */
export type ClaudeRunner = (prompt: string, input: string) => Promise<string>

/** Kurze KI-Zusammenfassungen je Inhalts-Hash, gecacht in SQLite. */
export class SkillSummarizer {
  constructor(
    private readonly db: Database.Database,
    private readonly run: ClaudeRunner,
    private readonly onProgress: (progress: SummaryProgress) => void
  ) {}

  cached(hashes: readonly string[]): Record<string, string> {
    if (!hashes.length) return {}
    const rows = this.db
      .prepare(`SELECT hash, summary FROM skill_summaries WHERE hash IN (${hashes.map(() => '?').join(',')})`)
      .all(...hashes) as { hash: string; summary: string }[]
    return Object.fromEntries(rows.map((r) => [r.hash, r.summary]))
  }

  /** Fasst alle noch nicht gecachten Einträge nacheinander zusammen; liefert die Anzahl neuer Zusammenfassungen. */
  async summarize(entries: readonly SummaryInput[]): Promise<number> {
    const known = this.cached(entries.map((e) => e.hash))
    const todo = entries.filter((e, i) => !known[e.hash] && entries.findIndex((x) => x.hash === e.hash) === i)
    const insert = this.db.prepare('INSERT OR REPLACE INTO skill_summaries (hash, summary, model, created_at) VALUES (?, ?, ?, ?)')
    for (const [index, entry] of todo.entries()) {
      this.onProgress({ done: index, total: todo.length, current: entry.name })
      let summary: string
      try {
        summary = (await this.run(SUMMARY_PROMPT, entry.content.slice(0, MAX_INPUT_CHARS))).trim()
      } catch (error) {
        throw new SummaryError(entry.name, error instanceof Error ? error.message : String(error))
      }
      if (!summary) throw new SummaryError(entry.name, 'leere Antwort')
      insert.run(entry.hash, summary, SUMMARY_MODEL, Date.now())
    }
    if (todo.length) this.onProgress({ done: todo.length, total: todo.length, current: '' })
    return todo.length
  }
}
