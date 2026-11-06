/**
 * Findet deutsche Texte im Quellcode (Heuristik ohne Compiler-API): String- und Template-Literale sowie JSX-Text
 * mit Umlauten, Anführungszeichen „“ oder typischen deutschen Wörtern. Zeilen mit `i18n-ignore` sind ausgenommen.
 */

const IGNORE_MARKER = 'i18n-ignore'
const GERMAN_CHARS = /[äöüÄÖÜß„“]/
const GERMAN_WORDS = /(?<![\p{L}\p{N}_])(?:nicht|keine?|wird|wurde|bitte|Fehler|speichern|löschen|Einstellungen|Projekt|gerade|vor|und|oder|mit)(?![\p{L}\p{N}_])/iu
/** Zeichen vor einem `/`, nach denen ein Regex-Literal beginnen darf (`>`, `<` und `}` bewusst nicht: JSX-Tags). */
const REGEX_PRECEDERS: ReadonlySet<string> = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', ';', '+', '-', '*', '%', '~', '^'])
/** Abschnitte zwischen `}` und `{`, die Code sind (Funktionssignaturen, Kontrollfluss), gelten nicht als JSX-Text. */
const CODE_IN_TEXT = /\b(?:export|function|return|const|let|var|import|interface|async|await|else|catch|try|finally)\b|=>|\b(?:if|for|while|switch)\s*\(/u
/** Text zwischen `>`/`}` und `<`/`{`, ohne Zeichen, die nur in Code vorkommen. */
const JSX_TEXT = /[>}]([^<>{}=;]*\p{L}[^<>{}=;]*)[<{]/gu

export interface ScanFinding {
  readonly line: number
  readonly text: string
}

interface Literal {
  readonly offset: number
  readonly text: string
}

export function isGerman(text: string): boolean {
  return GERMAN_CHARS.test(text) || GERMAN_WORDS.test(text)
}

function literalEnd(source: string, start: number): number {
  const quote = source[start]
  let i = start + 1
  while (i < source.length && source[i] !== quote) {
    if (source[i] === '\\') i++
    if (quote !== '`' && source[i] === '\n') break
    i++
  }
  return i
}

function regexEnd(source: string, start: number): number {
  let inClass = false
  let i = start + 1
  while (i < source.length && source[i] !== '\n') {
    const ch = source[i]
    if (ch === '\\') i++
    else if (ch === '[') inClass = true
    else if (ch === ']') inClass = false
    else if (ch === '/' && !inClass) return i
    i++
  }
  return i
}

/** Zerlegt Quelltext in Literale; Kommentare und Regex-Literale werden übersprungen. */
function literalsOf(source: string): Literal[] {
  const found: Literal[] = []
  let lastSignificant = ''
  let i = 0
  while (i < source.length) {
    const ch = source[i] ?? ''
    const next = source[i + 1] ?? ''
    if (ch === '/' && next === '/') {
      i = source.indexOf('\n', i)
      if (i === -1) break
    } else if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2)
      i = end === -1 ? source.length : end + 2
    } else if (ch === '"' || ch === "'" || ch === '`') {
      const end = literalEnd(source, i)
      found.push({ offset: i, text: source.slice(i + 1, end) })
      i = end + 1
      lastSignificant = ch
    } else if (ch === '/' && next !== '>' && REGEX_PRECEDERS.has(lastSignificant)) {
      i = regexEnd(source, i) + 1
      lastSignificant = ')'
    } else {
      if (!/\s/.test(ch)) lastSignificant = ch
      i++
    }
  }
  return found
}

function blank(text: string): string {
  return text.replace(/[^\n]/g, ' ')
}

/** Ersetzt Literalinhalte und Kommentare durch Leerraum (Zeilenumbrüche und Offsets bleiben). */
function blankedSource(source: string, literals: readonly Literal[]): string {
  let out = source
  for (const literal of literals) {
    out = out.slice(0, literal.offset + 1) + blank(literal.text) + out.slice(literal.offset + 1 + literal.text.length)
  }
  return out.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/\/\/[^\n]*/g, blank)
}

function jsxTexts(source: string, literals: readonly Literal[]): Literal[] {
  const texts: Literal[] = []
  for (const match of blankedSource(source, literals).matchAll(JSX_TEXT)) {
    const raw = match[1] ?? ''
    if (CODE_IN_TEXT.test(raw)) continue
    const lead = raw.length - raw.trimStart().length
    texts.push({ offset: match.index + 1 + lead, text: raw })
  }
  return texts
}

function lineOf(source: string, offset: number): number {
  let line = 1
  for (let i = 0; i < offset; i++) if (source[i] === '\n') line++
  return line
}

export function scanSource(rawSource: string, isTsx: boolean): ScanFinding[] {
  const source = rawSource.replace(/\r\n/g, '\n')
  const lines = source.split('\n')
  const literals = literalsOf(source)
  const candidates = isTsx ? [...literals, ...jsxTexts(source, literals)] : literals
  return candidates
    .filter((c) => isGerman(c.text))
    .map((c) => ({ line: lineOf(source, c.offset), text: c.text.trim().replace(/\s+/g, ' ').slice(0, 80) }))
    .filter((f) => !lines[f.line - 1]?.includes(IGNORE_MARKER))
}
