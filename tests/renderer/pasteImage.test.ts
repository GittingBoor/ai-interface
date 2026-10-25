import { describe, expect, it } from 'vitest'
import { shouldPasteImage } from '../../src/renderer/src/lib/pasteImage'

describe('shouldPasteImage', () => {
  it('nur bei Bild ohne Text', () => {
    expect(shouldPasteImage(['Files'])).toBe(true)
    expect(shouldPasteImage(['image/png'])).toBe(true)
    expect(shouldPasteImage(['text/plain'])).toBe(false)
    expect(shouldPasteImage(['text/plain', 'image/png', 'text/html'])).toBe(false)
    expect(shouldPasteImage([])).toBe(false)
  })
})
