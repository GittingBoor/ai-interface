import type { Messages } from '../messages'

export const format: Messages['format'] = {
  justNow: 'à l’instant',
  lessThanMinute: '< 1 min',
  unitSecond: 's',
  unitMinute: 'min',
  unitHour: 'h',
  unitDay: 'j',
  overdueDays: (days: number): string => `en retard de ${days} ${days === 1 ? 'jour' : 'jours'}`,
  linkStates: { UP: 'connecté', DOWN: 'déconnecté', UNKNOWN: 'inconnu', DORMANT: 'en veille', LOWERLAYERDOWN: 'aucun lien' },
  dockerStates: {
    running: 'en cours',
    exited: 'arrêté',
    restarting: 'redémarrage',
    paused: 'en pause',
    created: 'créé',
    dead: 'planté',
    removing: 'suppression'
  },
  dockerUnits: { second: 's', minute: 'min', hour: 'h', day: 'j', week: 'sem.', month: 'mois', year: 'an' },
  dockerHealth: { healthy: 'sain', unhealthy: 'défaillant', 'health: starting': 'vérification' },
  dockerAbout: (span: string): string => `environ 1 ${span}`,
  dockerLessThan: (span: string): string => `moins de 1 ${span}`,
  dockerUp: (span: string): string => `actif depuis ${span}`,
  dockerUpHealthy: (span: string, health: string): string => `actif depuis ${span} · ${health}`,
  dockerExited: (span: string, code: string): string => `arrêté il y a ${span} (code ${code})`
}
