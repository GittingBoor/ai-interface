import type { Messages } from '../messages'

export const format: Messages['format'] = {
  justNow: 'just now',
  lessThanMinute: '< 1 min',
  unitSecond: 's',
  unitMinute: 'min',
  unitHour: 'hr',
  unitDay: 'd',
  overdueDays: (days: number): string => `${days} ${days === 1 ? 'day' : 'days'} overdue`,
  linkStates: { UP: 'up', DOWN: 'down', UNKNOWN: 'unknown', DORMANT: 'dormant', LOWERLAYERDOWN: 'no link' },
  dockerStates: {
    running: 'running',
    exited: 'stopped',
    restarting: 'restarting',
    paused: 'paused',
    created: 'created',
    dead: 'dead',
    removing: 'removing'
  },
  dockerUnits: { second: 'sec', minute: 'min', hour: 'hr', day: 'd', week: 'wk', month: 'mo', year: 'yr' },
  dockerHealth: { healthy: 'healthy', unhealthy: 'unhealthy', 'health: starting': 'checking' },
  dockerAbout: (span: string): string => `about 1 ${span}`,
  dockerLessThan: (span: string): string => `under 1 ${span}`,
  dockerUp: (span: string): string => `up ${span}`,
  dockerUpHealthy: (span: string, health: string): string => `up ${span} · ${health}`,
  dockerExited: (span: string, code: string): string => `exited (code ${code}) ${span} ago`
}
