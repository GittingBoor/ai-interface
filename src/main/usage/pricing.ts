import type { ModelPrice, PriceTable, TokenCounts } from '@shared/types'

const TOKENS_PER_UNIT = 1_000_000
const CACHE_WRITE_FACTOR = 1.25
const CACHE_READ_FACTOR = 0.1

const price = (input: number, output: number, cacheRead = input * CACHE_READ_FACTOR): ModelPrice => ({
  input,
  output,
  cacheWrite: input * CACHE_WRITE_FACTOR,
  cacheRead
})

/** API-Listenpreise (USD pro Mio. Token, Stand 2026-06). In den Einstellungen änderbar. */
export const DEFAULT_PRICE_TABLE: PriceTable = {
  'claude-fable-5-1': price(10, 50, 0.25),
  'claude-fable-5': price(10, 50),
  'claude-opus-5-5': price(4, 20, 0.2),
  'claude-opus-5': price(5, 25),
  'claude-opus-4-8': price(5, 25),
  'claude-opus-4-7': price(5, 25),
  'claude-opus-4-6': price(5, 25),
  'claude-sonnet-5': price(2, 10),
  'claude-sonnet-4-6': price(3, 15),
  'claude-haiku-4-5': price(1, 5)
}

function findPrice(model: string, table: PriceTable): ModelPrice | null {
  const exact = table[model]
  if (exact) return exact
  const prefix = Object.keys(table)
    .filter((key) => model.startsWith(`${key}-`))
    .sort((a, b) => b.length - a.length)[0]
  return prefix ? (table[prefix] ?? null) : null
}

/** Geschätzter API-Gegenwert in USD; `null`, wenn das Modell unbekannt ist. */
export function estimateCostUsd(model: string, tokens: TokenCounts, table: PriceTable): number | null {
  const p = findPrice(model, table)
  if (!p) return null
  return (
    (tokens.inputTokens * p.input +
      tokens.outputTokens * p.output +
      tokens.cacheCreationTokens * p.cacheWrite +
      tokens.cacheReadTokens * p.cacheRead) /
    TOKENS_PER_UNIT
  )
}
