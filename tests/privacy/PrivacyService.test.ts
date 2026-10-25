import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { PrivacyStatus } from '@shared/privacy'
import { openDatabase } from '../../src/main/db/Database'
import { hashPin, verifyPin } from '../../src/main/privacy/PinHasher'
import { PrivateProjectsRepo } from '../../src/main/privacy/PrivateProjectsRepo'
import { PrivacyService } from '../../src/main/privacy/PrivacyService'
import { defaultSettings, SettingsService } from '../../src/main/settings/SettingsService'
import { InvalidPinError, PinRequiredError, PrivacyLockedError, WrongPinError } from '../../src/main/errors'

const DIARY = 'C:\\Users\\Alex\\OneDrive\\Obsidian Vault\\Programmieren\\Privat\\Tagebuch'

function setup() {
  const db = openDatabase(join(mkdtempSync(join(tmpdir(), 'privacy-')), 'db.sqlite'))
  // Zwei private Ordner wie bei einer bestehenden Installation.
  db.exec(`INSERT INTO private_projects (host, path, label, created_at) VALUES
    ('local', '${DIARY}', 'Tagebuch', 0), ('local', 'D:\\GitHub\\Privat\\Tagebuch-App', 'Tagebuch (Code)', 0)`)
  let clock = 1_000_000
  let pin: string | null = null
  const changes: PrivacyStatus[] = []
  const service = new PrivacyService(new PrivateProjectsRepo(db), { get: () => pin, set: (v) => (pin = v) }, { now: () => clock, onChange: (s) => changes.push(s), knownHosts: () => ['local', 'mini-pc'] })
  return { db, service, changes, advance: (ms: number) => (clock += ms), storedPin: () => pin }
}

describe('PinHasher', () => {
  it('prüft die richtige PIN und lehnt falsche ab', () => {
    const stored = hashPin('1234')
    expect(stored.startsWith('scrypt$')).toBe(true)
    expect(verifyPin('1234', stored)).toBe(true)
    expect(verifyPin('4321', stored)).toBe(false)
  })
})

describe('PrivacyService', () => {
  it('startet gesperrt mit den gespeicherten privaten Ordnern', () => {
    const { service } = setup()
    expect(service.status()).toEqual({ locked: true, hasPin: false, hiddenCount: 2 })
    expect(service.isHidden('local', DIARY)).toBe(true)
    expect(service.isHidden('local', 'd:/github/privat/tagebuch-app/models')).toBe(true)
  })

  it('Unterordner zählen, Nachbarordner und anderer Host nicht', () => {
    const { service } = setup()
    expect(service.isHidden('local', `${DIARY}\\Eintraege 2026`)).toBe(true)
    expect(service.isHidden('local', `${DIARY}-Backup`)).toBe(false)
    expect(service.isHidden('mini-pc', DIARY)).toBe(false)
    expect(service.isHidden('local', null)).toBe(false)
  })

  it('ohne PIN verlangt Entsperren eine neue PIN; setPin entsperrt', () => {
    const { service, storedPin } = setup()
    expect(() => service.unlock('1234')).toThrow(PinRequiredError)
    expect(() => service.setPin(null, '12')).toThrow(InvalidPinError)
    expect(service.setPin(null, '1234')).toEqual({ locked: false, hasPin: true, hiddenCount: 2 })
    expect(storedPin()).toMatch(/^scrypt\$/)
    expect(service.isHidden('local', DIARY)).toBe(false)
  })

  it('Sperren ohne PIN, Entsperren nur mit richtiger PIN', () => {
    const { service } = setup()
    service.setPin(null, '1234')
    service.lock()
    expect(() => service.unlock('0000')).toThrow(WrongPinError)
    expect(service.unlock('1234').locked).toBe(false)
  })

  it('sperrt nach 5 Fehlversuchen für 30 s', () => {
    const { service, advance } = setup()
    service.setPin(null, '1234')
    service.lock()
    for (let i = 0; i < 5; i++) expect(() => service.unlock('0000')).toThrow(WrongPinError)
    expect(() => service.unlock('1234')).toThrow(WrongPinError)
    advance(30_001)
    expect(service.unlock('1234').locked).toBe(false)
  })

  it('PIN ändern verlangt die aktuelle PIN', () => {
    const { service } = setup()
    service.setPin(null, '1234')
    expect(() => service.setPin('9999', '5678')).toThrow(WrongPinError)
    service.setPin('1234', '5678')
    service.lock()
    expect(service.unlock('5678').locked).toBe(false)
  })

  it('Liste nur entsperrt; hinzufügen und entfernen', () => {
    const { service } = setup()
    expect(() => service.list()).toThrow(PrivacyLockedError)
    service.setPin(null, '1234')
    const added = service.add({ host: 'mini-pc', path: '/home/alex/projects/geheim', label: 'Geheim' })
    expect(service.list().map((p) => p.label)).toEqual(['Tagebuch', 'Tagebuch (Code)', 'Geheim'])
    service.remove(added.id)
    expect(service.list()).toHaveLength(2)
    service.lock()
    expect(() => service.add({ host: 'local', path: 'D:\\x', label: 'x' })).toThrow(PrivacyLockedError)
  })

  it('visible() filtert nur, solange gesperrt', () => {
    const { service } = setup()
    const items = [{ host: 'local' as const, path: DIARY }, { host: 'local' as const, path: 'D:\\GitHub\\Projects\\ai-interface' }]
    expect(service.visible(items, (i) => i)).toHaveLength(1)
    service.setPin(null, '1234')
    expect(service.visible(items, (i) => i)).toHaveLength(2)
  })

  it('meldet Änderungen', () => {
    const { service, changes } = setup()
    service.setPin(null, '1234')
    service.lock()
    expect(changes.map((c) => c.locked)).toEqual([false, true])
  })

  it('Settings liefern keine PIN an den Renderer', () => {
    const { db } = setup()
    const settings = new SettingsService(db, defaultSettings('/h', 'linux'))
    db.prepare("INSERT INTO settings (key, value) VALUES ('privacyPin', ?)").run(JSON.stringify(hashPin('1234')))
    expect(Object.keys(settings.get())).not.toContain('privacyPin')
  })
})

describe('PrivacyService – zusätzliche private Pfade', () => {
  const OUTPUT = 'D:\\Data\\Fotos\\output'
  function withExtra(extra: { host: string; path: string }[]): PrivacyService {
    const db = openDatabase(join(mkdtempSync(join(tmpdir(), 'privacy-')), 'db.sqlite'))
    let pin: string | null = hashPin('1234')
    return new PrivacyService(new PrivateProjectsRepo(db), { get: () => pin, set: (v) => (pin = v) }, { now: () => 0, onChange: () => undefined, extraPrivate: () => extra })
  }

  it('blendet gesperrt auch zusätzliche Pfade samt Unterordnern aus', () => {
    const service = withExtra([{ host: 'local', path: OUTPUT }])
    expect(service.isLocked()).toBe(true)
    expect(service.isHidden('local', `${OUTPUT}\\AMD`)).toBe(true)
    expect(service.isHidden('local', 'D:\\Data\\Anderes')).toBe(false)
    service.unlock('1234')
    expect(service.isLocked()).toBe(false)
    expect(service.isHidden('local', `${OUTPUT}\\AMD`)).toBe(false)
  })

  it('verbirgt ohne PIN nichts Zusätzliches und gilt nicht als gesperrt', () => {
    const db = openDatabase(join(mkdtempSync(join(tmpdir(), 'privacy-')), 'db.sqlite'))
    const service = new PrivacyService(new PrivateProjectsRepo(db), { get: () => null, set: () => undefined }, { now: () => 0, onChange: () => undefined, extraPrivate: () => [{ host: 'local', path: OUTPUT }] })
    expect(service.isLocked()).toBe(false)
    expect(service.isHidden('local', `${OUTPUT}\\AMD`)).toBe(false)
  })

  it('zählt zusätzliche Pfade nicht als private Ordner', () => {
    expect(withExtra([{ host: 'local', path: OUTPUT }]).status().hiddenCount).toBe(0)
  })
})
