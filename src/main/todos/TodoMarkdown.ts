import type { Priority, TodoChange, TodoItem } from '@shared/types'
import { AppError, ValidationError } from '../errors'

export class TodoNotFoundError extends AppError {
  constructor() {
    super('TODO_NOT_FOUND', 'Der Eintrag existiert in der TODO-Datei nicht mehr.', 'TODOs neu laden, die Datei wurde extern geändert.')
  }
}

const TASK_LINE = /^(\s*)([-*+]) \[([ xX])\] ?(.*)$/
const HEADING_LINE = /^#{1,6}\s+(.+?)\s*#*\s*$/
const FRONTMATTER_FENCE = '---'
const DATE = /^\d{4}-\d{2}-\d{2}$/
const DUE_TOKEN = /\s*📅\s*(\d{4}-\d{2}-\d{2})/u
const DONE_TOKEN = /\s*✅\s*(\d{4}-\d{2}-\d{2})/u
const HIGH_TOKEN = /\s*[🔺⏫]️?/u
const LOW_TOKEN = /\s*[🔽⏬]️?/u
const MEDIUM_TOKEN = /\s*🔼️?/u

const PRIORITY_MARK: Readonly<Record<Priority, string>> = { high: ' ⏫', normal: '', low: ' 🔽' }

interface ParsedLine {
  readonly item: TodoItem
  readonly indent: number
  readonly leading: string
  /** Anzahl Zeilen inkl. eingerückter Notizen. */
  readonly span: number
  readonly bullet: string
}

interface Document {
  readonly lines: string[]
  /** Zeilenende nach Zeile i (die letzte Zeile hat keins). */
  readonly eols: string[]
  /** Für neue Zeilen: das häufigste Zeilenende der Datei. */
  readonly eol: string
  readonly entries: ParsedLine[]
  readonly contentStart: number
}

/** FNV-1a, reicht für stabile, kurze IDs. */
function hash(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

const indentOf = (line: string): number => line.length - line.trimStart().length

function parseBody(body: string): Pick<TodoItem, 'text' | 'priority' | 'due' | 'doneDate'> {
  const due = DUE_TOKEN.exec(body)?.[1] ?? null
  const doneDate = DONE_TOKEN.exec(body)?.[1] ?? null
  const priority: Priority = HIGH_TOKEN.test(body) ? 'high' : LOW_TOKEN.test(body) ? 'low' : 'normal'
  const text = [DUE_TOKEN, DONE_TOKEN, HIGH_TOKEN, LOW_TOKEN, MEDIUM_TOKEN]
    .reduce((acc, token) => acc.replace(new RegExp(token.source, 'gu'), ''), body)
    .replace(/\s+/g, ' ')
    .trim()
  return { text, priority, due, doneDate }
}

function frontmatterEnd(lines: readonly string[]): number {
  if (lines[0]?.trim() !== FRONTMATTER_FENCE) return 0
  const close = lines.findIndex((l, i) => i > 0 && l.trim() === FRONTMATTER_FENCE)
  return close === -1 ? 0 : close + 1
}

function noteSpan(lines: readonly string[], start: number, indent: number): number {
  let end = start + 1
  while (end < lines.length) {
    const line = lines[end] ?? ''
    if (!line.trim() || indentOf(line) <= indent) break
    end++
  }
  return end - start
}

function parseDocument(markdown: string): Document {
  const parts = markdown.split(/(\r?\n)/)
  const lines = parts.filter((_, i) => i % 2 === 0)
  const eols = parts.filter((_, i) => i % 2 === 1)
  const crlf = eols.filter((e) => e === '\r\n').length
  const eol = crlf > eols.length - crlf ? '\r\n' : '\n'
  const contentStart = frontmatterEnd(lines)
  const entries: ParsedLine[] = []
  const occurrences = new Map<string, number>()
  let section = ''
  for (let i = contentStart; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const heading = HEADING_LINE.exec(line)
    if (heading) {
      section = heading[1] ?? ''
      continue
    }
    const task = TASK_LINE.exec(line)
    if (!task) continue
    const indent = (task[1] ?? '').length
    const span = noteSpan(lines, i, indent)
    const body = parseBody(task[4] ?? '')
    const key = `${section}\u0000${body.text}`
    const n = occurrences.get(key) ?? 0
    occurrences.set(key, n + 1)
    const notes = lines
      .slice(i + 1, i + span)
      .map((l) => l.trim())
      .join('\n')
    entries.push({
      item: { id: hash(`${key}\u0000${n}`), line: i, done: task[3] !== ' ', section, notes, ...body },
      indent,
      leading: task[1] ?? '',
      span,
      bullet: task[2] ?? '-'
    })
  }
  return { lines, eols, eol, entries, contentStart }
}

export function parseTodos(markdown: string): TodoItem[] {
  return parseDocument(markdown).entries.map((e) => e.item)
}

function validate(text: string, due: string | null): void {
  if (!text.trim()) throw new ValidationError('Der TODO-Text darf nicht leer sein.')
  if (/[\r\n]/.test(text)) throw new ValidationError('Der TODO-Text darf keinen Zeilenumbruch enthalten.')
  if (due !== null && !DATE.test(due)) throw new ValidationError(`Ungültiges Datum „${due}“, erwartet JJJJ-MM-TT.`)
}

function renderBody(text: string, priority: Priority, due: string | null, doneDate: string | null): string {
  return `${text.trim()}${PRIORITY_MARK[priority]}${due ? ` 📅 ${due}` : ''}${doneDate ? ` ✅ ${doneDate}` : ''}`
}

function findEntry(doc: Document, id: string): ParsedLine {
  const entry = doc.entries.find((e) => e.item.id === id)
  if (!entry) throw new TodoNotFoundError()
  return entry
}

function toggleLine(line: string, done: boolean, today: string): string {
  if (done) return line.replace(/\[[xX]\]/, '[ ]').replace(new RegExp(DONE_TOKEN.source, 'gu'), '')
  return `${line.replace('[ ]', '[x]').trimEnd()} ✅ ${today}`
}

function insertionIndex(doc: Document, section: string): number | null {
  const inSection = doc.entries.filter((e) => e.item.section === section)
  const last = inSection[inSection.length - 1]
  if (last) return last.item.line + last.span
  if (section === '') return doc.contentStart
  const headingIndex = doc.lines.findIndex((l, i) => i >= doc.contentStart && HEADING_LINE.exec(l)?.[1] === section)
  return headingIndex === -1 ? null : headingIndex + 1
}

function addTask(doc: Document, change: Extract<TodoChange, { kind: 'add' }>): void {
  validate(change.text, change.due)
  const newLine = `- [ ] ${renderBody(change.text, change.priority, change.due, null)}`
  const index = insertionIndex(doc, change.section.trim())
  if (index !== null) {
    insertLines(doc, index, [newLine])
    return
  }
  const last = doc.lines.length - 1
  if (doc.lines[last] === '') {
    insertLines(doc, last, ['', `## ${change.section.trim()}`, newLine])
    return
  }
  doc.eols.push(doc.eol)
  doc.lines.push('', `## ${change.section.trim()}`, newLine, '')
  doc.eols.push(doc.eol, doc.eol, doc.eol)
}

function insertLines(doc: Document, index: number, newLines: readonly string[]): void {
  if (index >= doc.lines.length) {
    doc.eols.push(doc.eol)
    doc.lines.push(...newLines)
    doc.eols.push(...newLines.slice(1).map(() => doc.eol))
    return
  }
  doc.lines.splice(index, 0, ...newLines)
  doc.eols.splice(index, 0, ...newLines.map(() => doc.eol))
}

function removeLines(doc: Document, index: number, count: number): void {
  doc.lines.splice(index, count)
  doc.eols.splice(index, count)
}

const joinDocument = (doc: Document): string => doc.lines.map((line, i) => line + (doc.eols[i] ?? '')).join('')

/** Wendet eine Änderung auf den aktuellen Dateiinhalt an; alle anderen Zeilen bleiben unverändert. */
export function applyTodoChange(markdown: string, change: TodoChange): string {
  const doc = parseDocument(markdown)
  switch (change.kind) {
    case 'add':
      addTask(doc, change)
      break
    case 'toggle': {
      const entry = findEntry(doc, change.id)
      doc.lines[entry.item.line] = toggleLine(doc.lines[entry.item.line] ?? '', entry.item.done, change.today)
      break
    }
    case 'edit': {
      validate(change.text, change.due)
      const entry = findEntry(doc, change.id)
      const box = entry.item.done ? 'x' : ' '
      const body = renderBody(change.text, change.priority, change.due, entry.item.doneDate)
      doc.lines[entry.item.line] = `${entry.leading}${entry.bullet} [${box}] ${body}`
      break
    }
    case 'delete': {
      const entry = findEntry(doc, change.id)
      removeLines(doc, entry.item.line, entry.span)
      break
    }
  }
  return joinDocument(doc)
}
