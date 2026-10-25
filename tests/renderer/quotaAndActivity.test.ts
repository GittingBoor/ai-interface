import { describe, expect, it } from 'vitest'
import type { QuotaState } from '@shared/types'
import { fiveHourAvailability, orderedWindows, quotaLevel, QUOTA_STALE_MS } from '../../src/renderer/src/lib/quota'
import { formatAge, formatCountdown } from '../../src/renderer/src/lib/format'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

describe('Kontingent', () => {
  const now = 1_000_000_000_000
  const ok = (percent: number, resetsAt: number | null, fetchedAt = now): QuotaState => ({
    status: 'ok',
    windows: [{ kind: 'five_hour', percent, resetsAt }],
    fetchedAt
  })

  it('stuft ab 80 % als Warnung und ab 95 % als Gefahr ein', () => {
    expect(quotaLevel(79)).toBe('normal')
    expect(quotaLevel(80)).toBe('warn')
    expect(quotaLevel(95)).toBe('danger')
  })

  it('ordnet 5 Std. vor Woche vor Opus', () => {
    const kinds = orderedWindows([
      { kind: 'seven_day_opus', percent: 1, resetsAt: null },
      { kind: 'seven_day', percent: 1, resetsAt: null },
      { kind: 'five_hour', percent: 1, resetsAt: null }
    ]).map((w) => w.kind)
    expect(kinds).toEqual(['five_hour', 'seven_day', 'seven_day_opus'])
  })

  it('meldet voll bis zum Reset, danach frei', () => {
    expect(fiveHourAvailability(ok(100, now + HOUR), now)).toEqual({ kind: 'full', resetsAt: now + HOUR })
    expect(fiveHourAvailability(ok(100, now - 1), now)).toEqual({ kind: 'free', percent: 0 })
    expect(fiveHourAvailability(ok(40, now + HOUR), now)).toEqual({ kind: 'free', percent: 40 })
  })

  it('zeigt veraltete Stände und fehlende Quellen nie als aktuell', () => {
    expect(fiveHourAvailability(ok(40, now + HOUR, now - QUOTA_STALE_MS - 1), now)).toEqual({ kind: 'unknown' })
    expect(fiveHourAvailability({ status: 'expired', reason: 'x', hint: 'y', fetchedAt: now }, now)).toEqual({ kind: 'unknown' })
  })
})

describe('formatCountdown / formatAge', () => {
  it('formatiert Restzeiten', () => {
    expect(formatCountdown(45_000)).toBe('45 s')
    expect(formatCountdown(12 * MINUTE + 5_000)).toBe('12 Min. 05 s')
    expect(formatCountdown(HOUR + 12 * MINUTE + 30_000)).toBe('1 Std. 12 Min.')
    expect(formatCountdown(73 * HOUR)).toBe('3 Tg. 1 Std.')
    expect(formatCountdown(-5)).toBe('0 s')
  })

  it('zeigt das Alter in der ersten Minute sekundengenau', () => {
    expect(formatAge(0, 20_000)).toBe('vor 20 s')
    expect(formatAge(0, 5 * MINUTE)).toBe('vor 5 Min.')
  })
})
