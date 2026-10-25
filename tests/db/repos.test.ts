import { mkdtempSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import type { UsageRecord } from '@shared/types'
import { openDatabase } from '../../src/main/db/Database'
import { UsageRepo } from '../../src/main/usage/UsageRepo'
import { FavoritesRepo } from '../../src/main/favorites/FavoritesRepo'
import { CustomModelRepo } from '../../src/main/models/CustomModelRepo'
import { ImageStore } from '../../src/main/images/ImageStore'
import { defaultSettings, SettingsService } from '../../src/main/settings/SettingsService'

const HOUR = 3_600_000
const noon = (day: string): number => new Date(`${day}T12:00:00`).getTime()

const rec = (messageId: string, ts: number, over: Partial<UsageRecord> = {}): UsageRecord => ({
  messageId,
  sessionId: 's1',
  host: 'local',
  project: '/p/a',
  model: 'claude-haiku-4-5',
  timestamp: ts,
  inputTokens: 1_000_000,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  ...over
})

let db: Database.Database
beforeEach(() => {
  db = openDatabase(':memory:')
})

describe('UsageRepo', () => {
  const prices = { 'claude-haiku-4-5': { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 } }

  it('zählt doppelt eingefügte Nachrichten nur einmal', () => {
    const repo = new UsageRepo(db, () => prices)
    expect(repo.insertMany([rec('a', noon('2026-09-25')), rec('a', noon('2026-09-25'))])).toBe(1)
    expect(repo.insertMany([rec('a', noon('2026-09-25'))])).toBe(0)
    expect(repo.totals(0).messages).toBe(1)
  })

  it('berechnet Summen, Kosten und markiert unbepreiste Modelle', () => {
    const repo = new UsageRepo(db, () => prices)
    repo.insertMany([rec('a', noon('2026-09-25')), rec('b', noon('2026-09-25'), { model: 'unbekannt' })])
    const t = repo.totals(0)
    expect(t.totalTokens).toBe(2_000_000)
    expect(t.costUsd).toBe(1)
    expect(t.hasUnpriced).toBe(true)
  })

  it('aggregiert nach lokalem Tag, Projekt, Modell und Heatmap', () => {
    const repo = new UsageRepo(db, () => prices)
    const d1 = noon('2026-09-24')
    const d2 = noon('2026-09-25')
    repo.insertMany([
      rec('a', d1),
      rec('b', d2),
      rec('c', d2 + HOUR, { project: '/p/b', sessionId: 's2', host: 'mini-pc' })
    ])
    expect(repo.daily(0).map((d) => [d.day, d.host, d.totalTokens])).toEqual([
      ['2026-09-24', 'local', 1_000_000],
      ['2026-09-25', 'local', 1_000_000],
      ['2026-09-25', 'mini-pc', 1_000_000]
    ])
    const projects = repo.byProject(0)
    expect(projects.map((p) => [p.project, p.messages, p.sessions])).toEqual([
      ['/p/b', 1, 1],
      ['/p/a', 2, 1]
    ])
    expect(repo.byModel(0)[0]).toMatchObject({ model: 'claude-haiku-4-5', messages: 3, costUsd: 3 })
    const cell = repo.heatmap(0).find((c) => c.hour === 13)
    expect(cell).toMatchObject({ weekday: (new Date(d2).getDay() + 6) % 7, totalTokens: 1_000_000 })
  })

  it('liefert Sessions mit Kosten, optional gefiltert nach Projekt', () => {
    const repo = new UsageRepo(db, () => prices)
    repo.insertMany([rec('a', noon('2026-09-25')), rec('b', noon('2026-09-25'), { sessionId: 's2', project: '/p/b' })])
    expect(repo.sessions(10).map((s) => s.sessionId).sort()).toEqual(['s1', 's2'])
    const [only] = repo.sessions(10, '/p/b')
    expect(only).toMatchObject({ sessionId: 's2', costUsd: 1 })
  })

  it('speichert Datei-Offsets je Host und Pfad', () => {
    const repo = new UsageRepo(db, () => prices)
    expect(repo.getOffset('local', '/x.jsonl')).toBe(0)
    repo.setOffset('local', '/x.jsonl', 42)
    expect(repo.getOffset('local', '/x.jsonl')).toBe(42)
    expect(repo.getOffset('mini-pc', '/x.jsonl')).toBe(0)
  })
})

describe('FavoritesRepo', () => {
  it('legt an, sortiert, ändert und löscht', () => {
    const repo = new FavoritesRepo(db)
    const a = repo.add({ host: 'local', path: '/a', name: 'A', color: '#f00' })
    const b = repo.add({ host: 'mini-pc', path: '/b', name: 'B', color: '#0f0' })
    expect(repo.list().map((f) => f.name)).toEqual(['A', 'B'])
    repo.reorder([b.id, a.id])
    expect(repo.list().map((f) => f.name)).toEqual(['B', 'A'])
    repo.update(a.id, { name: 'A2' })
    expect(repo.list()[1]?.name).toBe('A2')
    repo.remove(b.id)
    expect(repo.list()).toHaveLength(1)
  })

  it('lehnt doppelte Ordner auf demselben Host ab', () => {
    const repo = new FavoritesRepo(db)
    repo.add({ host: 'local', path: '/a', name: 'A', color: '#f00' })
    expect(() => repo.add({ host: 'local', path: '/a', name: 'X', color: '#f00' })).toThrow(/bereits/)
  })
})

describe('CustomModelRepo', () => {
  it('legt an und aktualisiert per upsert', () => {
    const repo = new CustomModelRepo(db)
    const m = repo.upsert({ name: 'YourMT3', host: 'local', path: 'D:/models', kind: 'Transkription', note: '', status: 'aktiv' })
    repo.upsert({ ...m, status: 'archiviert' })
    expect(repo.list()).toEqual([expect.objectContaining({ id: m.id, status: 'archiviert' })])
    repo.remove(m.id)
    expect(repo.list()).toEqual([])
  })
})

describe('ImageStore', () => {
  it('speichert Datei und Metadaten, filtert nach Projekt und löscht', () => {
    const dir = mkdtempSync(join(tmpdir(), 'aii-img-'))
    const store = new ImageStore(db, dir)
    const img = store.add(new Uint8Array([1, 2, 3]), { title: 'Screenshot', project: '/p/a', tags: ['ui'], extension: 'PNG' })
    expect(readFileSync(store.filePath(img.id))).toEqual(Buffer.from([1, 2, 3]))
    expect(store.list('/p/a')).toHaveLength(1)
    expect(store.list('/p/b')).toHaveLength(0)
    expect(img.tags).toEqual(['ui'])
    store.remove(img.id)
    expect(existsSync(join(dir, img.fileName))).toBe(false)
  })

  it('lehnt unbekannte Dateitypen ab', () => {
    const store = new ImageStore(db, mkdtempSync(join(tmpdir(), 'aii-img-')))
    expect(() => store.add(new Uint8Array([1]), { title: 'x', project: null, tags: [], extension: 'exe' })).toThrow(/Dateityp/)
  })
})

describe('SettingsService', () => {
  it('liefert Standardwerte und speichert Änderungen', () => {
    const service = new SettingsService(db, defaultSettings('/home/alex', 'linux'))
    expect(service.get().vault.path).toBe('')
    expect(service.get().devices).toEqual([])
    expect(service.get().setupDone).toBe(false)
    service.update({ claudeCommand: 'claude --verbose' })
    expect(new SettingsService(db, defaultSettings('/home/alex', 'linux')).get().claudeCommand).toBe('claude --verbose')
  })

  it('setzt unter Windows Pfade mit Backslash', () => {
    expect(defaultSettings('C:\\Users\\Ich', 'win32').projectsRoot).toBe('C:\\Users\\Ich\\Projects')
  })

  it('übernimmt die frühere Mini-PC-Verbindung als Gerät; ohne eigene Pfade kommt einmal die Einrichtung', () => {
    const legacy = { enabled: true, host: '10.0.0.5', port: 22, user: 'ich', privateKeyPath: '/k', hostFingerprint: 'fp' }
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('miniPc', JSON.stringify(legacy))
    const service = new SettingsService(db, defaultSettings('/home/ich', 'linux'))
    service.migrate()
    expect(service.get().devices).toEqual([{ ...legacy, id: 'mini-pc', name: 'Mini-PC', icon: 'lucide:server', projectsDir: '~/projects', color: '#5fb37a' }])
    expect(service.get().setupDone).toBe(false)
    expect(db.prepare('SELECT 1 FROM settings WHERE key = ?').get('miniPc')).toBeUndefined()
    service.migrate()
    expect(service.get().devices).toHaveLength(1)
  })

  it('gilt als eingerichtet, wenn Vault und Projektordner schon gespeichert sind', () => {
    const service = new SettingsService(db, defaultSettings('/home/ich', 'linux'))
    service.update({ vault: { host: 'local', path: '/v' }, projectsRoot: '/p' })
    service.migrate()
    expect(service.get().setupDone).toBe(true)
  })

  it('zeigt bei einer neuen Installation die Einrichtung', () => {
    const service = new SettingsService(db, defaultSettings('/home/ich', 'linux'))
    service.migrate()
    expect(service.get().setupDone).toBe(false)
  })
})
