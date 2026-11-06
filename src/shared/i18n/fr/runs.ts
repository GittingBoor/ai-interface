import type { Messages } from '../messages'

export const runs: Messages['runs'] = {
  description: 'Exécutions interrompues faute de quota',
  quotaFree: 'Quota disponible',
  quotaFreeBody: (percent: string): string => `Fenêtre de 5 heures à ${percent}. Vous pouvez reprendre.`,
  quotaFull: 'Quota épuisé',
  quotaFullUntil: (time: string, countdown: string): string => `jusqu’à ${time} (dans ${countdown}). Toute reprise d’ici là s’interrompra aussitôt.`,
  quotaFullUnknown: 'L’heure de réinitialisation est inconnue.',
  quotaUnknown: 'Quota inconnu',
  quotaLoading: 'interrogation en cours …',
  quotaNoSource: 'aucune source récente, voir en bas à gauche.',
  abortedAgo: (age: string): string => `interrompue ${age}`,
  noPrompt: 'Dernière saisie non enregistrée.',
  quoted: (text: string): string => `« ${text} »`,
  resumedNote: 'Reprise dans le terminal · disparaît dès que Claude répond de nouveau.',
  dismiss: 'Terminé',
  dismissTitle: 'Retirer de la liste sans reprendre',
  resume: 'Reprendre',
  reopen: 'Rouvrir',
  resumeTitle: (name: string): string => `claude --resume dans ${name}`,
  resumeAll: 'Tout reprendre',
  resumeAllCount: (n: number): string => `Tout reprendre (${n})`,
  emptyTitle: 'Rien en attente – toutes les exécutions sont terminées',
  emptyBody: 'Si Claude s’interrompt faute de quota, l’exécution apparaît ici. Dès que le quota est de nouveau disponible, vous la reprenez d’un clic.',
  runCount: (n: number): string => (n <= 1 ? `${n} exécution` : `${n} exécutions`)
}
