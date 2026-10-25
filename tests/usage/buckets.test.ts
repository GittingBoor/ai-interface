import { describe, expect, it } from 'vitest'
import { bucketList, bucketStart, formatBucket, previousStart, rangeStart } from '../../src/shared/buckets'

const at = (y: number, m: number, d: number, h = 0): number => new Date(y, m - 1, d, h).getTime()

describe('buckets', () => {
  it('Woche beginnt Montag, lokal', () => {
    expect(bucketStart(at(2026, 10, 18, 23), 'week')).toBe(at(2026, 10, 12))
    expect(bucketStart(at(2026, 10, 12, 0), 'week')).toBe(at(2026, 10, 12))
  })

  it('Tag und Monat', () => {
    expect(bucketStart(at(2026, 10, 18, 23), 'day')).toBe(at(2026, 10, 18))
    expect(bucketStart(at(2026, 10, 18, 23), 'month')).toBe(at(2026, 10, 1))
  })

  it('Zeitraum-Beginn: heute minus (Tage − 1), Gesamt ab Datenbeginn', () => {
    const now = at(2026, 10, 19, 12)
    expect(rangeStart('30d', now, null)).toBe(at(2026, 9, 20))
    expect(rangeStart('7d', now, null)).toBe(at(2026, 10, 13))
    expect(rangeStart('all', now, at(2026, 8, 31, 20))).toBe(at(2026, 8, 31))
    expect(rangeStart('all', now, null)).toBe(at(2026, 10, 19))
  })

  it('Vorzeitraum ist gleich lang und endet am Beginn', () => {
    expect(previousStart('7d', at(2026, 10, 13))).toBe(at(2026, 10, 6))
    expect(previousStart('all', at(2026, 10, 13))).toBeNull()
  })

  it('Liste ist lückenlos und enthält leere Einheiten', () => {
    expect(bucketList(at(2026, 10, 13), at(2026, 10, 19, 12), 'day')).toHaveLength(7)
    expect(bucketList(at(2026, 8, 31), at(2026, 10, 19, 12), 'month').map(formatBucket)).toEqual(['2026-08-01', '2026-09-01', '2026-10-01'])
    expect(bucketList(at(2026, 10, 1), at(2026, 10, 19), 'week').map(formatBucket)).toEqual(['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19'])
  })
})
