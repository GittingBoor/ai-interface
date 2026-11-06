import type { Messages } from './i18n/messages'
import type { HostId } from './types'

/** Wörterbuchbereich für Automatisierungen. */
export type AutomationsText = Messages['automations']

export type AutomationSchedule =
  | { readonly kind: 'manual' }
  | { readonly kind: 'interval'; readonly minutes: number }
  /** `time` als `HH:MM` (Ortszeit), `weekdays` 0 = Sonntag … 6 = Samstag. */
  | { readonly kind: 'daily'; readonly time: string; readonly weekdays: readonly number[] }

/** Rechte eines Laufs ohne Zuschauer (`--permission-mode`). */
export type AutomationPermission = 'plan' | 'default' | 'acceptEdits' | 'bypassPermissions'

export interface AutomationInput {
  readonly name: string
  /** Agent-Name für `--agent`; `null` = normales Claude. */
  readonly agent: string | null
  readonly host: HostId
  /** Arbeitsordner des Laufs. */
  readonly cwd: string
  /** Auftrag an den Agent. */
  readonly prompt: string
  readonly schedule: AutomationSchedule
  readonly permission: AutomationPermission
  /** Modell für diesen Lauf; `null` = wie Agent bzw. Standard. */
  readonly model: string | null
  readonly timeoutMinutes: number
  readonly notify: boolean
  readonly enabled: boolean
}

export interface Automation extends AutomationInput {
  readonly id: number
  readonly createdAt: number
  /** Nächster geplanter Start; `null` = nur manuell oder ausgeschaltet. */
  readonly nextRunAt: number | null
  readonly lastRun: AutomationRun | null
  readonly running: boolean
}

export type AutomationRunStatus = 'running' | 'success' | 'error' | 'skipped'
export type AutomationTrigger = 'schedule' | 'manual'

export interface AutomationRun {
  readonly id: number
  readonly automationId: number
  readonly trigger: AutomationTrigger
  readonly status: AutomationRunStatus
  readonly startedAt: number
  readonly finishedAt: number | null
  /** Antwort von Claude (gekürzt) bzw. Grund fürs Überspringen. */
  readonly result: string
  readonly error: string | null
  readonly sessionId: string | null
  readonly costUsd: number | null
  readonly turns: number | null
}

export interface PermissionChoice {
  readonly value: AutomationPermission
  readonly label: string
  readonly explain: string
}

const PERMISSION_VALUES: readonly AutomationPermission[] = ['plan', 'default', 'acceptEdits', 'bypassPermissions']

export const permissionChoices = (t: AutomationsText): readonly PermissionChoice[] => PERMISSION_VALUES.map((value) => ({ value, ...t.permission[value] }))

export const MIN_INTERVAL_MINUTES = 5
export const DEFAULT_TIMEOUT_MINUTES = 30
export const MAX_TIMEOUT_MINUTES = 240
/** Wochentage der Auswahl, Montag zuerst; `day` 0 = Sonntag. */
export const WEEKDAY_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0]
const WORKDAYS = [1, 2, 3, 4, 5]
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const MINUTE_MS = 60_000
const DAYS_AHEAD = 8

export const parseTime = (time: string): { readonly hours: number; readonly minutes: number } | null => {
  const m = TIME_PATTERN.exec(time)
  return m ? { hours: Number(m[1]), minutes: Number(m[2]) } : null
}

/** Nächster Start nach `after` (ms); `null` bei „manuell“ oder ungültigem Plan. */
export function nextRunAt(schedule: AutomationSchedule, after: number): number | null {
  switch (schedule.kind) {
    case 'manual':
      return null
    case 'interval':
      return schedule.minutes >= MIN_INTERVAL_MINUTES ? after + schedule.minutes * MINUTE_MS : null
    case 'daily': {
      const time = parseTime(schedule.time)
      if (!time || schedule.weekdays.length === 0) return null
      for (let offset = 0; offset < DAYS_AHEAD; offset++) {
        const d = new Date(after)
        d.setDate(d.getDate() + offset)
        d.setHours(time.hours, time.minutes, 0, 0)
        if (d.getTime() > after && schedule.weekdays.includes(d.getDay())) return d.getTime()
      }
      return null
    }
  }
}

function dayText(weekdays: readonly number[], t: AutomationsText): string {
  const set = [...new Set(weekdays)].sort()
  if (set.length === ALL_DAYS.length) return t.schedule.daily
  if (set.length === WORKDAYS.length && WORKDAYS.every((d) => set.includes(d))) return t.schedule.workdays
  if (set.length === 2 && set.includes(0) && set.includes(6)) return t.schedule.weekend
  return WEEKDAY_ORDER.filter((day) => set.includes(day))
    .map((day) => t.weekdaysShort[day] ?? '')
    .join(', ')
}

/** Zeitplan in Worten: „werktags um 08:00“, „alle 2 Std.“. */
export function describeSchedule(schedule: AutomationSchedule, t: AutomationsText): string {
  switch (schedule.kind) {
    case 'manual':
      return t.schedule.manual
    case 'interval':
      if (schedule.minutes % 60 === 0) return schedule.minutes === 60 ? t.schedule.hourly : t.schedule.everyHours(schedule.minutes / 60)
      return t.schedule.everyMinutes(schedule.minutes)
    case 'daily':
      return t.schedule.dailyAt(dayText(schedule.weekdays, t), schedule.time)
  }
}

/** Fehlertext für ungültige Eingaben, sonst `null`. */
export function validateAutomation(input: AutomationInput, t: AutomationsText): string | null {
  if (!input.name.trim()) return t.validate.nameMissing
  if (!input.cwd.trim()) return t.validate.folderMissing
  if (!input.prompt.trim()) return t.validate.promptMissing
  if (input.timeoutMinutes < 1 || input.timeoutMinutes > MAX_TIMEOUT_MINUTES) return t.validate.timeout(MAX_TIMEOUT_MINUTES)
  const s = input.schedule
  if (s.kind === 'interval' && (!Number.isInteger(s.minutes) || s.minutes < MIN_INTERVAL_MINUTES)) return t.validate.interval(MIN_INTERVAL_MINUTES)
  if (s.kind === 'daily' && !parseTime(s.time)) return t.validate.time
  if (s.kind === 'daily' && s.weekdays.length === 0) return t.validate.weekdays
  return null
}

export const EMPTY_AUTOMATION: AutomationInput = {
  name: '',
  agent: null,
  host: 'local',
  cwd: '',
  prompt: '',
  schedule: { kind: 'daily', time: '08:00', weekdays: WORKDAYS },
  permission: 'plan',
  model: null,
  timeoutMinutes: DEFAULT_TIMEOUT_MINUTES,
  notify: true,
  enabled: true
}
