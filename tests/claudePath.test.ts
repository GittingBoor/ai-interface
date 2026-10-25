import { describe, expect, it } from 'vitest'
import { resolveClaudeExecutable } from '../src/main/claude/claudePath'

describe('resolveClaudeExecutable', () => {
  const exists = (files: readonly string[]) => (p: string): boolean => files.includes(p)

  it('nimmt einen absoluten Pfad direkt, wenn er existiert', () => {
    expect(resolveClaudeExecutable('C:\\tools\\claude.exe', 'win32', exists(['C:\\tools\\claude.exe']), '', 'C:\\Users\\B')).toBe('C:\\tools\\claude.exe')
    expect(resolveClaudeExecutable('/opt/claude', 'linux', exists([]), '', '/home/b')).toBeNull()
  })

  it('sucht unter Windows im PATH mit .exe und .cmd', () => {
    const path = 'C:\\Windows;C:\\Users\\B\\AppData\\Roaming\\npm'
    expect(resolveClaudeExecutable('claude', 'win32', exists(['C:\\Users\\B\\AppData\\Roaming\\npm\\claude.cmd']), path, 'C:\\Users\\B')).toBe(
      'C:\\Users\\B\\AppData\\Roaming\\npm\\claude.cmd'
    )
  })

  it('fällt auf ~/.local/bin zurück', () => {
    expect(resolveClaudeExecutable('claude', 'win32', exists(['C:\\Users\\B\\.local\\bin\\claude.exe']), 'C:\\Windows', 'C:\\Users\\B')).toBe('C:\\Users\\B\\.local\\bin\\claude.exe')
    expect(resolveClaudeExecutable('claude', 'linux', exists(['/home/b/.local/bin/claude']), '/usr/bin', '/home/b')).toBe('/home/b/.local/bin/claude')
  })

  it('nimmt unter Windows keine Kandidaten ohne .exe/.cmd (z. B. einen Ordner namens claude)', () => {
    const files = ['C:\\Users\\B\\AppData\\Local\\claude', 'C:\\Users\\B\\.local\\bin\\claude.exe']
    expect(resolveClaudeExecutable('claude', 'win32', exists(files), 'C:\\Users\\B\\AppData\\Local', 'C:\\Users\\B')).toBe('C:\\Users\\B\\.local\\bin\\claude.exe')
  })

  it('liefert null, wenn nichts gefunden wird', () => {
    expect(resolveClaudeExecutable('claude', 'linux', exists([]), '/usr/bin:/bin', '/home/b')).toBeNull()
  })
})
