export const speech = {
  title: 'Spracheingabe',
  unsupportedDescription: 'Nur unter Windows automatisch eingerichtet. Hier Win+H bzw. /voice nutzen.',
  description: 'whisper.cpp läuft lokal auf der Grafikkarte (Vulkan). Nichts verlässt den PC.',
  remove: 'Entfernen',
  load: 'Laden',
  removeAria: (model: string): string => `Modell ${model} entfernen`,
  loadAria: (model: string): string => `Modell ${model} laden`,
  microphone: 'Mikrofon',
  windowsDefault: 'Windows-Standard',
  microphoneUnnamed: 'Mikrofon (Name nach erster Aufnahme)',
  hotkeyLabel: (keys: string): string => `Tastenkürzel ${keys}`,
  hotkeyDescription: 'Startet und stoppt das Diktat ohne Maus. Standardmäßig aus.',
  mic: {
    stop: (shortcut: string): string => `Aufnahme beenden${shortcut} · Esc verwirft`,
    transcribing: 'Wird erkannt …',
    dictate: (shortcut: string): string => `Diktieren${shortcut}`,
    chooseModel: 'Sprachmodell wählen',
    modelMenu: 'Sprachmodell',
    notLoaded: (mb: number): string => `Nicht geladen · ${mb} MB`
  },
  setup: {
    title: 'Spracheingabe einrichten',
    modelPrefix: 'Modell',
    downloadInfo: (mb: number): string => `Download ca. ${mb} MB. Läuft danach komplett offline.`,
    downloadInfoWithEngine: (mb: number): string => `Download ca. ${mb} MB (inkl. whisper.cpp mit Vulkan). Läuft danach komplett offline.`,
    progressAria: 'Download-Fortschritt',
    progressValue: (percent: number, received: number, total: number): string => `${percent} %, ${received} von ${total} MB`,
    progressText: (percent: number, received: number, total: number): string => `${percent} % · ${received} / ${total} MB`,
    later: 'Später',
    download: 'Herunterladen'
  },
  nothingRecognized: 'Nichts erkannt',
  targetClosed: 'Terminal ist nicht mehr offen, Text verworfen',
  processingFailed: 'Aufnahme konnte nicht verarbeitet werden',
  recorder: {
    startFailed: 'Aufnahme konnte nicht starten',
    micHint: 'Windows: Einstellungen > Datenschutz und Sicherheit > Mikrofon prüfen.',
    denied: 'Mikrofonzugriff verweigert',
    notFound: 'Kein Mikrofon gefunden',
    notFoundHint: (micHint: string): string => `Im Tab Steuerung ein anderes Mikrofon wählen. ${micHint}`,
    openFailed: 'Mikrofon konnte nicht geöffnet werden'
  }
}
