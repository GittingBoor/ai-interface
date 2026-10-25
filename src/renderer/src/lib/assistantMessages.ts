import type { AssistantEvent } from '@shared/types'

export type ConfirmStatus = 'pending' | 'sending' | 'allowed' | 'denied'

export interface UserMessage {
  readonly kind: 'user'
  readonly id: string
  readonly text: string
}

/** Ein zusammenhängender Antwortabschnitt; Werkzeuge oder Bestätigungen dazwischen beginnen einen neuen. */
export interface AssistantMessage {
  readonly kind: 'assistant'
  readonly id: string
  readonly turnId: string
  readonly text: string
}

export interface ToolMessage {
  readonly kind: 'tool'
  readonly id: string
  readonly turnId: string
  readonly name: string
  readonly summary: string
}

export interface ConfirmMessage {
  readonly kind: 'confirm'
  readonly id: string
  readonly tool: string
  readonly preview: string
  readonly status: ConfirmStatus
}

export interface ErrorMessage {
  readonly kind: 'error'
  readonly id: string
  readonly message: string
  readonly hint: string
}

export type ChatMessage = UserMessage | AssistantMessage | ToolMessage | ConfirmMessage | ErrorMessage

export const ASSISTANT_MIN_WIDTH = 360
export const ASSISTANT_MAX_WIDTH = 640
export const ASSISTANT_DEFAULT_WIDTH = 420

/** Trenner zwischen zwei Textabschnitten derselben Antwort (eigener Markdown-Absatz). */
const CHUNK_SEPARATOR = '\n\n'

const TOOL_LABEL: Readonly<Record<string, string>> = {
  list_projects: 'Liest Projekte',
  list_categories: 'Liest Projektarten',
  list_project_folders: 'Liest Projektordner',
  usage_summary: 'Wertet Verbrauch aus',
  quota: 'Prüft Kontingent',
  list_todos: 'Liest TODOs',
  devices_status: 'Fragt die Geräte ab',
  list_skills: 'Liest Skills',
  app_settings: 'Liest Einstellungen',
  create_project_folder: 'Legt Projektordner an',
  write_obsidian_note: 'Schreibt Obsidian-Notiz',
  add_project: 'Trägt Projekt ein',
  create_category: 'Legt Art an',
  add_todo: 'Fügt TODO hinzu'
}

const CONFIRM_TITLE: Readonly<Record<string, string>> = {
  create_project_folder: 'Projektordner anlegen',
  write_obsidian_note: 'Obsidian-Notiz schreiben',
  add_project: 'Projekt eintragen',
  create_category: 'Art anlegen',
  add_todo: 'TODO hinzufügen'
}

export const toolLabel = (name: string): string => TOOL_LABEL[name] ?? name
export const confirmTitle = (tool: string): string => CONFIRM_TITLE[tool] ?? tool

export const clampAssistantWidth = (width: number): number =>
  Math.round(Math.min(ASSISTANT_MAX_WIDTH, Math.max(ASSISTANT_MIN_WIDTH, width)))

function appendText(messages: readonly ChatMessage[], turnId: string, text: string, nextId: string): ChatMessage[] {
  const last = messages.at(-1)
  if (last?.kind === 'assistant' && last.turnId === turnId) {
    return [...messages.slice(0, -1), { ...last, text: `${last.text}${CHUNK_SEPARATOR}${text}` }]
  }
  return [...messages, { kind: 'assistant', id: nextId, turnId, text }]
}

function setConfirmStatus(messages: readonly ChatMessage[], requestId: string, status: ConfirmStatus): ChatMessage[] {
  return messages.map((m) => (m.kind === 'confirm' && m.id === requestId ? { ...m, status } : m))
}

/** Wendet ein Ereignis des Assistenten auf den Verlauf an. `nextId` ist die Kennung für neu entstehende Einträge. */
export function applyAssistantEvent(messages: readonly ChatMessage[], event: AssistantEvent, nextId: string): ChatMessage[] {
  switch (event.type) {
    case 'text':
      return event.text.trim() ? appendText(messages, event.turnId, event.text, nextId) : [...messages]
    case 'tool':
      return [...messages, { kind: 'tool', id: nextId, turnId: event.turnId, name: event.name, summary: event.summary }]
    case 'confirm':
      return [...messages, { kind: 'confirm', id: event.requestId, tool: event.tool, preview: event.preview, status: 'pending' }]
    case 'confirm-resolved':
      return setConfirmStatus(messages, event.requestId, event.allowed ? 'allowed' : 'denied')
    case 'error':
      return [...messages, { kind: 'error', id: nextId, message: event.message, hint: event.hint }]
    case 'done':
      return [...messages]
  }
}

export const markConfirmSending = (messages: readonly ChatMessage[], requestId: string): ChatMessage[] =>
  setConfirmStatus(messages, requestId, 'sending')

/** true, wenn der Assistent gerade auf eine Entscheidung des Nutzers wartet. */
export const hasPendingConfirm = (messages: readonly ChatMessage[]): boolean =>
  messages.some((m) => m.kind === 'confirm' && (m.status === 'pending' || m.status === 'sending'))
