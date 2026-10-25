import { beforeEach, describe, expect, it, vi } from 'vitest'
import type Database from 'better-sqlite3'
import type { AnalyticsQuery, HostId, PromptRecord, UsageRecord } from '@shared/types'
import { openDatabase } from '../../src/main/db/Database'
import { UsageRepo } from '../../src/main/usage/UsageRepo'
import { UsageAnalytics } from '../../src/main/usage/UsageAnalytics'
import { formatBucket } from '../../src/shared/buckets'

const NOW = new Date(2026, 9, 19, 12).getTime()
/** Lokaler Zeitpunkt `n` Tage vor heute. */
const day = (n: number, h: number, m = 0): number => new Date(2026, 9, 19 - n, h, m).getTime()
const PRICES = { 'claude-haiku-4-5': { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 } }

const rec = (messageId: string, ts: number, over: Partial<UsageRecord> = {}): UsageRecord => ({
  messageId,
  sessionId: messageId,
  host: 'local',
  project: '/a',
  model: 'claude-haiku-4-5',
  timestamp: ts,
  inputTokens: 1_000_000,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  ...over
})

const prompt = (uuid: string, ts: number, over: Partial<PromptRecord> = {}): PromptRecord => ({
  uuid,
  sessionId: 's',
  host: 'local',
  project: '/a',
  timestamp: ts,
  chars: 10,
  ...over
})

const base: AnalyticsQuery = { range: '7d', host: 'all', split: 'project', resolution: 'day', projects: null, excludedProjects: [], models: null }

let db: Database.Database
let repo: UsageRepo
let hidden: (host: HostId, project: string) => boolean
let analytics: UsageAnalytics
beforeEach(() => {
  db = openDatabase(':memory:')
  hidden = () => false
  repo = new UsageRepo(db, () => PRICES, (h, p) => hidden(h, p))
  analytics = new UsageAnalytics(db, () => PRICES, () => NOW)
})

describe('UsageAnalytics', () => {
  it('liefert alle Kennzahlen je Zeiteinheit und Serie', () => {
    repo.insertMany([rec('m1', day(0, 10)), rec('m2', day(2, 10), { project: '/b', inputTokens: 2_000_000 })])
    repo.insertPrompts([prompt('u1', day(0, 9)), prompt('u2', day(0, 9, 30)), prompt('u3', day(2, 9), { project: '/b' })])
    const r = analytics.query(base)
    expect(r.buckets).toHaveLength(7)
    expect(r.buckets[6]).toBe(formatBucket(day(0, 0)))
    const a = r.series.find((s) => s.key === 'local|/a')
    const b = r.series.find((s) => s.key === 'local|/b')
    expect(a?.values.tokens[6]).toBe(1_000_000)
    expect(a?.values.prompts[6]).toBe(2)
    expect(b?.values.tokens[4]).toBe(2_000_000)
    expect(b?.host).toBe('local')
    expect(r.totals).toMatchObject({ tokens: 3_000_000, prompts: 3, cost: 3, sessions: 2 })
    expect(r.hasUnpriced).toBe(false)
  })

  it('Stunden zählen zur Zeiteinheit des späteren Eintrags', () => {
    repo.insertMany([rec('m1', day(1, 23, 55), { sessionId: 's' }), rec('m2', day(0, 0, 5), { sessionId: 's' })])
    const r = analytics.query(base)
    const a = r.series[0]
    expect(a?.values.hours[5]).toBe(0)
    expect(a?.values.hours[6]).toBeCloseTo(10 / 60)
    expect(r.totals.hours).toBeCloseTo(10 / 60)
    const heat = r.heatmap.find((c) => c.hour === 0)
    expect(heat?.hours).toBeCloseTo(10 / 60)
  })

  it('Sessions: verschieden je Zeiteinheit, insgesamt nicht doppelt', () => {
    repo.insertMany([rec('m1', day(1, 10), { sessionId: 's' }), rec('m2', day(0, 10), { sessionId: 's' })])
    const r = analytics.query(base)
    expect(r.series[0]?.values.sessions.slice(5)).toEqual([1, 1])
    expect(r.series[0]?.totals.sessions).toBe(1)
    expect(r.totals.sessions).toBe(1)
  })

  it('previous ist null, wenn der Vorzeitraum vor Datenbeginn liegt, sonst gefüllt', () => {
    repo.insertMany([rec('m1', day(0, 10))])
    expect(analytics.query(base).previous).toBeNull()
    repo.insertMany([rec('m0', day(13, 0, 1), { inputTokens: 500 }), rec('m00', day(14, 10), { inputTokens: 7 })])
    expect(analytics.query(base).previous).toMatchObject({ tokens: 500, sessions: 1 })
    expect(analytics.query({ ...base, range: 'all' }).previous).toBeNull()
  })

  it('leere Datenbank', () => {
    const r = analytics.query(base)
    expect(r.totals).toEqual({ tokens: 0, cost: 0, hours: 0, prompts: 0, sessions: 0 })
    expect(r.series).toEqual([])
    expect(r.previous).toBeNull()
    expect(r.dataSince).toBeNull()
    expect(r.buckets).toHaveLength(7)
  })

  it('Filter Rechner und Projekte, Privatmodus', () => {
    repo.insertMany([rec('m1', day(0, 10)), rec('m2', day(0, 11), { host: 'mini-pc' }), rec('m3', day(0, 12), { project: '/b' })])
    repo.insertPrompts([prompt('u1', day(0, 9), { project: '/b' })])
    expect(analytics.query({ ...base, host: 'mini-pc' }).series.map((s) => s.key)).toEqual(['mini-pc|/a'])
    expect(analytics.query({ ...base, projects: ['local|/a'] }).series.map((s) => s.key)).toEqual(['local|/a'])
    hidden = (_h, p) => p === '/b'
    const r = analytics.query(base)
    expect(r.series.map((s) => s.key).sort()).toEqual(['local|/a', 'mini-pc|/a'])
    expect(r.totals.prompts).toBe(0)
  })

  it('split model / host / none', () => {
    repo.insertMany([rec('m1', day(0, 10)), rec('m2', day(0, 11), { host: 'mini-pc', project: '/b' })])
    expect(analytics.query({ ...base, split: 'model' }).series.map((s) => s.key)).toEqual(['claude-haiku-4-5'])
    expect(analytics.query({ ...base, split: 'host' }).series.map((s) => s.key).sort()).toEqual(['local', 'mini-pc'])
    expect(analytics.query({ ...base, split: 'none' }).series.map((s) => s.key)).toEqual(['all'])
  })

  it('liest die Preise einmal je Abfrage, nicht je Nachricht', () => {
    repo.insertMany([rec('m1', day(0, 10)), rec('m2', day(0, 11)), rec('m3', day(1, 11))])
    const prices = vi.fn(() => PRICES)
    new UsageAnalytics(db, prices, () => NOW).query(base)
    expect(prices).toHaveBeenCalledTimes(1)
  })

  it('schließt abgewählte Projekte aus, neue Projekte bleiben sichtbar', () => {
    repo.insertMany([rec('m1', day(0, 10)), rec('m2', day(0, 11), { project: '/b' }), rec('m3', day(0, 12), { project: '/neu' })])
    repo.insertPrompts([prompt('u1', day(0, 9), { project: '/b' })])
    const r = analytics.query({ ...base, excludedProjects: ['local|/b'] })
    expect(r.series.map((s) => s.key).sort()).toEqual(['local|/a', 'local|/neu'])
    expect(r.totals.prompts).toBe(0)
  })

  it('filtert nach Modell, Prompts über das Modell ihrer Session', () => {
    repo.insertMany([rec('m1', day(0, 10), { sessionId: 's1' }), rec('m2', day(0, 11), { sessionId: 's2', model: 'claude-opus-5-5' })])
    repo.insertPrompts([prompt('u1', day(0, 9), { sessionId: 's1' }), prompt('u2', day(0, 9), { sessionId: 's2' })])
    const r = analytics.query({ ...base, models: ['claude-opus-5-5'] })
    expect(r.totals).toMatchObject({ tokens: 1_000_000, prompts: 1, sessions: 1 })
    expect(r.heatmap.reduce((sum, c) => sum + c.tokens, 0)).toBe(1_000_000)
  })

  it('markiert unbepreiste Modelle', () => {
    repo.insertMany([rec('m1', day(0, 10), { model: 'unbekannt-1' })])
    expect(analytics.query(base).hasUnpriced).toBe(true)
  })
})
