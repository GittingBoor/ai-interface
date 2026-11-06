import type { Messages } from '../messages'

export const format: Messages['format'] = {
  justNow: 'adesso',
  lessThanMinute: '< 1 min',
  unitSecond: 's',
  unitMinute: 'min',
  unitHour: 'h',
  unitDay: 'g',
  overdueDays: (days: number): string => `scaduto da ${days} ${days === 1 ? 'giorno' : 'giorni'}`,
  linkStates: { UP: 'attivo', DOWN: 'inattivo', UNKNOWN: 'sconosciuto', DORMANT: 'in pausa', LOWERLAYERDOWN: 'nessun link' },
  dockerStates: {
    running: 'in esecuzione',
    exited: 'arrestato',
    restarting: 'riavvio',
    paused: 'in pausa',
    created: 'creato',
    dead: 'terminato',
    removing: 'in rimozione'
  },
  dockerUnits: { second: 's', minute: 'min', hour: 'h', day: 'g', week: 'sett.', month: 'mes.', year: 'a' },
  dockerHealth: { healthy: 'sano', unhealthy: 'non sano', 'health: starting': 'verifica in corso' },
  dockerAbout: (span: string): string => `circa 1 ${span}`,
  dockerLessThan: (span: string): string => `meno di 1 ${span}`,
  dockerUp: (span: string): string => `attivo da ${span}`,
  dockerUpHealthy: (span: string, health: string): string => `attivo da ${span} · ${health}`,
  dockerExited: (span: string, code: string): string => `terminato ${span} fa (codice ${code})`
}
