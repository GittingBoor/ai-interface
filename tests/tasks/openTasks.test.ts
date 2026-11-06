import { describe, expect, it } from 'vitest'
import { normalizeTask, parseOpenTasks } from '../../src/main/tasks/openTasks'

const doc = (...sections: readonly string[]): string => ['---', 'tags: [x, protokoll]', '---', '# 2026-10-19 — X', '', ...sections].join('\n')

const FIELD_NAMES = ['Offen', 'Open', 'Pendiente', 'Pendientes', 'À faire', 'Ouvert', 'Aperti', 'Da fare', '未完了', '待办', '未完成']
const NOTHING_WORDS = ['none', 'nothing', '-', 'nada', 'ninguna', 'rien', 'aucune', 'niente', 'nessuna', 'なし', '無し', '无', '没有']

describe('parseOpenTasks in allen Sprachen', () => {
  const forms = (name: string): string[] => [`**${name}:**`, `**${name}**:`, `**${name}：**`, `**${name}**：`]

  it('erkennt jeden Feldnamen in allen Schreibweisen, auch in Groß- und Kleinschreibung', () => {
    for (const name of FIELD_NAMES) {
      for (const variant of [name, name.toUpperCase(), name.toLowerCase()]) {
        for (const field of forms(variant)) {
          expect(parseOpenTasks(doc('## S', field, '- [ ] a', '- [x] b')), field).toEqual([
            { text: 'a', done: false },
            { text: 'b', done: true }
          ])
          expect(parseOpenTasks(doc('## S', `${field} Rest prüfen`)), field).toEqual([{ text: 'Rest prüfen', done: false }])
        }
      }
    }
  })

  it('nichts offen ergibt in jeder Sprache keine Aufgabe', () => {
    for (const word of NOTHING_WORDS) {
      for (const value of [word, `${word}.`, word.toUpperCase(), `${word}。`]) {
        expect(parseOpenTasks(doc('## S', `**Open:** ${value}`)), value).toEqual([])
        expect(parseOpenTasks(doc('## S', '**未完了：**', `- ${value}`)), value).toEqual([])
      }
    }
  })

  it('Wörter, die nur mit einem Nichts-Wort beginnen, bleiben Aufgaben', () => {
    expect(parseOpenTasks(doc('## S', '**Open:** nothing but tests'))).toEqual([{ text: 'nothing but tests', done: false }])
    expect(parseOpenTasks(doc('## S', '**未完了：** なしくずしに直す'))).toEqual([{ text: 'なしくずしに直す', done: false }])
  })

  it('anderes Feld beendet die Liste auch bei Vollbreite-Doppelpunkt', () => {
    expect(parseOpenTasks(doc('## S', '**待办：**', '- a', '**结果：** y'))).toEqual([{ text: 'a', done: false }])
  })
})

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
