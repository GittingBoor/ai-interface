import type { Messages } from '../messages'

export const speech: Messages['speech'] = {
  title: 'Voice input',
  unsupportedDescription: 'Set up automatically on Windows only. Use Win+H or /voice here.',
  description: 'whisper.cpp runs locally on the graphics card (Vulkan). Nothing leaves your PC.',
  remove: 'Remove',
  load: 'Download',
  removeAria: (model: string): string => `Remove model ${model}`,
  loadAria: (model: string): string => `Download model ${model}`,
  microphone: 'Microphone',
  windowsDefault: 'Windows default',
  microphoneUnnamed: 'Microphone (name appears after the first recording)',
  hotkeyLabel: (keys: string): string => `Shortcut ${keys}`,
  hotkeyDescription: 'Starts and stops dictation without the mouse. Off by default.',
  mic: {
    stop: (shortcut: string): string => `Stop recording${shortcut} · Esc discards`,
    transcribing: 'Recognizing …',
    dictate: (shortcut: string): string => `Dictate${shortcut}`,
    chooseModel: 'Choose speech model',
    modelMenu: 'Speech model',
    notLoaded: (mb: number): string => `Not downloaded · ${mb} MB`
  },
  setup: {
    title: 'Set up voice input',
    modelPrefix: 'Model',
    downloadInfo: (mb: number): string => `Download approx. ${mb} MB. Afterwards it runs completely offline.`,
    downloadInfoWithEngine: (mb: number): string => `Download approx. ${mb} MB (incl. whisper.cpp with Vulkan). Afterwards it runs completely offline.`,
    progressAria: 'Download progress',
    progressValue: (percent: number, received: number, total: number): string => `${percent}%, ${received} of ${total} MB`,
    progressText: (percent: number, received: number, total: number): string => `${percent}% · ${received} / ${total} MB`,
    later: 'Later',
    download: 'Download'
  },
  nothingRecognized: 'Nothing recognized',
  targetClosed: 'The terminal is no longer open, text discarded',
  processingFailed: 'The recording could not be processed',
  recorder: {
    startFailed: 'Recording could not start',
    micHint: 'Windows: check Settings > Privacy & security > Microphone.',
    denied: 'Microphone access denied',
    notFound: 'No microphone found',
    notFoundHint: (micHint: string): string => `Choose another microphone in the Controls tab. ${micHint}`,
    openFailed: 'The microphone could not be opened'
  }
}
