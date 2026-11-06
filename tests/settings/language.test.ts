import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../src/main/db/Database'
import { defaultSettings, SettingsService } from '../../src/main/settings/SettingsService'

describe('Spracheinstellung', () => {
  it('hat den Standard „system“', () => {
    expect(defaultSettings('/home/nutzer', 'linux').language).toBe('system')
  })

  it('liefert „system“ für eine bestehende Datenbank ohne Schlüssel', () => {
    const db = openDatabase(':memory:')
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('todoFile', JSON.stringify('X.md'))
    const service = new SettingsService(db, defaultSettings('/home/nutzer', 'linux'))
    expect(service.get().language).toBe('system')
  })

  it('speichert die Sprache und meldet jede Änderung', () => {
    const seen: string[] = []
    const service = new SettingsService(openDatabase(':memory:'), defaultSettings('/home/nutzer', 'linux'), (s) => seen.push(s.language))
    expect(service.update({ language: 'ja' }).language).toBe('ja')
    expect(service.get().language).toBe('ja')
    expect(seen).toEqual(['ja'])
  })
})
