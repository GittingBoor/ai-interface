import { create } from 'zustand'
import { speechReady, type SpeechModelId, type SpeechProgress, type SpeechStatus } from '@shared/speech'
import { api } from '@renderer/api/client'
import { attempt } from '@renderer/api/call'
import { BrowserRecorder } from '@renderer/lib/recorder'
import { SpeechController, type SpeechPhase } from '@renderer/lib/speechController'
import { deliverTranscript } from '@renderer/lib/speechTargets'
import type { SpeechTarget } from '@renderer/lib/speechText'
import { notify } from './toastStore'
import { useSettings } from './settingsStore'

interface SpeechStore {
  readonly phase: SpeechPhase
  readonly target: SpeechTarget | null
  readonly status: SpeechStatus | null
  readonly progress: SpeechProgress | null
  /** Modell, für das der Einrichtungsdialog offen ist. */
  readonly setupModel: SpeechModelId | null
  loadStatus(): Promise<void>
  toggle(target: SpeechTarget): Promise<void>
  cancel(): void
  openSetup(model: SpeechModelId): void
  closeSetup(): void
  install(model: SpeechModelId): Promise<void>
  cancelInstall(): Promise<void>
  removeModel(model: SpeechModelId): Promise<void>
  selectModel(model: SpeechModelId): Promise<void>
}

export const useSpeech = create<SpeechStore>((set, get) => {
  const controller = new SpeechController({
    recorder: new BrowserRecorder(),
    transcribe: (wav) => api.speech.transcribe(wav),
    deliver: deliverTranscript,
    notify: { info: (t, h) => notify.info(t, h), error: (t, h) => notify.error(t, h) },
    onChange: (phase, target) => set({ phase, target }),
    deviceId: () => useSettings.getState().settings?.speech.deviceId ?? ''
  })
  api.on('speech:progress', (progress) => set({ progress }))

  const applyStatus = (status: SpeechStatus | null): void => {
    if (status) set({ status })
  }

  return {
    phase: 'idle',
    target: null,
    status: null,
    progress: null,
    setupModel: null,
    loadStatus: async () => applyStatus(await attempt(api.speech.status())),
    toggle: async (target) => {
      if (get().phase === 'idle') {
        if (!get().status) await get().loadStatus()
        const status = get().status
        if (!status) return
        if (!status.supported) {
          notify.info('Spracheingabe nur unter Windows eingerichtet', 'Win+H oder /voice in Claude Code nutzen.')
          return
        }
        if (!speechReady(status)) {
          get().openSetup(status.model)
          return
        }
      }
      await controller.toggle(target)
    },
    cancel: () => controller.cancel(),
    openSetup: (model) => set({ setupModel: model, progress: null }),
    closeSetup: () => set({ setupModel: null }),
    install: async (model) => {
      const current = get().status
      set({ progress: { model, receivedBytes: 0, totalBytes: 0 }, status: current ? { ...current, installing: model } : null })
      const status = await attempt(api.speech.install(model))
      set({ progress: null })
      if (status) {
        set({ status })
        await get().selectModel(model)
        notify.success('Spracheingabe bereit.')
        set({ setupModel: null })
      } else {
        await get().loadStatus()
      }
    },
    cancelInstall: async () => {
      await attempt(api.speech.cancelInstall())
    },
    removeModel: async (model) => applyStatus(await attempt(api.speech.removeModel(model))),
    selectModel: async (model) => {
      const status = await attempt(api.speech.setModel(model))
      applyStatus(status)
      await useSettings.getState().load()
      if (status && !status.installedModels.includes(model)) get().openSetup(model)
    }
  }
})
