import { describe, expect, it } from 'vitest'
import {
  applyAssistantEvent,
  clampAssistantWidth,
  confirmTitle,
  hasPendingConfirm,
  toolLabel,
  type ChatMessage
} from '../../src/renderer/src/lib/assistantMessages'

describe('applyAssistantEvent', () => {
  it('hängt Textabschnitte derselben Antwort aneinander', () => {
    let list: ChatMessage[] = []
    list = applyAssistantEvent(list, { type: 'text', turnId: 't1', text: 'Hallo' }, 'a')
    list = applyAssistantEvent(list, { type: 'text', turnId: 't1', text: 'Welt' }, 'b')
    expect(list).toEqual([{ kind: 'assistant', id: 'a', turnId: 't1', text: 'Hallo\n\nWelt' }])
  })

  it('beginnt nach Werkzeug oder Bestätigung einen neuen Abschnitt', () => {
    let list: ChatMessage[] = []
    list = applyAssistantEvent(list, { type: 'text', turnId: 't1', text: 'Vorher' }, 'a')
    list = applyAssistantEvent(list, { type: 'confirm', requestId: 'r1', tool: 'add_todo', preview: 'x' }, 'b')
    list = applyAssistantEvent(list, { type: 'text', turnId: 't1', text: 'Nachher' }, 'c')
    expect(list.map((m) => m.kind)).toEqual(['assistant', 'confirm', 'assistant'])
  })

  it('setzt den Status einer Bestätigung', () => {
    let list = applyAssistantEvent([], { type: 'confirm', requestId: 'r1', tool: 'add_todo', preview: 'x' }, 'a')
    expect(hasPendingConfirm(list)).toBe(true)
    list = applyAssistantEvent(list, { type: 'confirm-resolved', requestId: 'r1', allowed: false }, 'b')
    expect(list[0]).toMatchObject({ kind: 'confirm', status: 'denied' })
    expect(hasPendingConfirm(list)).toBe(false)
  })

  it('ignoriert leeren Text und done', () => {
    expect(applyAssistantEvent([], { type: 'text', turnId: 't', text: '  ' }, 'a')).toEqual([])
    expect(applyAssistantEvent([], { type: 'done', turnId: 't' }, 'a')).toEqual([])
  })
})

describe('Beschriftungen und Breite', () => {
  it('übersetzt bekannte Werkzeuge, sonst Name', () => {
    expect(toolLabel('list_projects')).toBe('Liest Projekte')
    expect(toolLabel('Read')).toBe('Read')
    expect(confirmTitle('create_project_folder')).toBe('Projektordner anlegen')
  })

  it('begrenzt die Breite auf 360 bis 640', () => {
    expect(clampAssistantWidth(100)).toBe(360)
    expect(clampAssistantWidth(900)).toBe(640)
    expect(clampAssistantWidth(500.4)).toBe(500)
  })
})
