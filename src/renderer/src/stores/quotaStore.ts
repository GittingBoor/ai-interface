import { create } from 'zustand'
import type { QuotaState } from '@shared/types'
import { api } from '@renderer/api/client'
import { errorMessage, unwrap } from '@renderer/api/call'
import { currentT } from '@renderer/i18n/useT'

interface QuotaStore {
  readonly state: QuotaState
  readonly refreshing: boolean
  load(): Promise<void>
  refresh(): Promise<void>
  receive(state: QuotaState): void
}

/** Ein fehlgeschlagener Aufruf wird zu „keine Quelle“, damit nie ein alter Wert als aktuell erscheint. */
const failed = (cause: unknown): QuotaState => ({ status: 'unavailable', reason: errorMessage(cause), hint: currentT().frame.quota.ipcHint, fetchedAt: Date.now() })

export const useQuota = create<QuotaStore>((set) => ({
  state: { status: 'loading' },
  refreshing: false,
  load: async () => {
    try {
      set({ state: await unwrap(api.quota.get()) })
    } catch (cause) {
      set({ state: failed(cause) })
    }
  },
  refresh: async () => {
    set({ refreshing: true })
    try {
      set({ state: await unwrap(api.quota.refresh()) })
    } catch (cause) {
      set({ state: failed(cause) })
    } finally {
      set({ refreshing: false })
    }
  },
  receive: (state) => set({ state })
}))
