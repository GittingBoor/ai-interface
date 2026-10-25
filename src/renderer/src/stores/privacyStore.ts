import { create } from 'zustand'
import type { PrivacyStatus, PrivateProject, PrivateProjectInput } from '@shared/privacy'
import { api } from '@renderer/api/client'
import { attempt, unwrap } from '@renderer/api/call'

interface PrivacyStore {
  readonly status: PrivacyStatus | null
  /** Nur entsperrt gefüllt. */
  readonly projects: readonly PrivateProject[]
  load(): Promise<void>
  receive(status: PrivacyStatus): void
  /** Wirft `ApiError` (z. B. WRONG_PIN), damit der PIN-Dialog den Fehler am Feld zeigt. */
  unlock(pin: string): Promise<void>
  setPin(current: string | null, next: string): Promise<void>
  lock(): Promise<void>
  add(input: PrivateProjectInput): Promise<boolean>
  remove(id: number): Promise<void>
}

export const usePrivacy = create<PrivacyStore>((set, get) => {
  const loadList = async (status: PrivacyStatus): Promise<void> => {
    set({ projects: status.locked ? [] : ((await attempt(api.privacy.list())) ?? []) })
  }

  return {
    status: null,
    projects: [],
    load: async () => {
      const status = await attempt(api.privacy.status())
      if (!status) return
      set({ status })
      await loadList(status)
    },
    receive: (status) => {
      set({ status })
      void loadList(status)
    },
    unlock: async (pin) => get().receive(await unwrap(api.privacy.unlock(pin))),
    setPin: async (current, next) => get().receive(await unwrap(api.privacy.setPin(current, next))),
    lock: async () => {
      const status = await attempt(api.privacy.lock())
      if (status) get().receive(status)
    },
    add: async (input) => (await attempt(api.privacy.add(input))) !== null,
    remove: async (id) => {
      await attempt(api.privacy.remove(id))
    }
  }
})
