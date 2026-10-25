import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { MIGRATIONS, openDatabase } from '../../src/main/db/Database'
import { UsageCollector } from '../../src/main/usage/UsageCollector'
import { UsageRepo } from '../../src/main/usage/UsageRepo'
import { FakeHost } from '../helpers/FakeHost'

const JSONL = '/home/alex/.claude/projects/-home-alex-projects-a/s1.jsonl'

const lines = [
  {
    type: 'assistant',
    sessionId: 's1',
    cwd: '/home/alex/projects/a',
    timestamp: '2026-10-01T10:00:00Z',
    message: { id: 'm1', model: 'claude-haiku-4-5', usage: { input_tokens: 1, output_tokens: 2 } }
  },
  { type: 'user', uuid: 'u1', sessionId: 's1', cwd: '/home/alex/projects/a', timestamp: '2026-10-01T09:59:00Z', message: { role: 'user', content: 'Mach A' } },
  { type: 'user', uuid: 'u2', sessionId: 's1', cwd: '/home/alex/projects/a', timestamp: '2026-10-01T10:05:00Z', message: { role: 'user', content: 'Mach B' } }
]
  .map((l) => JSON.stringify(l))
  .join('\n')

const count = (db: Database.Database, table: string): number => (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n

describe('Prompts sammeln', () => {
  it('Collector speichert Prompts und zählt nichts doppelt beim Neueinlesen', async () => {
    const db = openDatabase(':memory:')
    const repo = new UsageRepo(db, () => ({}))
    const host = new FakeHost()
    host.setFile(JSONL, `${lines}\n`)
    const collector = new UsageCollector(repo)
    await collector.collect(host)
    db.exec('DELETE FROM file_offsets')
    await collector.collect(host)
    expect(count(db, 'usage_messages')).toBe(1)
    expect(count(db, 'usage_prompts')).toBe(2)
  })
})

describe('Migration Prompts', () => {
  it('legt usage_prompts an und leert file_offsets, Nachrichten bleiben', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'aii-prompts-')), 'db.sqlite')
    // Migration 8 (Index 7, Nummern im Code 1-basiert) legt usage_prompts an.
    const promptsMigration = 7
    const old = new Database(file)
    MIGRATIONS.slice(0, promptsMigration).forEach((sql) => old.exec(sql))
    old.pragma(`user_version = ${promptsMigration}`)
    old.prepare('INSERT INTO file_offsets (host, path, offset) VALUES (?, ?, ?)').run('local', '/x.jsonl', 42)
    old
      .prepare(
        `INSERT INTO usage_messages (message_id, session_id, host, project, model, ts, input, output, cache_creation, cache_read)
         VALUES ('m', 's', 'local', '/a', 'x', 1, 1, 1, 0, 0)`
      )
      .run()
    old.close()

    const db = openDatabase(file)
    expect(count(db, 'file_offsets')).toBe(0)
    expect(count(db, 'usage_messages')).toBe(1)
    expect(count(db, 'usage_prompts')).toBe(0)
    db.close()
  })
})
