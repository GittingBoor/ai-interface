import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../src/main/db/Database'
import { UsageRepo } from '../../src/main/usage/UsageRepo'
import { UsageCollector } from '../../src/main/usage/UsageCollector'
import { UsageService } from '../../src/main/usage/UsageService'
import { FakeHost, fakeHosts } from '../helpers/FakeHost'

const now = Date.parse('2026-09-26T12:00:00Z')
const line = (id: string, ts: number, sessionId = 's1'): string =>
  JSON.stringify({
    type: 'assistant',
    sessionId,
    cwd: '/p',
    timestamp: new Date(ts).toISOString(),
    message: { id, model: 'claude-haiku-4-5', usage: { input_tokens: 100, output_tokens: 0 } }
  }) + '\n'

function setup(): { service: UsageService; local: FakeHost; mini: FakeHost } {
  const repo = new UsageRepo(openDatabase(':memory:'), () => ({ 'claude-haiku-4-5': { input: 1, output: 1, cacheWrite: 1, cacheRead: 1 } }))
  const local = new FakeHost('local')
  const mini = new FakeHost('mini-pc')
  const service = new UsageService(repo, new UsageCollector(repo), fakeHosts({ local, 'mini-pc': mini }), () => now)
  return { service, local, mini }
}

describe('UsageService', () => {
  it('sammelt beide Hosts und liefert Zeiträume und aktive Sessions', async () => {
    const { service, local, mini } = setup()
    const dir = '/home/alex/.claude/projects/-p'
    local.setFile(`${dir}/a.jsonl`, line('a', now - 5 * 60_000) + line('b', now - 3 * 86_400_000, 's0'))
    mini.setFile(`${dir}/b.jsonl`, line('c', now - 40 * 86_400_000, 's9'))
    const status = await service.refresh()
    expect(status.map((s) => [s.id, s.online, s.lastCollect?.newRecords])).toEqual([
      ['local', true, 2],
      ['mini-pc', true, 1]
    ])
    const o = service.overview()
    expect([o.today.messages, o.week.messages, o.month.messages]).toEqual([1, 2, 2])
    expect(o.activeSessions).toBe(1)
    expect(o.recentSessions[0]?.sessionId).toBe('s1')
  })

  it('markiert einen offline-Host mit Fehlertext, lokale Daten bleiben', async () => {
    const { service, local, mini } = setup()
    local.setFile('/home/alex/.claude/projects/-p/a.jsonl', line('a', now))
    mini.offline = true
    const status = await service.refresh()
    expect(status[1]).toMatchObject({ id: 'mini-pc', online: false, error: expect.stringContaining('nicht erreichbar') })
    expect(service.overview().today.messages).toBe(1)
  })
})
