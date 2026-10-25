import type Database from 'better-sqlite3'
import type { HostId } from '@shared/types'
import type { PrivateProject, PrivateProjectInput } from '@shared/privacy'
import { ValidationError } from '../errors'

interface Row {
  readonly id: number
  readonly host: HostId
  readonly path: string
  readonly label: string
}

export class PrivateProjectsRepo {
  constructor(private readonly db: Database.Database) {}

  list(): PrivateProject[] {
    return (this.db.prepare('SELECT id, host, path, label FROM private_projects ORDER BY id').all() as Row[]).map((r) => ({ ...r }))
  }

  add(input: PrivateProjectInput): PrivateProject {
    try {
      const info = this.db.prepare('INSERT INTO private_projects (host, path, label, created_at) VALUES (?, ?, ?, ?)').run(input.host, input.path, input.label, Date.now())
      return { id: Number(info.lastInsertRowid), ...input }
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE')) throw new ValidationError('Dieser Ordner ist bereits privat.')
      throw error
    }
  }

  remove(id: number): void {
    this.db.prepare('DELETE FROM private_projects WHERE id = ?').run(id)
  }
}
