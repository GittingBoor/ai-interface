import type { CoolingDevice, FanReading, TempReading } from '@shared/types'
import { numberOrNull } from './sections'

const MILLI = 1000
const FIELD = '|'

/** Zeilen `chip|label|milligrad|kritisch` aus `/sys/class/hwmon`. */
export function parseTemps(lines: readonly string[]): TempReading[] {
  const result: TempReading[] = []
  for (const line of lines) {
    const [chip = '', label = '', value, crit] = line.split(FIELD)
    const milli = numberOrNull(value)
    if (!chip || milli === null) continue
    const critMilli = numberOrNull(crit)
    result.push({ chip, label: label.trim(), celsius: milli / MILLI, critCelsius: critMilli !== null && critMilli > 0 ? critMilli / MILLI : null })
  }
  return result
}

/** Zeilen `chip|label|U/min` aus `/sys/class/hwmon` (nur mit passendem Sensor-Treiber vorhanden). */
export function parseFans(lines: readonly string[]): FanReading[] {
  const result: FanReading[] = []
  for (const line of lines) {
    const [chip = '', label = '', value] = line.split(FIELD)
    const rpm = numberOrNull(value)
    if (!chip || rpm === null) continue
    result.push({ chip, label: label.trim(), rpm })
  }
  return result
}

/** Zeilen `typ|stufe|höchste Stufe` aus `/sys/class/thermal/cooling_device*`. */
export function parseCooling(lines: readonly string[]): CoolingDevice[] {
  const result: CoolingDevice[] = []
  for (const line of lines) {
    const [type = '', state, max] = line.split(FIELD)
    const current = numberOrNull(state)
    if (!type || current === null) continue
    result.push({ type, state: current, maxState: numberOrNull(max) ?? 0 })
  }
  return result
}
