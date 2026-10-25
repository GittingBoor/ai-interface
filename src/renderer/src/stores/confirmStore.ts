import { create } from 'zustand'

export interface ConfirmRequest {
  readonly title: string
  readonly message: string
  readonly confirmLabel: string
  readonly danger?: boolean
}

interface ConfirmStore {
  readonly request: ConfirmRequest | null
  readonly resolve: ((ok: boolean) => void) | null
  ask(request: ConfirmRequest): Promise<boolean>
  answer(ok: boolean): void
}

export const useConfirm = create<ConfirmStore>((set, get) => ({
  request: null,
  resolve: null,
  ask: (request) =>
    new Promise<boolean>((resolve) => {
      get().resolve?.(false)
      set({ request, resolve })
    }),
  answer: (ok) => {
    get().resolve?.(ok)
    set({ request: null, resolve: null })
  }
}))

export const confirmAction = (request: ConfirmRequest): Promise<boolean> => useConfirm.getState().ask(request)
