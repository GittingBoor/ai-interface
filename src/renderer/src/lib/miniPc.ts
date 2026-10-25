import type { CoolingDevice, Favorite, GitState, HostId, SystemStats, TempReading } from '@shared/types'
import { findProjectFor, isInside } from '@shared/projectMatch'

const SECONDS_PER_MINUTE = 60
const SECONDS_PER_HOUR = 3_600
const SECONDS_PER_DAY = 86_400
const PERCENT = 100
/** Ab hier wird eine Auslastung gelb, darüber rot. */
const WARN_PERCENT = 80
const CRITICAL_PERCENT = 92

/** Ab hier wird eine Temperatur gelb, darüber rot (Anteil am kritischen Wert des Fühlers). */
const TEMP_WARN_RATIO = 0.8
const TEMP_CRITICAL_RATIO = 0.92
/** Grenzwert für Fühler, die selbst keinen melden. */
export const DEFAULT_CRIT_CELSIUS = 100
/** Typ der ACPI-Lüfterstufen in `/sys/class/thermal`. */
const COOLING_FAN_TYPE = 'Fan'
const PACKAGE_LABEL = /^Package id \d+$/i
const CORE_LABEL = /^Core (\d+)$/i
const CHIP_LABELS: readonly (readonly [RegExp, string])[] = [
  [/^pch_/, 'Chipsatz'],
  [/^acpitz$/, 'Gehäuse'],
  [/^drivetemp$/, 'SSD'],
  [/^nvme/, 'SSD']
]
/** Eine Stunde Verlauf bei einem Abruf alle 10 Sekunden. */
export const HISTORY_LIMIT = 360

export type MeterTone = 'normal' | 'warn' | 'critical'

/** Ein Messpunkt des Verlaufs im Gerätebereich. */
export interface HistoryPoint {
  readonly at: number
  readonly cpuPercent: number
  readonly memPercent: number
  /** Wärmster Fühler in °C. */
  readonly tempCelsius: number | null
  /** Empfang und Versand aller Schnittstellen in Bytes/s. */
  readonly rxRate: number | null
  readonly txRate: number | null
  readonly powerWatts: number | null
}

/** Wärmster Fühler, `null` ohne Temperaturwerte. */
export function hottestTemp(temps: readonly TempReading[]): TempReading | null {
  return temps.reduce<TempReading | null>((max, t) => (max === null || t.celsius > max.celsius ? t : max), null)
}

export function tempTone(temp: Pick<TempReading, 'celsius' | 'critCelsius'>): MeterTone {
  const ratio = temp.celsius / (temp.critCelsius ?? DEFAULT_CRIT_CELSIUS)
  if (ratio >= TEMP_CRITICAL_RATIO) return 'critical'
  if (ratio >= TEMP_WARN_RATIO) return 'warn'
  return 'normal'
}

/** Verständlicher Name eines Fühlers: „CPU gesamt“, „Kern 1“, „Chipsatz“, „Gehäuse“, „SSD“, sonst der Chipname. */
export function tempLabel(temp: Pick<TempReading, 'chip' | 'label'>): string {
  if (temp.chip === 'coretemp') {
    if (PACKAGE_LABEL.test(temp.label)) return 'CPU gesamt'
    const core = CORE_LABEL.exec(temp.label)
    if (core) return `Kern ${Number(core[1]) + 1}`
  }
  const known = CHIP_LABELS.find(([pattern]) => pattern.test(temp.chip))
  if (known) return known[1]
  return temp.label ? `${temp.chip} · ${temp.label}` : temp.chip
}

/** Zusammengefasste ACPI-Lüfterstufen: wie viele der Stufen gerade laufen. */
export interface FanStages {
  readonly total: number
  readonly active: number
}

/** `null`, wenn das Gerät keine ACPI-Lüfterstufen meldet. */
export function fanStages(cooling: readonly CoolingDevice[]): FanStages | null {
  const stages = cooling.filter((c) => c.type === COOLING_FAN_TYPE)
  if (stages.length === 0) return null
  return { total: stages.length, active: stages.filter((c) => c.state > 0).length }
}

export function fanStagesText(stages: FanStages): string {
  if (stages.active === 0) return 'Lüfter aus'
  return `Lüfter läuft (${stages.active} von ${stages.total} ${stages.total === 1 ? 'Stufe' : 'Stufen'})`
}

/** „nie“ bzw. „3-mal seit dem Start“; `null` = das Gerät zählt nicht mit. */
export function throttleText(count: number | null): string {
  if (count === null) return 'nicht gemeldet'
  return count === 0 ? 'nie' : `${count}-mal seit dem Start`
}

/** Summe der Raten; `null`, solange noch keine Schnittstelle eine Rate hat. */
function sumRates(rates: readonly (number | null)[]): number | null {
  const known = rates.filter((r): r is number => r !== null)
  return known.length > 0 ? known.reduce((sum, r) => sum + r, 0) : null
}

export function historyPoint(system: SystemStats, at: number): HistoryPoint {
  return {
    at,
    cpuPercent: system.cpuPercent,
    memPercent: usagePercent(system.memUsed, system.memTotal),
    tempCelsius: hottestTemp(system.temps)?.celsius ?? null,
    rxRate: sumRates(system.net.map((n) => n.rxRate)),
    txRate: sumRates(system.net.map((n) => n.txRate)),
    powerWatts: system.powerWatts
  }
}

/** Hängt einen Messpunkt an und behält höchstens `limit` Punkte. */
export function appendHistory(history: readonly HistoryPoint[], point: HistoryPoint, limit: number = HISTORY_LIMIT): HistoryPoint[] {
  return [...history, point].slice(-limit)
}

/** Laufzeit kompakt: „5 T 6 Std.“, „3 Std. 12 Min.“, „4 Min.“ */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / SECONDS_PER_DAY)
  const hours = Math.floor((seconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR)
  const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)
  if (days > 0) return hours > 0 ? `${days} T ${hours} Std.` : `${days} T`
  if (hours > 0) return minutes > 0 ? `${hours} Std. ${minutes} Min.` : `${hours} Std.`
  return `${minutes} Min.`
}

/** Anteil in Prozent (0–100), sicher gegen Division durch null. */
export function usagePercent(used: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(PERCENT, Math.max(0, (used / total) * PERCENT))
}

export function meterTone(percent: number): MeterTone {
  if (percent >= CRITICAL_PERCENT) return 'critical'
  if (percent >= WARN_PERCENT) return 'warn'
  return 'normal'
}

/** Lokale Änderungen kurz: „1 vorgemerkt · 42 geändert · 3 neu“, leer = sauber. */
export function changeParts(state: Pick<GitState, 'staged' | 'unstaged' | 'untracked'>): string[] {
  const parts: string[] = []
  if (state.staged > 0) parts.push(`${state.staged} vorgemerkt`)
  if (state.unstaged > 0) parts.push(`${state.unstaged} geändert`)
  if (state.untracked > 0) parts.push(`${state.untracked} neu`)
  return parts
}

/** Ersetzt einen Eintrag der Git-Liste (gleicher Pfad) und behält die Reihenfolge. */
export function replaceRepo(repos: readonly GitState[], next: GitState): GitState[] {
  return repos.map((repo) => (repo.path === next.path ? next : repo))
}

/** Favorit, dessen Ordner genau dieses Repository ist (ein übergeordneter Sammelordner zählt nicht). */
export function favoriteForRepo(favorites: readonly Favorite[], host: HostId, path: string): Favorite | undefined {
  const match = findProjectFor(favorites, host, path)
  return match && isInside({ host, path }, host, match.path) ? match : undefined
}
