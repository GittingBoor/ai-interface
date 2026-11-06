import type { Messages } from '../messages'

export const main: Messages['main'] = {
  defaults: { protocolDir: 'Registri', categories: { coding: 'Programmazione', work: 'Lavoro', learning: 'Studio' } },
  speechHotkeyKeys: ['Ctrl', 'Maiusc', 'Spazio'],
  thisPc: 'Questo PC',
  deviceFallback: 'Dispositivo',
  untitled: 'Senza titolo',
  quotaReached: 'Quota raggiunta',
  orchestratorTitle: 'Orchestratore',
  taskReviewTitle: 'Verifica attività',
  dialogs: { startScripts: 'Script di avvio', allFiles: 'Tutti i file' },
  imageTitles: {
    fromUser: (date) => `Da te · ${date}`,
    aiImage: (date) => `Immagine IA · ${date}`,
    screenshot: (name, date) => `Screenshot · ${name} · ${date}`
  },
  prerequisites: {
    claudeMissing: 'Senza Claude Code non ci sono terminali, consumi né assistente.',
    loginLabel: 'Accesso a Claude effettuato',
    loginViaKey: (variable) => `Chiave API (${variable})`,
    loginHint: 'Avvia claude una volta e accedi dal browser (account Pro, Max, Team o API).',
    gitBashMissing: 'Senza Git Bash non ci sono notifiche desktop né stato (al lavoro, finito, domanda) nei terminali.'
  },
  speechModels: {
    'small-q5_1': { label: 'Veloce', description: 'Piccolo e rapido, sbaglia più facilmente i termini tecnici.' },
    'large-v3-turbo-q5_0': { label: 'Standard', description: 'Buona precisione, meno di un secondo sulla GPU.' },
    'large-v3-q5_0': { label: 'Preciso', description: 'Riconoscimento migliore, ma molto più lento.' }
  }
}
