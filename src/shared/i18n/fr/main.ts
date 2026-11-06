import type { Messages } from '../messages'

export const main: Messages['main'] = {
  defaults: { protocolDir: 'Journaux', categories: { coding: 'Programmation', work: 'Travail', learning: 'Apprentissage' } },
  speechHotkeyKeys: ['Ctrl', 'Maj', 'Espace'],
  thisPc: 'Ce PC',
  deviceFallback: 'Appareil',
  untitled: 'Sans titre',
  quotaReached: 'Quota atteint',
  orchestratorTitle: 'Orchestrateur',
  taskReviewTitle: 'Revue des tâches',
  dialogs: { startScripts: 'Scripts de démarrage', allFiles: 'Tous les fichiers' },
  imageTitles: {
    fromUser: (date) => `De vous · ${date}`,
    aiImage: (date) => `Image IA · ${date}`,
    screenshot: (name, date) => `Capture d’écran · ${name} · ${date}`
  },
  prerequisites: {
    claudeMissing: 'Sans Claude Code, il n’y a ni terminaux, ni suivi de consommation, ni assistant.',
    loginLabel: 'Connecté à Claude',
    loginViaKey: (variable) => `Clé d’API (${variable})`,
    loginHint: 'Lancez claude une fois et connectez-vous dans le navigateur (compte Pro, Max, Team ou API).',
    gitBashMissing: 'Sans Git Bash, il n’y a ni notifications de bureau ni état (au travail, terminé, question) dans les terminaux.'
  },
  speechModels: {
    'small-q5_1': { label: 'Rapide', description: 'Petit et vif, se trompe plus souvent sur les termes techniques.' },
    'large-v3-turbo-q5_0': { label: 'Standard', description: 'Bonne précision, moins d’une seconde sur le GPU.' },
    'large-v3-q5_0': { label: 'Précis', description: 'Meilleure reconnaissance, nettement plus lent.' }
  }
}
