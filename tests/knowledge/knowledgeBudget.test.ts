import { describe, expect, it } from 'vitest'
import { estimatePercent, fiveHourPercent, selectForRun } from '../../src/main/knowledge/knowledgeBudget'
import type { QuotaState } from '../../src/shared/types'

interface Candidate {
  readonly id: string
  readonly newProtocols: number
  readonly newCommits: number
  readonly lastActivity: number
}

function cand(id: string, newProtocols: number, newCommits: number, lastActivity: number): Candidate {
  return { id, newProtocols, newCommits, lastActivity }
}

describe('knowledgeBudget', () => {
  it('under 70 percent starts all', () => {
    const list = Array.from({ length: 10 }, (_, i) => cand(`p${i}`, 1, 5, i))
    const result = selectForRun(list, 69)
    expect(result.start).toHaveLength(10)
    expect(result.deferred).toHaveLength(0)
  })

  it('null quota starts all', () => {
    const list = [cand('a', 100, 1000, 1), cand('b', 1, 1, 2)]
    expect(selectForRun(list, null).start).toHaveLength(2)
  })

  it('at 80 percent keeps within 15 points, newest first', () => {
    // je 4 Prozentpunkte (2 + 4 * 0.5)
    const list = Array.from({ length: 6 }, (_, i) => cand(`p${i}`, 4, 0, i))
    const result = selectForRun(list, 80)
    expect(result.start.map((c) => c.id)).toEqual(['p5', 'p4', 'p3'])
    expect(result.deferred).toHaveLength(3)
    const sum = result.start.reduce((acc, c) => acc + estimatePercent(c), 0)
    expect(sum).toBeLessThanOrEqual(15)
  })

  it('skips a huge candidate but takes smaller later ones', () => {
    const list = [cand('small-old', 0, 0, 1), cand('huge', 100, 0, 3), cand('small-new', 0, 0, 2)]
    const result = selectForRun(list, 80)
    expect(result.start.map((c) => c.id)).toEqual(['small-new', 'small-old'])
    expect(result.deferred.map((c) => c.id)).toEqual(['huge'])
  })

  it('at 95 percent starts none', () => {
    const list = [cand('a', 0, 0, 1)]
    const result = selectForRun(list, 95)
    expect(result.start).toHaveLength(0)
    expect(result.deferred).toHaveLength(1)
  })

  it('fiveHourPercent picks five_hour window, null for unavailable', () => {
    const ok: QuotaState = {
      status: 'ok',
      fetchedAt: 0,
      windows: [
        { kind: 'seven_day', percent: 10, resetsAt: null },
        { kind: 'five_hour', percent: 42, resetsAt: null },
      ],
    }
    expect(fiveHourPercent(ok)).toBe(42)
    expect(fiveHourPercent({ status: 'ok', fetchedAt: 0, windows: [] })).toBeNull()
    expect(fiveHourPercent({ status: 'loading' })).toBeNull()
    expect(fiveHourPercent({ status: 'unavailable', reason: 'x', hint: 'y', fetchedAt: 0 })).toBeNull()
  })
})
