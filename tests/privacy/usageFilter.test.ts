import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { UsageRecord } from '@shared/types'
import { openDatabase } from '../../src/main/db/Database'
import { UsageRepo } from '../../src/main/usage/UsageRepo'
import { DEFAULT_PRICE_TABLE } from '../../src/main/usage/pricing'

const PRIVATE = 'D:\\GitHub\\Privat\\Tagebuch-App'
const PUBLIC = 'D:\\GitHub\\Projects\\ai-interface'
const NOW = Date.now()

const rec = (id: string, project: string, session: string): UsageRecord => ({
  messageId: id, sessionId: session, host: 'local', project, model: 'claude-opus-5-5', timestamp: NOW - 60_000,
  inputTokens: 100, outputTokens: 10, cacheCreationTokens: 0, cacheReadTokens: 0
})

function setup(hidden: { value: boolean }) {
  const db = openDatabase(join(mkdtempSync(join(tmpdir(), 'usage-priv-')), 'db.sqlite'))
  const repo = new UsageRepo(db, () => DEFAULT_PRICE_TABLE, (_host, project) => hidden.value && project.toLowerCase().startsWith(PRIVATE.toLowerCase()))
  repo.insertMany([rec('a', PUBLIC, 's1'), rec('b', PRIVATE, 's2'), rec('c', `${PRIVATE}\\Werkzeuge`, 's3')])
  return repo
}

describe('UsageRepo mit Privatfilter', () => {
  it('blendet private Projekte aus allen Auswertungen aus', () => {
    const hidden = { value: true }
    const repo = setup(hidden)
    expect(repo.totals(0).totalTokens).toBe(110)
    expect(repo.daily(0).reduce((s, d) => s + d.totalTokens, 0)).toBe(110)
    expect(repo.byProject(0).map((p) => p.project)).toEqual([PUBLIC])
    expect(repo.byModel(0)[0]?.totalTokens).toBe(110)
    expect(repo.heatmap(0).reduce((s, c) => s + c.totalTokens, 0)).toBe(110)
    expect(repo.activityRows(0).map((r) => r.project)).toEqual([PUBLIC])
    expect(repo.sessions(10).map((s) => s.sessionId)).toEqual(['s1'])
    expect(repo.sessions(10, PRIVATE)).toEqual([])
  })

  it('zeigt entsperrt wieder alles', () => {
    const hidden = { value: false }
    const repo = setup(hidden)
    expect(repo.totals(0).totalTokens).toBe(330)
    expect(repo.sessions(10)).toHaveLength(3)
  })
})
