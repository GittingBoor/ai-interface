import { describe, expect, it } from 'vitest'
import { isCopyCombo, isPasteCombo, mapTerminalKey, NEWLINE_SEQUENCE } from '../../src/renderer/src/lib/terminalKeys'

type KeyInfo = Parameters<typeof mapTerminalKey>[0]

const key = (over: Partial<KeyInfo>): KeyInfo => ({
  type: 'keydown',
  key: 'Enter',
  shiftKey: false,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  ...over
})

describe('mapTerminalKey', () => {
  it('Shift+Enter und Strg+Enter erzeugen ESC+CR', () => {
    expect(mapTerminalKey(key({ shiftKey: true }))).toBe(NEWLINE_SEQUENCE)
    expect(mapTerminalKey(key({ ctrlKey: true }))).toBe(NEWLINE_SEQUENCE)
  })

  it('Enter allein, Alt+Enter, keyup und andere Tasten bleiben unverändert', () => {
    expect(mapTerminalKey(key({}))).toBeNull()
    expect(mapTerminalKey(key({ altKey: true, shiftKey: true }))).toBeNull()
    expect(mapTerminalKey(key({ type: 'keyup', shiftKey: true }))).toBeNull()
    expect(mapTerminalKey(key({ key: 'a', ctrlKey: true }))).toBeNull()
  })
})

describe('isPasteCombo', () => {
  it('Strg+V geht an den Browser, damit ein paste-Ereignis entsteht', () => {
    expect(isPasteCombo(key({ key: 'v', ctrlKey: true }))).toBe(true)
    expect(isPasteCombo(key({ key: 'V', ctrlKey: true }))).toBe(true)
    expect(isPasteCombo(key({ type: 'keyup', key: 'v', ctrlKey: true }))).toBe(true)
  })

  it('andere Kombinationen bleiben bei xterm', () => {
    expect(isPasteCombo(key({ key: 'v' }))).toBe(false)
    expect(isPasteCombo(key({ key: 'v', ctrlKey: true, altKey: true }))).toBe(false)
    expect(isPasteCombo(key({ key: 'v', ctrlKey: true, shiftKey: true }))).toBe(false)
    expect(isPasteCombo(key({ key: 'c', ctrlKey: true }))).toBe(false)
  })
})

describe('isCopyCombo', () => {
  it('Strg+C mit Auswahl und Strg+Umschalt+C kopieren', () => {
    expect(isCopyCombo(key({ key: 'c', ctrlKey: true }), true)).toBe(true)
    expect(isCopyCombo(key({ key: 'C', ctrlKey: true, shiftKey: true }), false)).toBe(true)
    expect(isCopyCombo(key({ type: 'keyup', key: 'c', ctrlKey: true }), true)).toBe(true)
  })

  it('Strg+C ohne Auswahl bleibt Abbruch, andere Kombinationen bleiben bei xterm', () => {
    expect(isCopyCombo(key({ key: 'c', ctrlKey: true }), false)).toBe(false)
    expect(isCopyCombo(key({ key: 'c' }), true)).toBe(false)
    expect(isCopyCombo(key({ key: 'c', ctrlKey: true, altKey: true }), true)).toBe(false)
    expect(isCopyCombo(key({ key: 'v', ctrlKey: true }), true)).toBe(false)
  })
})
