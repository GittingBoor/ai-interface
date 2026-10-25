import { describe, expect, it } from 'vitest'
import { DEFAULT_PRICE_TABLE, estimateCostUsd } from '../../src/main/usage/pricing'

const MILLION = 1_000_000

describe('estimateCostUsd', () => {
  it('summiert vier Sätze pro Million Token', () => {
    const table = { 'claude-test': { input: 1, output: 2, cacheWrite: 3, cacheRead: 4 } }
    const cost = estimateCostUsd(
      'claude-test',
      { inputTokens: MILLION, outputTokens: MILLION, cacheCreationTokens: MILLION, cacheReadTokens: MILLION },
      table
    )
    expect(cost).toBe(10)
  })

  it('liefert null für unbekannte Modelle', () => {
    const t = { inputTokens: 1, outputTokens: 1, cacheCreationTokens: 0, cacheReadTokens: 0 }
    expect(estimateCostUsd('gpt-irgendwas', t, DEFAULT_PRICE_TABLE)).toBeNull()
  })

  it('findet Modelle mit Datumssuffix über das längste Präfix', () => {
    const t = { inputTokens: MILLION, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 }
    expect(estimateCostUsd('claude-haiku-4-5-20251001', t, DEFAULT_PRICE_TABLE)).toBe(1)
    expect(estimateCostUsd('claude-opus-5-5', t, DEFAULT_PRICE_TABLE)).toBe(4)
  })
})
