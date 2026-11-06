import type { Messages } from '../messages'

export const notify: Messages['notify'] = {
  titles: { permission: 'Autorisation requise', question: 'Question de Claude', done: 'Claude a terminé' },
  defaultMessages: { permission: 'Claude a besoin de votre autorisation.', question: 'Claude a une question.', done: 'Claude a terminé.' },
  quotaFreeTitle: 'Quota de nouveau disponible',
  quotaFreeBody: (open) => (open === 1 ? '1 exécution attend d’être reprise.' : `${open} exécutions attendent d’être reprises.`),
  updatingTitle: 'AI Interface se met à jour',
  updatingBody: 'La nouvelle version est compilée, l’application redémarre dans un instant.',
  updateFailedTitle: 'Échec de la mise à jour',
  updateFailedBody: 'L’application continue avec l’ancienne version ; détails dans les paramètres.',
  updateAvailableTitle: 'Mise à jour disponible',
  updateAvailableBody: 'Nouvelle version sur GitHub. Cliquez sur « Mettre à jour » dans la barre latérale.'
}
