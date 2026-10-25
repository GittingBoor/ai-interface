import { describe, expect, it } from 'vitest'
import { computeSessions } from '../../src/main/usage/sessions'
import type { UsageRecord } from '@shared/types'

const MINUTE = 60_000
const base = Date.parse('2026-09-26T10:00:00Z')

const rec = (messageId: string, offsetMin: number, sessionId = 's1', project = '/p'): UsageRecord => ({
  messageId,
  sessionId,
  host: 'local',
  project,
  model: 'claude-opus-5-5',
  timestamp: base + offsetMin * MINUTE,
  inputTokens: 1,
  outputTokens: 2,
  cacheCreationTokens: 3,
  cacheReadTokens: 4
})

describe('computeSessions', () => {
  it('berechnet Dauer und aktive Zeit (Lücken ab 15 min zählen nicht)', () => {
    const [s] = computeSessions([rec('a', 0), rec('b', 5), rec('c', 40)])
    expect(s?.startedAt).toBe(base)
    expect(s?.endedAt).toBe(base + 40 * MINUTE)
    expect(s?.activeMs).toBe(5 * MINUTE)
    expect(s?.messages).toBe(3)
    expect(s?.totalTokens).toBe(30)
  })

  it('zählt doppelte Nachrichten-IDs nur einmal', () => {
    const [s] = computeSessions([rec('a', 0), rec('a', 0), rec('b', 1)])
    expect(s?.messages).toBe(2)
  })

  it('trennt Sessions und sortiert die neueste zuerst', () => {
    const sessions = computeSessions([rec('a', 0, 's1'), rec('b', 60, 's2', '/q')])
    expect(sessions.map((s) => s.sessionId)).toEqual(['s2', 's1'])
    expect(sessions[0]?.project).toBe('/q')
  })
})
