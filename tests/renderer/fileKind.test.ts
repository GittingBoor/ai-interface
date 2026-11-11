import { describe, expect, it } from 'vitest'
import { extensionOf, fileKindOf } from '../../src/renderer/src/lib/fileKind'

describe('fileKindOf', () => {
  it('erkennt die Art an der Endung, unabhängig von Groß- und Kleinschreibung', () => {
    expect(fileKindOf('Foto.JPG', '', 10)).toBe('image')
    expect(fileKindOf('Bericht.pdf', '', 10)).toBe('pdf')
    expect(fileKindOf('Song.mp3', '', 10)).toBe('audio')
    expect(fileKindOf('clip.webm', '', 10)).toBe('video')
    expect(fileKindOf('main.tsx', '', 10)).toBe('code')
    expect(fileKindOf('Daten.csv', '', 10)).toBe('spreadsheet')
    expect(fileKindOf('Folien.pptx', '', 10)).toBe('document')
    expect(fileKindOf('paket.tar.gz', '', 10)).toBe('archive')
  })

  it('nutzt den MIME-Typ, wenn die Endung unbekannt ist', () => {
    expect(fileKindOf('aufnahme', 'audio/x-custom', 10)).toBe('audio')
    expect(fileKindOf('scan', 'application/pdf', 10)).toBe('pdf')
  })

  it('hält eine leere Datei ohne Endung und Typ für einen Ordner', () => {
    expect(fileKindOf('Projekt', '', 0)).toBe('folder')
    expect(fileKindOf('Makefile', '', 120)).toBe('other')
    expect(fileKindOf('daten.bin', '', 0)).toBe('other')
  })
})

describe('extensionOf', () => {
  it('liefert die letzte Endung in Großbuchstaben', () => {
    expect(extensionOf('a.b.pdf')).toBe('PDF')
    expect(extensionOf('Ordner')).toBe('')
    expect(extensionOf('.env')).toBe('ENV')
  })
})
