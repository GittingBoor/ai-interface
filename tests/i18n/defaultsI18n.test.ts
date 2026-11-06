import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase } from '../../src/main/db/Database'
import { setMainLanguage } from '../../src/main/i18n'
import { CategoriesRepo } from '../../src/main/favorites/CategoriesRepo'
import { defaultSettings, SettingsService } from '../../src/main/settings/SettingsService'

const storedKeys = (service: SettingsService, db: ReturnType<typeof openDatabase>): string[] => {
  service.migrate()
  return (db.prepare('SELECT key FROM settings').all() as { key: string }[]).map((r) => r.key)
}

describe('Standardwerte neuer Installationen', () => {
  afterEach(() => setMainLanguage('de'))

  it('legt Startarten und Protokollordner einer frischen Installation in der Sprache an', () => {
    setMainLanguage('en')
    const db = openDatabase(':memory:')
    const service = new SettingsService(db, defaultSettings('/home/nutzer', 'linux'))
    service.migrate()
    expect(new CategoriesRepo(db).list().map((c) => c.name)).toEqual(['Coding', 'Work', 'Learning'])
    expect(service.get().protocolDir).toBe('Logs')
  })

  it('speichert auf Deutsch weiter „Protokolle“', () => {
    const db = openDatabase(':memory:')
    const service = new SettingsService(db, defaultSettings('/home/nutzer', 'linux'))
    service.migrate()
    expect(service.get().protocolDir).toBe('Protokolle')
  })

  it('lässt bestehende Installationen unangetastet', () => {
    setMainLanguage('en')
    const db = openDatabase(':memory:')
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('todoFile', JSON.stringify('X.md'))
    const service = new SettingsService(db, defaultSettings('/home/nutzer', 'linux'))
    expect(storedKeys(service, db)).toEqual(['todoFile'])
    expect(service.get().protocolDir).toBe('Protokolle')
  })
})
