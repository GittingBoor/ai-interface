export type SpeechTarget = { readonly kind: 'assistant' } | { readonly kind: 'terminal'; readonly id: string }

export const sameTarget = (a: SpeechTarget | null, b: SpeechTarget | null): boolean =>
  a !== null && b !== null && a.kind === b.kind && (a.kind === 'assistant' || (b.kind === 'terminal' && a.id === b.id))

/** Fügt diktierten Text an der Cursorposition ein, mit Leerzeichen zu angrenzendem Text. */
export function insertAtCursor(value: string, start: number, end: number, spoken: string): { readonly value: string; readonly cursor: number } {
  const before = value.slice(0, start)
  const after = value.slice(end)
  const lead = before !== '' && !/\s$/.test(before) ? ' ' : ''
  const trail = after !== '' && !/^\s/.test(after) ? ' ' : ''
  const inserted = `${lead}${spoken}${trail}`
  return { value: `${before}${inserted}${after}`, cursor: before.length + lead.length + spoken.length + trail.length }
}

export interface HotkeyContext {
  readonly assistantFocused: boolean
  readonly assistantOpen: boolean
  readonly terminalVisible: boolean
  readonly activeTerminalId: string | null
}

/** Ziel des Diktat-Kürzels: Assistent mit Fokus, sonst sichtbares aktives Terminal, sonst offener Assistent. */
export function hotkeyTarget(ctx: HotkeyContext): SpeechTarget | null {
  if (ctx.assistantFocused) return { kind: 'assistant' }
  if (ctx.terminalVisible && ctx.activeTerminalId) return { kind: 'terminal', id: ctx.activeTerminalId }
  if (ctx.assistantOpen) return { kind: 'assistant' }
  return null
}

interface KeyLike {
  readonly key: string
  readonly code: string
  readonly ctrlKey: boolean
  readonly shiftKey: boolean
  readonly altKey: boolean
  readonly metaKey: boolean
  /** Gedrückt gehaltene Taste: Wiederholungen dürfen das Diktat nicht erneut umschalten. */
  readonly repeat: boolean
}

export const isDictationHotkey = (e: KeyLike): boolean => e.code === 'Space' && e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey && !e.repeat
