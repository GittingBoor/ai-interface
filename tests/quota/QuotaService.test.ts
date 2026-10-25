import { describe, expect, it } from 'vitest'
import type { QuotaState } from '@shared/types'
import { parseQuota, QUOTA_URL, QuotaService } from '../../src/main/quota/QuotaService'

const NOW = Date.parse('2026-09-27T20:00:00Z')
const TOKEN = 'sk-ant-oat01-GEHEIM'

const SAMPLE = {
  five_hour: { utilization: 32, resets_at: '2026-09-27T23:30:00.355428+00:00' },
  seven_day: { utilization: 42, resets_at: '2026-09-30T23:00:00.355447+00:00' },
  seven_day_opus: null,
  seven_day_sonnet: { utilization: 7, resets_at: null },
  extra_usage: { is_enabled: false }
}

const credentials = (expiresAt: number): string => JSON.stringify({ claudeAiOauth: { accessToken: TOKEN, expiresAt, subscriptionType: 'pro' } })

interface Call {
  readonly url: string
  readonly headers: Record<string, string>
}

function setup(responses: Array<{ status: number; body?: unknown }>, creds: string | null = credentials(NOW + 3_600_000)) {
  const calls: Call[] = []
  const updates: QuotaState[] = []
  let clock = NOW
  const fetchFn = async (url: string, init?: { headers?: Record<string, string> }): Promise<Response> => {
    calls.push({ url, headers: init?.headers ?? {} })
    const next = responses.shift() ?? { status: 500 }
    return new Response(next.body === undefined ? '' : JSON.stringify(next.body), { status: next.status })
  }
  const service = new QuotaService({
    readCredentials: async () => creds,
    fetch: fetchFn,
    now: () => clock,
    onUpdate: (s) => updates.push(s)
  })
  return { service, calls, updates, advance: (ms: number) => (clock += ms) }
}

describe('parseQuota', () => {
  it('liest vorhandene Fenster, lässt null-Fenster weg', () => {
    expect(parseQuota(SAMPLE)).toEqual([
      { kind: 'five_hour', percent: 32, resetsAt: Date.parse('2026-09-27T23:30:00.355Z') },
      { kind: 'seven_day', percent: 42, resetsAt: Date.parse('2026-09-30T23:00:00.355Z') },
      { kind: 'seven_day_sonnet', percent: 7, resetsAt: null }
    ])
  })

  it('wirft bei unbekanntem Format', () => {
    expect(() => parseQuota({ five_hour: { used: 1 } })).toThrow(/Format/)
    expect(() => parseQuota('quatsch')).toThrow(/Format/)
  })
})

describe('QuotaService', () => {
  it('fragt mit Token und Beta-Header ab und liefert die Fenster', async () => {
    const { service, calls, updates } = setup([{ status: 200, body: SAMPLE }])
    const state = await service.refresh()
    expect(calls[0]?.url).toBe(QUOTA_URL)
    expect(calls[0]?.headers['Authorization']).toBe(`Bearer ${TOKEN}`)
    expect(calls[0]?.headers['anthropic-beta']).toBe('oauth-2025-04-20')
    expect(state).toMatchObject({ status: 'ok', fetchedAt: NOW })
    expect(state.status === 'ok' && state.windows.map((w) => w.kind)).toEqual(['five_hour', 'seven_day', 'seven_day_sonnet'])
    expect(updates).toHaveLength(1)
  })

  it('meldet fehlende Anmeldung ohne Netzabruf', async () => {
    const { service, calls } = setup([], null)
    expect(await service.refresh()).toMatchObject({ status: 'unavailable', reason: 'Keine Claude-Anmeldung gefunden.' })
    expect(calls).toHaveLength(0)
  })

  it('erkennt ein abgelaufenes Token ohne Netzabruf und bei 401', async () => {
    const expired = setup([], credentials(NOW - 1))
    expect(await expired.service.refresh()).toMatchObject({ status: 'expired' })
    expect(expired.calls).toHaveLength(0)
    const rejected = setup([{ status: 401 }])
    expect(await rejected.service.refresh()).toMatchObject({ status: 'expired' })
  })

  it('meldet Serverfehler und unbekanntes Format als „keine Quelle“', async () => {
    const { service } = setup([{ status: 500 }, { status: 200, body: { neu: true } }])
    expect(await service.refresh()).toMatchObject({ status: 'unavailable', reason: 'Abfrage fehlgeschlagen (HTTP 500).' })
    expect(await service.refresh()).toMatchObject({ status: 'unavailable', reason: expect.stringMatching(/Format/) })
  })

  it('verdoppelt bei 429 den Abstand bis höchstens 30 Minuten', async () => {
    const { service } = setup(Array.from({ length: 4 }, () => ({ status: 429 })))
    const delays: number[] = []
    for (let i = 0; i < 4; i++) {
      await service.refresh()
      delays.push(service.nextDelayMs())
    }
    expect(delays).toEqual([1_200_000, 1_800_000, 1_800_000, 1_800_000])
  })

  it('behält bei 429 die letzten Werte statt einer Fehlermeldung', async () => {
    const { service, advance } = setup([{ status: 200, body: SAMPLE }, { status: 429 }])
    await service.refresh()
    advance(60_000)
    expect(await service.refresh()).toMatchObject({ status: 'ok', fetchedAt: NOW })
  })

  it('fasst schnelle Anstöße zusammen (höchstens einmal pro Minute)', async () => {
    const { service, calls, advance } = setup([{ status: 200, body: SAMPLE }, { status: 200, body: SAMPLE }])
    await service.refreshSoon()
    await service.refreshSoon()
    expect(calls).toHaveLength(1)
    advance(59_000)
    await service.refreshSoon()
    expect(calls).toHaveLength(1)
    advance(1_000)
    await service.refreshSoon()
    expect(calls).toHaveLength(2)
  })

  it('wartet nach 429 bei automatischen Anstößen den Backoff ab, der Klick fragt sofort', async () => {
    const { service, calls, advance } = setup([{ status: 429 }, { status: 200, body: SAMPLE }])
    await service.refresh()
    advance(5 * 60_000)
    await service.refreshSoon()
    expect(calls).toHaveLength(1)
    expect(await service.refresh()).toMatchObject({ status: 'ok' })
    expect(calls).toHaveLength(2)
  })

  it('verrät das Token in keiner Meldung', async () => {
    const { service } = setup([{ status: 500, body: { error: TOKEN } }])
    const state = await service.refresh()
    expect(JSON.stringify(state)).not.toContain(TOKEN)
  })
})
