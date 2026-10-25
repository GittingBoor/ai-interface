import { create } from 'zustand'

export type ToastKind = 'error' | 'success' | 'info'

/** Knopf in der Meldung, z. B. „Rückgängig“. */
export interface ToastAction {
  readonly label: string
  run(): void
}

export interface Toast {
  readonly id: number
  readonly kind: ToastKind
  readonly title: string
  readonly hint?: string
  readonly action?: ToastAction
}

interface ToastStore {
  readonly toasts: readonly Toast[]
  push(toast: Omit<Toast, 'id'>): void
  dismiss(id: number): void
}

const AUTO_DISMISS_MS: Readonly<Record<ToastKind, number>> = { error: 9000, success: 3200, info: 4500 }
/** Meldungen mit Knopf bleiben länger, damit man ihn noch erreicht. */
const ACTION_DISMISS_MS = 8000
const MAX_TOASTS = 4
let counter = 0

export const useToasts = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = ++counter
    set({ toasts: [...get().toasts, { ...toast, id }].slice(-MAX_TOASTS) })
    setTimeout(() => get().dismiss(id), toast.action ? ACTION_DISMISS_MS : AUTO_DISMISS_MS[toast.kind])
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) })
}))

export const notify = {
  error: (title: string, hint?: string): void => useToasts.getState().push(hint ? { kind: 'error', title, hint } : { kind: 'error', title }),
  success: (title: string): void => useToasts.getState().push({ kind: 'success', title }),
  info: (title: string, hint?: string): void => useToasts.getState().push(hint ? { kind: 'info', title, hint } : { kind: 'info', title }),
  /** Erfolgsmeldung mit Knopf (z. B. „Rückgängig“). */
  undoable: (title: string, hint: string, action: ToastAction): void => useToasts.getState().push({ kind: 'success', title, hint, action })
}
