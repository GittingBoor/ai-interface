export const format = {
  justNow: 'gerade eben',
  lessThanMinute: '< 1 Min.',
  unitSecond: 's',
  unitMinute: 'Min.',
  unitHour: 'Std.',
  unitDay: 'Tg.',
  overdueDays: (days: number): string => `seit ${days} ${days === 1 ? 'Tag' : 'Tagen'}`,
  linkStates: { UP: 'verbunden', DOWN: 'getrennt', UNKNOWN: 'unbekannt', DORMANT: 'ruht', LOWERLAYERDOWN: 'kein Link' },
  dockerStates: {
    running: 'läuft',
    exited: 'gestoppt',
    restarting: 'startet neu',
    paused: 'pausiert',
    created: 'angelegt',
    dead: 'abgestürzt',
    removing: 'wird entfernt'
  },
  dockerUnits: { second: 'Sek.', minute: 'Min.', hour: 'Std.', day: 'Tg.', week: 'Wo.', month: 'Mon.', year: 'J.' },
  dockerHealth: { healthy: 'gesund', unhealthy: 'nicht gesund', 'health: starting': 'Prüfung läuft' },
  dockerAbout: (span: string): string => `etwa 1 ${span}`,
  dockerLessThan: (span: string): string => `unter 1 ${span}`,
  dockerUp: (span: string): string => `seit ${span}`,
  dockerUpHealthy: (span: string, health: string): string => `seit ${span} · ${health}`,
  dockerExited: (span: string, code: string): string => `vor ${span} beendet (Code ${code})`
}
