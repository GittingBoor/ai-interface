/** Wie `/terminal-setup`: Meta+Enter (ESC CR) fügt in Claude Code eine neue Zeile ein. */
export const NEWLINE_SEQUENCE = '\x1b\r'

/** Die Felder eines `KeyboardEvent`, die hier zählen (ohne DOM-Typ, damit Tests in Node laufen). */
export interface KeyInfo {
  readonly type: string
  readonly key: string
  readonly shiftKey: boolean
  readonly ctrlKey: boolean
  readonly altKey: boolean
  readonly metaKey: boolean
}

/** Shift/Strg+Enter ohne Alt/Meta: die Kombination, die als Zeilenumbruch gilt. */
export const isNewlineCombo = (e: KeyInfo): boolean => e.key === 'Enter' && !e.altKey && !e.metaKey && (e.shiftKey || e.ctrlKey)

/** Strg+V: xterm würde nur `\x16` senden; der Browser soll ein paste-Ereignis auslösen (Text oder Bild). */
export const isPasteCombo = (e: KeyInfo): boolean => e.key.toLowerCase() === 'v' && e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey

/** Liefert die zu sendende Sequenz, wenn die Taste abweichend von xterm behandelt werden soll. */
export function mapTerminalKey(e: KeyInfo): string | null {
  return e.type === 'keydown' && isNewlineCombo(e) ? NEWLINE_SEQUENCE : null
}
