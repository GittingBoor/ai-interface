import { describe, expect, it } from 'vitest'
import { ValidationError } from '../../src/main/errors'
import { MAX_OUTPUT_CHARS, assertRelativePath, clip, quoteFor } from '../../src/main/hosts/projectRead'

const WIN = { separator: '\\' } as const

describe('projectRead', () => {
  it('assertRelativePath lehnt .. und absolute Pfade ab', () => {
    expect(() => assertRelativePath('../x')).toThrow(ValidationError)
    expect(() => assertRelativePath('C:\\x')).toThrow(ValidationError)
    expect(() => assertRelativePath('/etc/x')).toThrow(ValidationError)
    expect(() => assertRelativePath('src/a.ts')).not.toThrow()
  })

  it('quoteFor wirft unter Windows bei Anführungszeichen', () => {
    expect(() => quoteFor(WIN, 'a"b')).toThrow(ValidationError)
    expect(quoteFor(WIN, 'ab')).toBe('"ab"')
  })

  it('clip kürzt ab MAX_OUTPUT_CHARS + 1 Zeichen', () => {
    expect(clip('a'.repeat(MAX_OUTPUT_CHARS))).toHaveLength(MAX_OUTPUT_CHARS)
    const out = clip('a'.repeat(12_001))
    expect(out.endsWith('… (gekürzt)')).toBe(true)
    expect(out.startsWith('a'.repeat(MAX_OUTPUT_CHARS))).toBe(true)
  })
})
