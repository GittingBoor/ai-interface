import { describe, expect, it } from 'vitest'
import type { UsageRecord } from '@shared/types'
import { openDatabase } from '../../src/main/db/Database'
import { activeMsByProject } from '../../src/main/usage/sessions'
import { UsageCollector } from '../../src/main/usage/UsageCollector'
import { UsageRepo } from '../../src/main/usage/UsageRepo'
import { UsageService } from '../../src/main/usage/UsageService'
import { fakeHosts } from '../helpers/FakeHost'

const MIN = 60_000
const DAY = 86_400_000
const NOW = Date.parse('2026-09-27T12:00:00Z')

describe('activeMsByProject', () => {
  it('zählt Abstände unter 15 min zum Projekt des späteren Eintrags, Pausen nicht', () => {
    const rows = [
      { sessionId: 's1', project: '/a', host: 'local' as const, ts: 0 },
      { sessionId: 's1', project: '/a', host: 'local' as const, ts: 5 * MIN },
      { sessionId: 's1', project: '/b', host: 'local' as const, ts: 8 * MIN },
      { sessionId: 's1', project: '/b', host: 'local' as const, ts: 40 * MIN },
      { sessionId: 's2', project: '/a', host: 'mini-pc' as const, ts: 1 * MIN },
      { sessionId: 's2', project: '/a', host: 'mini-pc' as const, ts: 3 * MIN }
    ]
    expect(Object.fromEntries(activeMsByProject(rows))).toEqual({
      'local|/a': 5 * MIN,
      'local|/b': 3 * MIN,
      'mini-pc|/a': 2 * MIN
    })
  })
})

describe('UsageService.projectBreakdown', () => {
  const rec = (messageId: string, over: Partial<UsageRecord>): UsageRecord => ({
    messageId,
    sessionId: 's1',
    host: 'local',
    project: '/a',
    model: 'claude-haiku-4-5',
    timestamp: NOW - MIN,
    inputTokens: 1_000_000,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    ...over
  })

  function service(): UsageService {
    const repo = new UsageRepo(openDatabase(':memory:'), () => ({ 'claude-haiku-4-5': { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 } }))
    repo.insertMany([
      rec('a1', { timestamp: NOW - 10 * MIN }),
      rec('a2', { timestamp: NOW - 4 * MIN }),
      rec('b1', { project: '/b', host: 'mini-pc', sessionId: 's2', timestamp: NOW - 2 * MIN }),
      rec('old', { project: '/alt', sessionId: 's3', timestamp: NOW - 20 * DAY })
    ])
    return new UsageService(repo, new UsageCollector(repo), fakeHosts({}), () => NOW)
  }

  it('liefert Zeit, Token, Kosten und Sessions je Projekt im Zeitraum', () => {
    const week = service().projectBreakdown('week', 'all')
    expect(week).toEqual([
      { project: '/a', host: 'local', activeMs: 6 * MIN, totalTokens: 2_000_000, costUsd: 2, sessions: 1 },
      { project: '/b', host: 'mini-pc', activeMs: 0, totalTokens: 1_000_000, costUsd: 1, sessions: 1 }
    ])
  })

  it('filtert nach Host und Zeitraum', () => {
    expect(service().projectBreakdown('week', 'mini-pc').map((p) => p.project)).toEqual(['/b'])
    expect(service().projectBreakdown('all', 'all').map((p) => p.project).sort()).toEqual(['/a', '/alt', '/b'])
    expect(service().projectBreakdown('month', 'local').map((p) => p.project).sort()).toEqual(['/a', '/alt'])
  })
})
