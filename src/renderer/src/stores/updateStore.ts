import { create } from 'zustand'
import type { UpdatePhase, UpdateState } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt } from '@renderer/api/call'
import { confirmAction } from '@renderer/stores/confirmStore'

/** Abschnitt „Updates“ in den Einstellungen. */
export const UPDATES_SETTINGS_ANCHOR = 'updates'

/** Phasen, in denen die Seitenleiste einen Hinweis zeigt. */
const NOTICE_PHASES: ReadonlySet<UpdatePhase> = new Set<UpdatePhase>(['available', 'building', 'installing', 'failed'])

export function showsUpdateNotice(state: UpdateState | null): state is UpdateState {
  return state !== null && NOTICE_PHASES.has(state.phase)
}

interface UpdateStore {
  readonly state: UpdateState | null
  readonly checking: boolean
  load(): Promise<void>
  receive(state: UpdateState): void
  check(): Promise<void>
  install(): Promise<void>
}

export const useUpdate = create<UpdateStore>((set) => ({
  state: null,
  checking: false,
  load: async () => {
    const state = await attempt(api.update.state())
    if (state) set({ state })
  },
  receive: (state) => set({ state }),
  check: async () => {
    set({ checking: true })
    const state = await attempt(api.update.check())
    set(state ? { state, checking: false } : { checking: false })
  },
  install: async () => {
    const ok = await confirmAction({
      title: 'Jetzt aktualisieren?',
      message: 'Die neue Version wird gebaut (einige Minuten), danach schließt sich die App, installiert das Update und startet neu. Offene Terminals werden dabei beendet.',
      confirmLabel: 'Aktualisieren'
    })
    if (!ok) return
    await attempt(api.update.install())
  }
}))
