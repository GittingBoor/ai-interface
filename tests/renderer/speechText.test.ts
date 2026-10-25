import { describe, expect, it } from 'vitest'
import { hotkeyTarget, insertAtCursor, isDictationHotkey, sameTarget } from '../../src/renderer/src/lib/speechText'

describe('insertAtCursor', () => {
  it('fügt in leeres Feld ein', () => {
    expect(insertAtCursor('', 0, 0, 'Hallo')).toEqual({ value: 'Hallo', cursor: 5 })
  })
  it('setzt Leerzeichen zu vorhandenem Text', () => {
    expect(insertAtCursor('Lies', 4, 4, 'die Datei')).toEqual({ value: 'Lies die Datei', cursor: 14 })
    expect(insertAtCursor('Datei lesen', 0, 0, 'Bitte')).toEqual({ value: 'Bitte Datei lesen', cursor: 6 })
  })
  it('ersetzt eine Auswahl', () => {
    expect(insertAtCursor('a XXX b', 2, 5, 'neu')).toEqual({ value: 'a neu b', cursor: 5 })
  })
})

describe('hotkeyTarget', () => {
  const base = { assistantFocused: false, assistantOpen: false, terminalVisible: false, activeTerminalId: null }
  it('Assistent mit Fokus hat Vorrang', () => {
    expect(hotkeyTarget({ ...base, assistantFocused: true, terminalVisible: true, activeTerminalId: 't1' })).toEqual({ kind: 'assistant' })
  })
  it('sonst aktives Terminal, wenn sichtbar', () => {
    expect(hotkeyTarget({ ...base, terminalVisible: true, activeTerminalId: 't1', assistantOpen: true })).toEqual({ kind: 'terminal', id: 't1' })
  })
  it('sonst offener Assistent, sonst nichts', () => {
    expect(hotkeyTarget({ ...base, assistantOpen: true })).toEqual({ kind: 'assistant' })
    expect(hotkeyTarget(base)).toBeNull()
  })
})

describe('isDictationHotkey / sameTarget', () => {
  const key = { key: ' ', code: 'Space', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false, repeat: false }
  it('erkennt nur Strg+Shift+Leertaste', () => {
    expect(isDictationHotkey(key)).toBe(true)
    expect(isDictationHotkey({ ...key, shiftKey: false })).toBe(false)
    expect(isDictationHotkey({ ...key, altKey: true })).toBe(false)
    expect(isDictationHotkey({ ...key, repeat: true })).toBe(false)
  })
  it('vergleicht Ziele', () => {
    expect(sameTarget({ kind: 'terminal', id: 'a' }, { kind: 'terminal', id: 'a' })).toBe(true)
    expect(sameTarget({ kind: 'terminal', id: 'a' }, { kind: 'terminal', id: 'b' })).toBe(false)
    expect(sameTarget({ kind: 'assistant' }, null)).toBe(false)
  })
})
