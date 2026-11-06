import { describe, expect, it } from 'vitest'
import { LOCALES } from '@shared/i18n/locales'
import { MESSAGES, messagesFor } from '@shared/i18n/messages'

const FORBIDDEN = ['undefined', 'NaN', '[object']

function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key))
}

function leaves(value: unknown, prefix = ''): Array<[string, unknown]> {
  if (typeof value !== 'object' || value === null) return [[prefix, value]]
  return Object.entries(value).flatMap(([key, child]) => leaves(child, prefix ? `${prefix}.${key}` : key))
}

function sampleArgs(fn: (...args: never[]) => unknown): unknown[] {
  return Array.from({ length: fn.length }, (_, i) => (i % 2 === 0 ? 'X' : 2))
}

function renderings(fn: (...args: never[]) => unknown): string[] {
  const variants: unknown[][] = [sampleArgs(fn), Array.from({ length: fn.length }, () => 2), Array.from({ length: fn.length }, () => 'X')]
  return variants.map((args) => String((fn as (...a: unknown[]) => unknown)(...args)))
}

describe('Wörterbücher', () => {
  const referenceKeys = keyPaths(MESSAGES.de).sort()

  it('enthält alle Sprachen', () => {
    expect(Object.keys(MESSAGES).sort()).toEqual([...LOCALES].sort())
    for (const locale of LOCALES) expect(messagesFor(locale)).toBe(MESSAGES[locale])
  })

  it.each(LOCALES)('%s hat dieselben Schlüssel wie de', (locale) => {
    expect(keyPaths(MESSAGES[locale]).sort()).toEqual(referenceKeys)
  })

  it.each(LOCALES)('%s hat keine leeren Texte und saubere Funktionen', (locale) => {
    for (const [path, value] of leaves(MESSAGES[locale])) {
      if (typeof value === 'string') {
        expect(value.trim(), `${locale}:${path}`).not.toBe('')
      } else if (typeof value === 'function') {
        for (const text of renderings(value as (...args: never[]) => unknown)) {
          expect(text.trim(), `${locale}:${path}`).not.toBe('')
          for (const bad of FORBIDDEN) expect(text, `${locale}:${path}`).not.toContain(bad)
        }
      } else {
        throw new Error(`${locale}:${path} ist weder Text noch Funktion`)
      }
    }
  })
})
