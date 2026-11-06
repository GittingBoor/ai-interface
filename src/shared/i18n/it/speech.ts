import type { Messages } from '../messages'

export const speech: Messages['speech'] = {
  title: 'Input vocale',
  unsupportedDescription: 'Configurato automaticamente solo su Windows. Qui usa Win+H oppure /voice.',
  description: 'whisper.cpp gira in locale sulla scheda grafica (Vulkan). Nulla lascia il PC.',
  remove: 'Rimuovi',
  load: 'Scarica',
  removeAria: (model: string): string => `Rimuovi il modello ${model}`,
  loadAria: (model: string): string => `Scarica il modello ${model}`,
  microphone: 'Microfono',
  windowsDefault: 'Predefinito di Windows',
  microphoneUnnamed: 'Microfono (il nome compare dopo la prima registrazione)',
  hotkeyLabel: (keys: string): string => `Scorciatoia ${keys}`,
  hotkeyDescription: 'Avvia e ferma il dettato senza mouse. Disattivata per impostazione predefinita.',
  mic: {
    stop: (shortcut: string): string => `Termina la registrazione${shortcut} · Esc scarta`,
    transcribing: 'Riconoscimento in corso …',
    dictate: (shortcut: string): string => `Dettare${shortcut}`,
    chooseModel: 'Scegli il modello vocale',
    modelMenu: 'Modello vocale',
    notLoaded: (mb: number): string => `Non scaricato · ${mb} MB`
  },
  setup: {
    title: 'Configura l’input vocale',
    modelPrefix: 'Modello',
    downloadInfo: (mb: number): string => `Download di circa ${mb} MB. Poi funziona completamente offline.`,
    downloadInfoWithEngine: (mb: number): string => `Download di circa ${mb} MB (incl. whisper.cpp con Vulkan). Poi funziona completamente offline.`,
    progressAria: 'Avanzamento del download',
    progressValue: (percent: number, received: number, total: number): string => `${percent}%, ${received} di ${total} MB`,
    progressText: (percent: number, received: number, total: number): string => `${percent}% · ${received} / ${total} MB`,
    later: 'Più tardi',
    download: 'Scarica'
  },
  nothingRecognized: 'Nulla riconosciuto',
  targetClosed: 'Il terminale non è più aperto, testo scartato',
  processingFailed: 'Impossibile elaborare la registrazione',
  recorder: {
    startFailed: 'Impossibile avviare la registrazione',
    micHint: 'Windows: controlla Impostazioni > Privacy e sicurezza > Microfono.',
    denied: 'Accesso al microfono negato',
    notFound: 'Nessun microfono trovato',
    notFoundHint: (micHint: string): string => `Scegli un altro microfono nella scheda Comandi. ${micHint}`,
    openFailed: 'Impossibile aprire il microfono'
  }
}
