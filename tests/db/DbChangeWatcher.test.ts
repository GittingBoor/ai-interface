import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { describe, expect, it, vi } from 'vitest'
import { openDatabase } from '../../src/main/db/Database'
import { DbChangeWatcher } from '../../src/main/db/DbChangeWatcher'

describe('DbChangeWatcher', () => {
  it('meldet Commits anderer Verbindungen genau einmal, eigene nicht', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'aii-')), 'db.sqlite')
    const db = openDatabase(file)
    const onChange = vi.fn()
    const watcher = new DbChangeWatcher(db, onChange)
    expect(watcher.check()).toBe(false)
    db.prepare("INSERT INTO settings (key, value) VALUES ('a', '1')").run()
    expect(watcher.check()).toBe(false)
    const other = new Database(file)
    other
      .prepare("INSERT INTO favorites (host, path, name, color, sort_order, created_at) VALUES ('local', 'C:/x', 'X', '#ffffff', 0, 1)")
      .run()
    other.close()
    expect(watcher.check()).toBe(true)
    expect(watcher.check()).toBe(false)
    expect(onChange).toHaveBeenCalledTimes(1)
    db.close()
  })
})
