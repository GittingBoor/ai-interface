import type { SpeechModelId } from '../../speech'

export const main = {
  defaults: { protocolDir: 'Protokolle', categories: { coding: 'Programmieren', work: 'Arbeit', learning: 'Lernen' } },
  speechHotkeyKeys: ['Strg', 'Shift', 'Leertaste'],
  thisPc: 'Dieser PC',
  deviceFallback: 'Gerät',
  untitled: 'Ohne Titel',
  quotaReached: 'Kontingent erreicht',
  orchestratorTitle: 'Orchestrator',
  taskReviewTitle: 'Aufgaben-Prüfung',
  dialogs: { startScripts: 'Start-Skripte', allFiles: 'Alle Dateien' },
  imageTitles: {
    fromUser: (date: string): string => `Von dir · ${date}`,
    aiImage: (date: string): string => `KI-Bild · ${date}`,
    screenshot: (name: string, date: string): string => `Screenshot · ${name} · ${date}`
  },
  prerequisites: {
    claudeMissing: 'Ohne Claude Code laufen keine Terminals, kein Verbrauch und kein Assistent.',
    loginLabel: 'Bei Claude angemeldet',
    loginViaKey: (variable: string): string => `API-Schlüssel (${variable})`,
    loginHint: 'Einmal claude starten und im Browser anmelden (Pro-, Max-, Team- oder API-Konto).',
    gitBashMissing: 'Ohne Git Bash keine Desktop-Meldungen und kein Status (arbeitet, fertig, Frage) in den Terminals.'
  },
  speechModels: {
    'small-q5_1': { label: 'Schnell', description: 'Klein und flott, verhört sich eher bei Fachbegriffen.' },
    'large-v3-turbo-q5_0': { label: 'Standard', description: 'Gutes Deutsch, auf der GPU unter einer Sekunde.' },
    'large-v3-q5_0': { label: 'Genau', description: 'Beste Erkennung, deutlich langsamer.' }
  } satisfies Record<SpeechModelId, { label: string; description: string }>
}
