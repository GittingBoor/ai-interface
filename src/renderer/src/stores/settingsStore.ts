import { create } from 'zustand'
import type { Settings, SettingsPatch } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt, errorMessage, unwrap } from '@renderer/api/call'

interface SettingsStore {
  readonly settings: Settings | null
  readonly error: string | null
  load(): Promise<void>
  update(patch: SettingsPatch): Promise<boolean>
  resetFingerprint(deviceId: string): Promise<boolean>
}

export const useSettings = create<SettingsStore>((set) => ({
  settings: null,
  error: null,
  load: async () => {
    try {
      set({ settings: await unwrap(api.settings.get()), error: null })
    } catch (error) {
      set({ error: errorMessage(error) })
    }
  },
  update: async (patch) => {
    const settings = await attempt(api.settings.update(patch))
    if (settings) set({ settings })
    return settings !== null
  },
  resetFingerprint: async (deviceId) => {
    const settings = await attempt(api.settings.resetFingerprint(deviceId))
    if (settings) set({ settings })
    return settings !== null
  }
}))
