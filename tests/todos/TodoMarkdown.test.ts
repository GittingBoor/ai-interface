import { describe, expect, it } from 'vitest'
import { applyTodoChange, parseTodos, TodoNotFoundError } from '../../src/main/todos/TodoMarkdown'

const SAMPLE = [
  '---',
  'tags: [server, todo]',
  '---',
  '# TODO Server',
  '',
  'Freitext mit [[Wikilink]] bleibt stehen.',
  '',
  '## Server',
  '- [ ] Backup prüfen ⏫ 📅 2026-10-01',
  '  Notiz zur Aufgabe',
  '- [x] Zigbee updaten ✅ 2026-09-20',
  '',
  '## Music Recommender',
  '* [ ] Tunnel testen 🔽',
  ''
].join('\n')

const lines = (s: string): string[] => s.split('\n')

describe('parseTodos', () => {
  it('liest Einträge mit Abschnitt, Status, Priorität, Datum und Notiz', () => {
    const todos = parseTodos(SAMPLE)
    expect(todos.map((t) => [t.section, t.text, t.done, t.priority, t.due, t.doneDate, t.notes])).toEqual([
      ['Server', 'Backup prüfen', false, 'high', '2026-10-01', null, 'Notiz zur Aufgabe'],
      ['Server', 'Zigbee updaten', true, 'normal', null, '2026-09-20', ''],
      ['Music Recommender', 'Tunnel testen', false, 'low', null, null, '']
    ])
  })

  it('vergibt stabile, eindeutige IDs', () => {
    const a = parseTodos(SAMPLE).map((t) => t.id)
    const b = parseTodos(SAMPLE.replace('Freitext', 'Anderer Text')).map((t) => t.id)
    expect(a).toEqual(b)
    expect(new Set(a).size).toBe(3)
  })

  it('ignoriert Checkboxen im Frontmatter', () => {
    expect(parseTodos('---\nx: "- [ ] nein"\n---\n- [ ] ja\n').map((t) => t.text)).toEqual(['ja'])
  })
})

describe('applyTodoChange', () => {
  const idOf = (md: string, text: string): string => {
    const found = parseTodos(md).find((t) => t.text === text)
    if (!found) throw new Error(`Test-Setup: ${text} fehlt`)
    return found.id
  }

  it('toggle ändert nur die betroffene Zeile und setzt das Erledigt-Datum', () => {
    const out = applyTodoChange(SAMPLE, { kind: 'toggle', id: idOf(SAMPLE, 'Backup prüfen'), today: '2026-09-26' })
    const before = lines(SAMPLE)
    const after = lines(out)
    expect(after).toHaveLength(before.length)
    const changed = after.map((l, i) => (l === before[i] ? null : i)).filter((i) => i !== null)
    expect(changed).toEqual([8])
    expect(after[8]).toBe('- [x] Backup prüfen ⏫ 📅 2026-10-01 ✅ 2026-09-26')
  })

  it('toggle zurück entfernt das Erledigt-Datum', () => {
    const out = applyTodoChange(SAMPLE, { kind: 'toggle', id: idOf(SAMPLE, 'Zigbee updaten'), today: '2026-09-26' })
    expect(lines(out)[10]).toBe('- [ ] Zigbee updaten')
  })

  it('add hängt an den bestehenden Abschnitt hinter dessen letzten Eintrag an', () => {
    const out = applyTodoChange(SAMPLE, { kind: 'add', section: 'Server', text: 'Logs ansehen', priority: 'normal', due: null })
    expect(lines(out).slice(8, 13)).toEqual([
      '- [ ] Backup prüfen ⏫ 📅 2026-10-01',
      '  Notiz zur Aufgabe',
      '- [x] Zigbee updaten ✅ 2026-09-20',
      '- [ ] Logs ansehen',
      ''
    ])
  })

  it('add legt einen fehlenden Abschnitt am Ende an', () => {
    const out = applyTodoChange(SAMPLE, { kind: 'add', section: 'AI Interface', text: 'Icon', priority: 'high', due: '2026-10-05' })
    expect(out.endsWith('\n## AI Interface\n- [ ] Icon ⏫ 📅 2026-10-05\n')).toBe(true)
    expect(out.startsWith(SAMPLE.trimEnd())).toBe(true)
  })

  it('edit schreibt Text, Priorität und Fälligkeit neu und behält den Aufzählungsstil', () => {
    const out = applyTodoChange(SAMPLE, {
      kind: 'edit',
      id: idOf(SAMPLE, 'Tunnel testen'),
      text: 'Tunnel prüfen',
      priority: 'high',
      due: null
    })
    expect(lines(out)[13]).toBe('* [ ] Tunnel prüfen ⏫')
  })

  it('edit behält Tab-Einrückung', () => {
    const md = '- [ ] Eltern\n\t- [ ] Kind\n'
    const out = applyTodoChange(md, { kind: 'edit', id: idOf(md, 'Kind'), text: 'Kind neu', priority: 'normal', due: null })
    expect(out).toBe('- [ ] Eltern\n\t- [ ] Kind neu\n')
  })

  it('delete entfernt die Zeile samt eingerückter Notiz', () => {
    const out = applyTodoChange(SAMPLE, { kind: 'delete', id: idOf(SAMPLE, 'Backup prüfen') })
    expect(lines(out)).toEqual([...lines(SAMPLE).slice(0, 8), ...lines(SAMPLE).slice(10)])
  })

  it('erhält CRLF-Zeilenenden', () => {
    const crlf = SAMPLE.replaceAll('\n', '\r\n')
    const out = applyTodoChange(crlf, { kind: 'toggle', id: idOf(crlf, 'Zigbee updaten'), today: '2026-09-26' })
    expect(out).toBe(crlf.replace('- [x] Zigbee updaten ✅ 2026-09-20', '- [ ] Zigbee updaten'))
  })

  it('findet einen Eintrag, der durch fremde Änderung verrutscht ist', () => {
    const id = idOf(SAMPLE, 'Tunnel testen')
    const moved = SAMPLE.replace('## Music Recommender', '## Music Recommender\nNeue Zeile aus Obsidian')
    const out = applyTodoChange(moved, { kind: 'toggle', id, today: '2026-09-26' })
    expect(out).toContain('* [x] Tunnel testen 🔽 ✅ 2026-09-26')
    expect(out).toContain('Neue Zeile aus Obsidian')
  })

  it('wirft TodoNotFoundError, wenn der Eintrag inzwischen fehlt', () => {
    const id = idOf(SAMPLE, 'Tunnel testen')
    const without = SAMPLE.replace('* [ ] Tunnel testen 🔽', '')
    expect(() => applyTodoChange(without, { kind: 'delete', id })).toThrow(TodoNotFoundError)
  })

  it('lehnt Text mit Zeilenumbruch und ungültige Daten ab', () => {
    expect(() => applyTodoChange(SAMPLE, { kind: 'add', section: 'Server', text: 'a\nb', priority: 'normal', due: null })).toThrow()
    expect(() => applyTodoChange(SAMPLE, { kind: 'add', section: 'Server', text: 'a', priority: 'normal', due: '1.10.2026' })).toThrow()
  })
})
