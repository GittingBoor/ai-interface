import type Database from 'better-sqlite3'
import type { Category, CategoryInput } from '@shared/types'
import { NotFoundError, ValidationError } from '../errors'
import { assertColor, assertIcon } from './validation'

interface CategoryRow {
  readonly id: number
  readonly name: string
  readonly color: string
  readonly icon: string | null
  readonly sort_order: number
}

const toCategory = (r: CategoryRow): Category => ({ id: r.id, name: r.name, color: r.color, icon: r.icon, sortOrder: r.sort_order })

/** Projektarten: anlegen, umbenennen, sortieren, löschen. */
export class CategoriesRepo {
  constructor(private readonly db: Database.Database) {}

  list(): Category[] {
    return (this.db.prepare('SELECT * FROM categories ORDER BY sort_order, id').all() as CategoryRow[]).map(toCategory)
  }

  add(input: CategoryInput): Category {
    const name = this.validName(input.name)
    this.assertUnique(name, null)
    assertColor(input.color)
    assertIcon(input.icon)
    const next = (this.db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM categories').get() as { n: number }).n
    const info = this.db
      .prepare('INSERT INTO categories (name, color, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(name, input.color, input.icon, next, Date.now())
    return this.get(Number(info.lastInsertRowid))
  }

  update(id: number, patch: Partial<CategoryInput>): Category {
    const current = this.get(id)
    const name = patch.name === undefined ? current.name : this.validName(patch.name)
    if (name.toLocaleLowerCase('de-DE') !== current.name.toLocaleLowerCase('de-DE')) this.assertUnique(name, id)
    const color = patch.color ?? current.color
    const icon = patch.icon === undefined ? current.icon : patch.icon
    if (patch.color !== undefined) assertColor(color)
    if (patch.icon !== undefined) assertIcon(icon)
    this.db.prepare('UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?').run(name, color, icon, id)
    return this.get(id)
  }

  /** Löscht die Art; ihre Projekte werden „Ohne Art“. Liefert die Zahl der betroffenen Projekte. */
  remove(id: number): number {
    this.get(id)
    return this.db.transaction(() => {
      const affected = this.db.prepare('UPDATE favorites SET category_id = NULL WHERE category_id = ?').run(id).changes
      this.db.prepare('DELETE FROM categories WHERE id = ?').run(id)
      return affected
    })()
  }

  reorder(ids: readonly number[]): void {
    const stmt = this.db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?')
    this.db.transaction(() => ids.forEach((id, index) => stmt.run(index, id)))()
  }

  private validName(raw: string): string {
    const name = raw.trim()
    if (!name) throw new ValidationError('Der Name der Art darf nicht leer sein.')
    return name
  }

  private assertUnique(name: string, exceptId: number | null): void {
    const row = this.db.prepare('SELECT id FROM categories WHERE name = ? COLLATE NOCASE').get(name) as { id: number } | undefined
    if (row && row.id !== exceptId) throw new ValidationError(`Die Art „${name}“ gibt es schon.`)
  }

  private get(id: number): Category {
    const row = this.db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as CategoryRow | undefined
    if (!row) throw new NotFoundError(`Art ${id}`)
    return toCategory(row)
  }
}
