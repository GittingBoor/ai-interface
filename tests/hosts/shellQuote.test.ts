import { describe, expect, it } from 'vitest'
import { powershellQuote, shellQuote } from '../../src/main/hosts/shellQuote'

describe('shellQuote', () => {
  it('setzt Pfade mit Leerzeichen und Umlauten in einfache Anführungszeichen', () => {
    expect(shellQuote('/home/alex/OneDrive/Obsidian Vault/Übersicht')).toBe("'/home/alex/OneDrive/Obsidian Vault/Übersicht'")
  })

  it('maskiert einfache Anführungszeichen', () => {
    expect(shellQuote("Alexs 'Projekt'")).toBe("'Alexs '\\''Projekt'\\'''")
  })

  it('neutralisiert Befehlssubstitution', () => {
    expect(shellQuote('$(rm -rf ~)')).toBe("'$(rm -rf ~)'")
  })
})

describe('powershellQuote', () => {
  it('verdoppelt einfache Anführungszeichen', () => {
    expect(powershellQuote("C:\\Users\\Alex\\Alexs 'Ordner'")).toBe("'C:\\Users\\Alex\\Alexs ''Ordner'''")
  })
})
