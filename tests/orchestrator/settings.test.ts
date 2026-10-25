import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../src/main/db/Database'
import { defaultSettings, SettingsService } from '../../src/main/settings/SettingsService'

describe('Orchestrator-Einstellungen', () => {
  it('sind standardmäßig an, mit Rückfrage vor dem Senden', () => {
    const service = new SettingsService(openDatabase(':memory:'), defaultSettings('/home/nutzer', 'linux'))
    expect(service.get().orchestrator).toEqual({ enabled: true, confirmBeforeSend: true })
  })

  it('speichert Änderungen und ergänzt später hinzugekommene Schlüssel', () => {
    const db = openDatabase(':memory:')
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('orchestrator', JSON.stringify({ enabled: false }))
    const service = new SettingsService(db, defaultSettings('/home/nutzer', 'linux'))
    expect(service.get().orchestrator).toEqual({ enabled: false, confirmBeforeSend: true })
    expect(service.update({ orchestrator: { enabled: true, confirmBeforeSend: false } }).orchestrator).toEqual({ enabled: true, confirmBeforeSend: false })
  })
})
