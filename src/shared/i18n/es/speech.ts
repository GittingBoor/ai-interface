import type { Messages } from '../messages'

export const speech: Messages['speech'] = {
  title: 'Entrada de voz',
  unsupportedDescription: 'Solo se configura automáticamente en Windows. Aquí usa Win+H o /voice.',
  description: 'whisper.cpp se ejecuta en local en la tarjeta gráfica (Vulkan). Nada sale de tu PC.',
  remove: 'Quitar',
  load: 'Descargar',
  removeAria: (model: string): string => `Quitar el modelo ${model}`,
  loadAria: (model: string): string => `Descargar el modelo ${model}`,
  microphone: 'Micrófono',
  windowsDefault: 'Predeterminado de Windows',
  microphoneUnnamed: 'Micrófono (el nombre aparece tras la primera grabación)',
  hotkeyLabel: (keys: string): string => `Atajo ${keys}`,
  hotkeyDescription: 'Inicia y detiene el dictado sin ratón. Desactivado por defecto.',
  mic: {
    stop: (shortcut: string): string => `Terminar la grabación${shortcut} · Esc descarta`,
    transcribing: 'Reconociendo …',
    dictate: (shortcut: string): string => `Dictar${shortcut}`,
    chooseModel: 'Elegir el modelo de voz',
    modelMenu: 'Modelo de voz',
    notLoaded: (mb: number): string => `Sin descargar · ${mb} MB`
  },
  setup: {
    title: 'Configurar la entrada de voz',
    modelPrefix: 'Modelo',
    downloadInfo: (mb: number): string => `Descarga de unos ${mb} MB. Después funciona totalmente sin conexión.`,
    downloadInfoWithEngine: (mb: number): string => `Descarga de unos ${mb} MB (incl. whisper.cpp con Vulkan). Después funciona totalmente sin conexión.`,
    progressAria: 'Progreso de la descarga',
    progressValue: (percent: number, received: number, total: number): string => `${percent} %, ${received} de ${total} MB`,
    progressText: (percent: number, received: number, total: number): string => `${percent} % · ${received} / ${total} MB`,
    later: 'Más tarde',
    download: 'Descargar'
  },
  nothingRecognized: 'No se reconoció nada',
  targetClosed: 'El terminal ya no está abierto; texto descartado',
  processingFailed: 'No se pudo procesar la grabación',
  recorder: {
    startFailed: 'No se pudo iniciar la grabación',
    micHint: 'Windows: revisa Configuración > Privacidad y seguridad > Micrófono.',
    denied: 'Acceso al micrófono denegado',
    notFound: 'No se encontró ningún micrófono',
    notFoundHint: (micHint: string): string => `Elige otro micrófono en la pestaña Controles. ${micHint}`,
    openFailed: 'No se pudo abrir el micrófono'
  }
}
