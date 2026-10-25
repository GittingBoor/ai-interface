import { expect, it } from 'vitest'
import { openDatabase } from '../../src/main/db/Database'
import { UsageRepo } from '../../src/main/usage/UsageRepo'
import { UsageCollector } from '../../src/main/usage/UsageCollector'
import { UsageService } from '../../src/main/usage/UsageService'
import { fakeHosts } from '../helpers/FakeHost'

it('projects(days) berücksichtigt nur den Zeitraum', () => {
  const now = Date.parse('2026-09-26T12:00:00Z')
  const repo = new UsageRepo(openDatabase(':memory:'), () => ({}))
  const base = { sessionId: 's', host: 'local' as const, model: 'm', inputTokens: 1, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 }
  repo.insertMany([
    { ...base, messageId: 'a', project: '/neu', timestamp: now - 86_400_000 },
    { ...base, messageId: 'b', project: '/alt', timestamp: now - 20 * 86_400_000 }
  ])
  const service = new UsageService(repo, new UsageCollector(repo), fakeHosts({}), () => now)
  expect(service.projects(7).map((p) => p.project)).toEqual(['/neu'])
  expect(service.sessions(5)).toHaveLength(1)
})
