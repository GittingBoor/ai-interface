import type { Messages } from '../messages'

export const format: Messages['format'] = {
  justNow: 'ahora mismo',
  lessThanMinute: '< 1 min',
  unitSecond: 's',
  unitMinute: 'min',
  unitHour: 'h',
  unitDay: 'd',
  overdueDays: (days: number): string => `vencido hace ${days} ${days === 1 ? 'día' : 'días'}`,
  linkStates: { UP: 'conectado', DOWN: 'desconectado', UNKNOWN: 'desconocido', DORMANT: 'inactivo', LOWERLAYERDOWN: 'sin enlace' },
  dockerStates: {
    running: 'en ejecución',
    exited: 'detenido',
    restarting: 'reiniciando',
    paused: 'en pausa',
    created: 'creado',
    dead: 'fallido',
    removing: 'eliminando'
  },
  dockerUnits: { second: 's', minute: 'min', hour: 'h', day: 'd', week: 'sem.', month: 'mes.', year: 'a' },
  dockerHealth: { healthy: 'correcto', unhealthy: 'con fallos', 'health: starting': 'comprobando' },
  dockerAbout: (span: string): string => `aprox. 1 ${span}`,
  dockerLessThan: (span: string): string => `menos de 1 ${span}`,
  dockerUp: (span: string): string => `activo desde hace ${span}`,
  dockerUpHealthy: (span: string, health: string): string => `activo desde hace ${span} · ${health}`,
  dockerExited: (span: string, code: string): string => `finalizado hace ${span} (código ${code})`
}
