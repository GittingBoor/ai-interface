import { create } from 'zustand'
import type { AssistantEvent } from '@shared/types'
import { api } from '@renderer/api/client'
import { ApiError, unwrap } from '@renderer/api/call'
import { confirmAction } from '@renderer/stores/confirmStore'
import {
  ASSISTANT_DEFAULT_WIDTH,
  applyAssistantEvent,
  clampAssistantWidth,
  markConfirmSending,
  type ChatMessage
} from '@renderer/lib/assistantMessages'

const OPEN_KEY = 'assistant.open'
const WIDTH_KEY = 'assistant.width'
const FALLBACK_HINT = 'Details stehen im Log (Einstellungen → Log öffnen).'

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Speichern ist Komfort (offen/zu, Breite); klappt es nicht, bleibt der Zustand für diese Sitzung erhalten. */
function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    console.warn(`Assistent: ${key} konnte nicht gespeichert werden`, error)
  }
}

function initialWidth(): number {
  const stored = Number(readStorage(WIDTH_KEY))
  return Number.isFinite(stored) && stored > 0 ? clampAssistantWidth(stored) : ASSISTANT_DEFAULT_WIDTH
}

let idCounter = 0
const nextId = (): string => `m${++idCounter}`

const errorEntry = (error: unknown): ChatMessage => ({
  kind: 'error',
  id: nextId(),
  message: error instanceof Error ? error.message : String(error),
  hint: error instanceof ApiError ? (error.hint ?? '') : FALLBACK_HINT
})

interface AssistantStore {
  readonly messages: readonly ChatMessage[]
  readonly running: boolean
  readonly open: boolean
  readonly width: number
  setOpen(open: boolean): void
  toggle(): void
  /** Breite setzen; `persist` erst am Ende des Ziehens, damit nicht jeder Pixel gespeichert wird. */
  setWidth(width: number, persist?: boolean): void
  receive(event: AssistantEvent): void
  send(text: string): Promise<void>
  stop(): Promise<void>
  newChat(): Promise<void>
  decide(requestId: string, allowed: boolean): Promise<void>
}

export const useAssistant = create<AssistantStore>((set, get) => ({
  messages: [],
  running: false,
  open: readStorage(OPEN_KEY) === '1',
  width: initialWidth(),

  setOpen: (open) => {
    set({ open })
    writeStorage(OPEN_KEY, open ? '1' : '0')
  },
  toggle: () => get().setOpen(!get().open),
  setWidth: (width, persist = false) => {
    const next = clampAssistantWidth(width)
    set({ width: next })
    if (persist) writeStorage(WIDTH_KEY, String(next))
  },

  receive: (event) => {
    set((s) => ({
      messages: applyAssistantEvent(s.messages, event, nextId()),
      running: event.type === 'done' ? false : s.running
    }))
  },

  send: async (raw) => {
    const text = raw.trim()
    if (!text || get().running) return
    set((s) => ({ messages: [...s.messages, { kind: 'user', id: nextId(), text }], running: true }))
    try {
      await unwrap(api.assistant.send(text))
    } catch (error) {
      set((s) => ({ messages: [...s.messages, errorEntry(error)] }))
    } finally {
      set({ running: false })
    }
  },

  stop: async () => {
    try {
      await unwrap(api.assistant.stop())
    } catch (error) {
      set((s) => ({ messages: [...s.messages, errorEntry(error)] }))
    }
  },

  newChat: async () => {
    if (get().running) {
      const ok = await confirmAction({
        title: 'Neuen Chat beginnen?',
        message: 'Der Assistent arbeitet noch. Der laufende Auftrag wird abgebrochen und der Verlauf geleert.',
        confirmLabel: 'Abbrechen und neu',
        danger: true
      })
      if (!ok) return
      await get().stop()
    }
    try {
      await unwrap(api.assistant.reset())
      set({ messages: [], running: false })
    } catch (error) {
      set((s) => ({ messages: [...s.messages, errorEntry(error)] }))
    }
  },

  decide: async (requestId, allowed) => {
    set((s) => ({ messages: markConfirmSending(s.messages, requestId) }))
    try {
      await unwrap(api.assistant.confirm(requestId, allowed))
    } catch (error) {
      set((s) => ({
        messages: [...s.messages.map((m) => (m.kind === 'confirm' && m.id === requestId ? { ...m, status: 'pending' as const } : m)), errorEntry(error)]
      }))
    }
  }
}))
