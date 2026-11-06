import { describe, expect, it } from 'vitest'
import { pasteExtensionOf, shouldPasteImage } from '../../src/renderer/src/lib/pasteImage'

describe('shouldPasteImage', () => {
  it('nur bei Bild ohne Text', () => {
    expect(shouldPasteImage(['Files'])).toBe(true)
    expect(shouldPasteImage(['image/png'])).toBe(true)
    expect(shouldPasteImage(['text/plain'])).toBe(false)
    expect(shouldPasteImage(['text/plain', 'image/png', 'text/html'])).toBe(false)
    expect(shouldPasteImage([])).toBe(false)
  })
})

describe('pasteExtensionOf', () => {
  it('erkennt unterstützte Bilder unabhängig von der Schreibweise', () => {
    expect(pasteExtensionOf('Foto.PNG')).toBe('png')
    expect(pasteExtensionOf('a.b.jpeg')).toBe('jpeg')
    expect(pasteExtensionOf('bild.webp')).toBe('webp')
  })

  it('lehnt andere Dateien und Ordner ab', () => {
    expect(pasteExtensionOf('notiz.txt')).toBeNull()
    expect(pasteExtensionOf('bild.svg')).toBeNull()
    expect(pasteExtensionOf('Ordner')).toBeNull()
  })
})
