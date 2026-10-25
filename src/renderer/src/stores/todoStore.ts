import { create } from 'zustand'
import type { TodoChange, TodoState } from '@shared/types'
import { api } from '@renderer/api/client'
import { ApiError, attempt, errorMessage, reportError, unwrap } from '@renderer/api/call'

interface TodoStore {
  readonly state: TodoState | null
  readonly error: string | null
  readonly pending: boolean
  load(): Promise<void>
  apply(change: TodoChange): Promise<boolean>
  create(): Promise<void>
  receive(state: TodoState): void
}

export const useTodos = create<TodoStore>((set, get) => ({
  state: null,
  error: null,
  pending: false,
  load: async () => {
    try {
      set({ state: await unwrap(api.todos.load()), error: null })
    } catch (error) {
      set({ error: errorMessage(error) })
    }
  },
  apply: async (change) => {
    set({ pending: true })
    try {
      set({ state: await unwrap(api.todos.apply(change)) })
      return true
    } catch (error) {
      reportError(error)
      if (error instanceof ApiError && error.code === 'TODO_NOT_FOUND') await get().load()
      return false
    } finally {
      set({ pending: false })
    }
  },
  create: async () => {
    const state = await attempt(api.todos.create())
    if (state) set({ state, error: null })
  },
  receive: (state) => set({ state, error: null })
}))

export const openTodoCount = (state: TodoState | null): number => state?.items.filter((t) => !t.done).length ?? 0
