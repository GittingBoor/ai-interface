import { describe, expect, it } from 'vitest'
import { normalizeTask, parseOpenTasks } from '../../src/main/tasks/openTasks'

const doc = (...sections: readonly string[]): string => ['---', 'tags: [x, protokoll]', '---', '# 2026-10-19 — X', '', ...sections].join('\n')

describe('parseOpenTasks', () => {
  it('nimmt nur den letzten Abschnitt', () => {
    const md = doc('## Erste Sitzung', '', '**Offen:**', '- [ ] alt', '', '## Zweite Sitzung', '', '**Offen:**', '- [ ] neu')
    expect(parseOpenTasks(md)).toEqual([{ text: 'neu', done: false }])
  })

  it('liest Listen mit und ohne Checkbox', () => {
    const md = doc('## S', '**Offen:**', '- [ ] a', '- [x] b', '- c', '* d')
    expect(parseOpenTasks(md)).toEqual([
      { text: 'a', done: false },
      { text: 'b', done: true },
      { text: 'c', done: false },
      { text: 'd', done: false }
    ])
  })

  it('Fließtext in derselben Zeile ist eine Aufgabe', () => {
    expect(parseOpenTasks(doc('## S', '**Offen:** Tests für X fehlen noch.'))).toEqual([{ text: 'Tests für X fehlen noch.', done: false }])
  })

  it('nichts offen ergibt keine Aufgaben', () => {
    for (const value of ['–', '-', 'nichts', 'Nichts offen.', 'Keine.', 'keine offenen Punkte', '']) {
      expect(parseOpenTasks(doc('## S', `**Offen:** ${value}`))).toEqual([])
    }
    expect(parseOpenTasks(doc('## S', '**Anliegen:** x'))).toEqual([])
  })

  it('Liste endet an Leerzeile, nächstem Feld oder Überschrift', () => {
    const md = doc('## S', '**Offen:**', '- [ ] a', '', '- nicht mehr dabei', '**Ergebnis:** y')
    expect(parseOpenTasks(md)).toEqual([{ text: 'a', done: false }])
    expect(parseOpenTasks(doc('## S', '**Offen:**', '- [ ] a', '**Ergebnis:** y'))).toEqual([{ text: 'a', done: false }])
  })

  it('Fließtext plus Liste: beides zählt', () => {
    expect(parseOpenTasks(doc('## S', '**Offen:** Vorab prüfen', '- [ ] a'))).toEqual([
      { text: 'Vorab prüfen', done: false },
      { text: 'a', done: false }
    ])
  })

  it('CRLF liefert dasselbe Ergebnis', () => {
    const md = doc('## S', '**Offen:**', '- [ ] a', '- [x] b')
    expect(parseOpenTasks(md.replaceAll('\n', '\r\n'))).toEqual(parseOpenTasks(md))
  })

  it('ohne Abschnittsüberschrift zählt das ganze Dokument', () => {
    expect(parseOpenTasks('**Offen:**\n- [ ] a')).toEqual([{ text: 'a', done: false }])
  })
})

describe('normalizeTask', () => {
  it('ignoriert Groß-/Kleinschreibung, Leerraum und Hervorhebung', () => {
    expect(normalizeTask('  **Tests**  für `X`  schreiben ')).toBe('tests für x schreiben')
  })
})
