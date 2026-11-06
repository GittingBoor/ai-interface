export interface ParsedTask {
  readonly text: string
  readonly done: boolean
}

const SECTION = /^## /
/** Feldname „Offen“ je Sprache (de, en, es, fr, it, ja, zh); Groß-/Kleinschreibung ist egal. */
const OPEN_FIELD_NAMES: readonly string[] = ['Offen', 'Open', 'Pendiente', 'Pendientes', 'À faire', 'Ouvert', 'Aperti', 'Da fare', '未完了', '待办', '未完成']
/** Doppelpunkt: ASCII oder Vollbreite (CJK), innerhalb oder außerhalb der Hervorhebung. */
const COLON = '[:：]'
const OPEN_FIELD = new RegExp(String.raw`^\*\*(?:${OPEN_FIELD_NAMES.join('|')})(?:${COLON}\*\*|\*\*${COLON})[\s\u3000]*(.*)$`, 'i')
const NEXT_FIELD = /^\*\*[^*]+\*\*/
const LIST_ITEM = /^[-*]\s+(?:\[([ xX])\]\s+)?(.+)$/
/** „Nichts offen“ je Sprache. Ganzer Text muss passen (kein ``, das bei CJK nicht greift). */
const NOTHING_WORDS: readonly string[] = [
  '[-–—]',
  'nichts(?: mehr)?(?: offen)?',
  'keine(?:s)?(?: offenen (?:punkte|aufgaben))?', // i18n-ignore: Erkennungsmuster, kein Nutzertext
  'none',
  'nothing',
  'nada',
  'ninguna',
  'ninguno',
  'rien',
  'aucune?',
  'niente',
  'nessuna',
  'nessuno',
  'なし',
  '無し',
  '无',
  '没有'
]
const NOTHING = new RegExp(`^(?:${NOTHING_WORDS.join('|')})[.。]?$`, 'i')

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
  return text.replace(/[*`_]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('de-DE') // i18n-ignore: Vergleichsschlüssel, sprachunabhängig
}
