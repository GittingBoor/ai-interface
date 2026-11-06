import { describe, expect, it } from 'vitest'
import { isGerman, scanSource } from '../helpers/germanScanner'

const texts = (source: string, isTsx = true): string[] => scanSource(source, isTsx).map((f) => f.text)

describe('Scanner für deutsche Reste', () => {
  it('erkennt Wörter und Umlaute', () => {
    expect(isGerman('Das geht nicht')).toBe(true)
    expect(isGerman('Größe')).toBe(true)
    expect(isGerman('Closed')).toBe(false)
    expect(isGerman('vorbei')).toBe(false)
  })

  it('findet JSX-Text neben einem Ausdruck', () => {
    expect(texts('const a = <p>{count} Projekt offen</p>')).toEqual(['Projekt offen'])
    expect(texts('const a = <p>Noch nicht fertig: {count}</p>')).toEqual(['Noch nicht fertig:'])
  })

  it('findet Text nach einem selbstschließenden Tag', () => {
    expect(texts('const a = <p><Icon /> Nicht gefunden</p>')).toEqual(['Nicht gefunden'])
    expect(texts('const a = <p>{x}<br /> und mehr</p>')).toEqual(['und mehr'])
  })

  it('liest ein Template mit Ausdruck', () => {
    expect(texts('const a = `${n} Einträge wurden gelöscht`', false)).toEqual(['${n} Einträge wurden gelöscht'])
  })

  it('überspringt Regex-Literale mit Anführungszeichen', () => {
    expect(texts("const r = /[*`_]/g\nconst a = 'Fehler beim Laden'", false)).toEqual(['Fehler beim Laden'])
  })

  it('ignoriert Kommentare und englische Texte', () => {
    expect(texts('// Das ist nicht deutsch genug\n/* und das auch nicht */\nconst a = <p>Close</p>')).toEqual([])
  })

  it('meldet die Zeile des Textes, nicht des Tags', () => {
    const findings = scanSource('const a = (\n  <p>\n    Nicht gefunden\n  </p>\n)', true)
    expect(findings).toEqual([{ line: 3, text: 'Nicht gefunden' }])
  })

  it('nimmt Zeilen mit i18n-ignore aus', () => {
    expect(scanSource('const a = <p>\n  Nicht gefunden {/* i18n-ignore */}\n</p>', true)).toEqual([])
    expect(scanSource("const a = 'Fehler' // i18n-ignore", false)).toEqual([])
  })

  it('meldet keine deutschen Doc-Kommentare zwischen Komponenten', () => {
    const source = `const A = () => <p>{x}</p>

/** Das ist ein Kommentar mit Umlaut für alle. */
export function B(p: P): JSX.Element {
  return <p />
}`
    expect(scanSource(source, true)).toEqual([])
  })

  it('zählt Funktionssignaturen zwischen } und { nicht als JSX-Text', () => {
    const signature = `const A = () => <p>{x}</p>
}
function handleNichtGefunden(und: string, mit: number): void {
}`
    const control = `if (a) {
  b()
} else if (nicht) {
}`
    expect(scanSource(signature, true)).toEqual([])
    expect(scanSource(control, true)).toEqual([])
  })
})
