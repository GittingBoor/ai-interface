export type FrontmatterValue = string | readonly string[]

export interface Frontmatter {
  readonly data: Readonly<Record<string, FrontmatterValue>>
  readonly body: string
}

const DELIMITER = '---'
const KEY_LINE = /^([A-Za-z0-9_-]+):\s*(.*)$/
const LIST_ITEM = /^\s+-\s+(.*)$/
const FOLDED = /^[>|][+-]?$/

const unquote = (value: string): string => {
  const v = value.trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1)
  return v
}

function inlineValue(raw: string): FrontmatterValue {
  const v = raw.trim()
  if (v.startsWith('[') && v.endsWith(']')) {
    return v
      .slice(1, -1)
      .split(',')
      .map(unquote)
      .filter((s) => s.length > 0)
  }
  return unquote(v)
}

/** Teilmenge von YAML, wie sie in Skill-/Agent-Dateien vorkommt: Werte, Listen, gefaltete Texte. */
export function parseFrontmatter(text: string): Frontmatter {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  if (lines[0]?.trim() !== DELIMITER) return { data: {}, body: text }
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === DELIMITER)
  if (end === -1) return { data: {}, body: text }
  const data: Record<string, FrontmatterValue> = {}
  let key: string | null = null
  let mode: 'list' | 'folded' | null = null
  for (const line of lines.slice(1, end)) {
    const item = LIST_ITEM.exec(line)
    if (key && mode === 'list' && item?.[1] !== undefined) {
      data[key] = [...((data[key] as readonly string[] | undefined) ?? []), unquote(item[1])]
      continue
    }
    if (key && mode === 'folded' && /^\s+\S/.test(line)) {
      const previous = data[key]
      data[key] = typeof previous === 'string' && previous ? `${previous} ${line.trim()}` : line.trim()
      continue
    }
    const match = KEY_LINE.exec(line)
    if (!match?.[1]) continue
    key = match[1]
    const value = match[2] ?? ''
    if (value.trim() === '') {
      mode = 'list'
      data[key] = []
    } else if (FOLDED.test(value.trim())) {
      mode = 'folded'
      data[key] = ''
    } else {
      mode = null
      data[key] = inlineValue(value)
    }
  }
  return { data, body: lines.slice(end + 1).join('\n') }
}

/** Wert als Text (Listen mit Komma verbunden). */
export const asText = (value: FrontmatterValue | undefined): string => (value === undefined ? '' : typeof value === 'string' ? value : value.join(', '))

/** Wert als Liste (Text an Kommas getrennt). */
export const asList = (value: FrontmatterValue | undefined): string[] => {
  if (value === undefined) return []
  const list = typeof value === 'string' ? value.split(',') : [...value]
  return list.map((s) => s.trim()).filter((s) => s.length > 0)
}
