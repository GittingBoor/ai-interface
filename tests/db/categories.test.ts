import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { MIGRATIONS, openDatabase } from '../../src/main/db/Database'
import { CategoriesRepo } from '../../src/main/favorites/CategoriesRepo'
import { FavoritesRepo } from '../../src/main/favorites/FavoritesRepo'
import { ValidationError } from '../../src/main/errors'

/** So trägt das Python-Snippet aus einer Projekt-Checkliste (CLAUDE.md) Projekte ein (ohne die neuen Spalten). */
const PYTHON_SNIPPET_INSERT =
  'insert into favorites (host, path, name, color, sort_order, created_at) values (?, ?, ?, ?, ?, ?)'

describe('Migration 2 (Projektarten)', () => {
  it('ordnet bestehende Favoriten „Programmieren“ zu und markiert sie mit Stern', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'aii-m2-')), 'db.sqlite')
    const v1 = new Database(file)
    v1.exec(MIGRATIONS[0] ?? '')
    v1.pragma('user_version = 1')
    v1.prepare(PYTHON_SNIPPET_INSERT).run('local', 'D:/GitHub/Projects/alt', 'Alt', '#e08a4f', 0, 1)
    v1.close()

    const db = openDatabase(file)
    const categories = new CategoriesRepo(db).list()
    expect(categories.map((c) => c.name)).toEqual(['Programmieren', 'Arbeit', 'Lernen'])
    const [fav] = new FavoritesRepo(db).list()
    expect(fav).toMatchObject({ name: 'Alt', categoryId: categories[0]?.id, starred: true, icon: null })
    db.close()
  })

  it('lässt das Python-Snippet nach der Migration weiter funktionieren', () => {
    const db = openDatabase(':memory:')
    db.prepare(PYTHON_SNIPPET_INSERT).run('local', 'D:/GitHub/Tests/neu', 'Neu', '#8fb573', 0, 2)
    expect(new FavoritesRepo(db).list()[0]).toMatchObject({ name: 'Neu', categoryId: null, starred: true, icon: null })
  })
})

describe('CategoriesRepo', () => {
  let db: Database.Database
  let repo: CategoriesRepo
  beforeEach(() => {
    db = openDatabase(':memory:')
    repo = new CategoriesRepo(db)
  })

  it('legt Arten an und lehnt doppelte Namen ohne Rücksicht auf Groß-/Kleinschreibung ab', () => {
    const created = repo.add({ name: 'Musik', color: '#c77ea8', icon: 'emoji:🎸' })
    expect(created).toMatchObject({ name: 'Musik', color: '#c77ea8', icon: 'emoji:🎸', sortOrder: 3 })
    expect(() => repo.add({ name: 'musik', color: '#c77ea8', icon: null })).toThrow(ValidationError)
    expect(() => repo.add({ name: '  ', color: '#c77ea8', icon: null })).toThrow(ValidationError)
  })

  it('prüft Farbe und Symbol', () => {
    expect(() => repo.add({ name: 'X', color: 'rot', icon: null })).toThrow(ValidationError)
    expect(() => repo.add({ name: 'X', color: '#123456', icon: 'lucide:Keine Gültigkeit' })).toThrow(ValidationError)
  })

  it('benennt um und sortiert', () => {
    const [a, b] = repo.list()
    repo.update(a?.id ?? 0, { name: 'Code' })
    repo.reorder([b?.id ?? 0, a?.id ?? 0])
    expect(repo.list().map((c) => c.name)).toEqual(['Arbeit', 'Code', 'Lernen'])
  })

  it('löscht eine Art und setzt ihre Projekte auf „Ohne Art“', () => {
    const favorites = new FavoritesRepo(db)
    const uni = repo.list().find((c) => c.name === 'Lernen')
    const fav = favorites.add({ host: 'local', path: 'D:/GitHub/Uni/x', name: 'X', color: '#6f9bd8', categoryId: uni?.id ?? null })
    expect(repo.remove(uni?.id ?? 0)).toBe(1)
    expect(favorites.list().find((f) => f.id === fav.id)?.categoryId).toBeNull()
  })
})

describe('FavoritesRepo (Arten, Stern, Symbol)', () => {
  it('speichert Art, Stern und Symbol und prüft die Farbe', () => {
    const db = openDatabase(':memory:')
    const repo = new FavoritesRepo(db)
    const fav = repo.add({ host: 'local', path: 'D:/a', name: 'A', color: '#e08a4f', icon: 'lucide:guitar', starred: false })
    expect(fav).toMatchObject({ icon: 'lucide:guitar', starred: false, categoryId: null })
    expect(repo.update(fav.id, { starred: true, icon: null, color: '#ABCDEF' })).toMatchObject({ starred: true, icon: null, color: '#ABCDEF' })
    expect(() => repo.update(fav.id, { color: 'blau' })).toThrow(ValidationError)
    expect(() => repo.add({ host: 'local', path: 'D:/b', name: 'B', color: '#zzzzzz' })).toThrow(ValidationError)
  })
})
