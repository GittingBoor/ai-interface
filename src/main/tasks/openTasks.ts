export interface ParsedTask {
  readonly text: string
  readonly done: boolean
}

const SECTION = /^## /
const OPEN_FIELD = /^\*\*Offen(?::\*\*|\*\*:)\s*(.*)$/
const NEXT_FIELD = /^\*\*[^*]+\*\*/
const LIST_ITEM = /^[-*]\s+(?:\[([ xX])\]\s+)?(.+)$/
/** „Nichts offen“ in den üblichen Schreibweisen. */
const NOTHING = /^(?:[-–—]|nichts(?: mehr)?(?: offen)?|keine(?:s)?(?: offenen (?:punkte|aufgaben))?)\.?$/i

/** Zeilen des letzten `## `-Abschnitts (ohne Überschrift: das ganze Dokument). */
function lastSection(lines: readonly string[]): readonly string[] {
  const start = lines.findLastIndex((l) => SECTION.test(l))
  return start === -1 ? lines : lines.slice(start + 1)
}

/** Offene Aufgaben aus dem Feld „Offen:“ des letzten Abschnitts eines Protokolls. */
export function parseOpenTasks(markdown: string): ParsedTask[] {
  const lines = lastSection(markdown.split(/\r?\n/))
  const fieldIndex = lines.findIndex((l) => OPEN_FIELD.test(l.trim()))
  if (fieldIndex === -1) return []
  const tasks: ParsedTask[] = []
  const inline = (OPEN_FIELD.exec(lines[fieldIndex]?.trim() ?? '')?.[1] ?? '').trim()
  if (inline && !NOTHING.test(inline)) tasks.push({ text: inline, done: false })
  for (const line of lines.slice(fieldIndex + 1)) {
    const trimmed = line.trim()
    if (!trimmed || SECTION.test(trimmed) || NEXT_FIELD.test(trimmed)) break
    const item = LIST_ITEM.exec(trimmed)
    if (!item) break
    const text = (item[2] ?? '').trim()
    if (!NOTHING.test(text)) tasks.push({ text, done: (item[1] ?? ' ').toLowerCase() === 'x' })
  }
  return tasks
}

/** Vergleichsschlüssel einer Aufgabe: ohne Hervorhebung, Kleinschreibung, Leerraum zusammengefasst. */
export function normalizeTask(text: string): string {
  return text.replace(/[*`_]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('de-DE')
}
