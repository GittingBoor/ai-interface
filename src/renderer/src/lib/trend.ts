/** Rechenhelfer für die Verlaufslinien: Kennwerte, Wertebereich und lückenfeste Liniensegmente. */
import { niceTicks } from '../components/charts/geometry'

const DOMAIN_TICKS = 2
/** Raster für Bereiche, die nicht bei null beginnen (Temperatur in 5-Grad-Schritten). */
const FLOATING_STEP = 5
/** Abstand zwischen Linie und Rand eines nicht nullbasierten Bereichs. */
const FLOATING_PADDING = 2

export type TrendValue = number | null

export interface TrendStats {
  readonly min: number
  readonly max: number
  /** Anzahl der vorhandenen Werte. */
  readonly count: number
}

/** Kleinster und größter vorhandener Wert; `null`, wenn es keinen gibt. */
export function trendStats(values: readonly TrendValue[]): TrendStats | null {
  const known = values.filter((v): v is number => v !== null && Number.isFinite(v))
  if (known.length === 0) return null
  return { min: Math.min(...known), max: Math.max(...known), count: known.length }
}

export interface TrendDomainOptions {
  /** `true`: Achse beginnt bei 0 (Auslastung, Durchsatz, Leistung). */
  readonly zeroBased: boolean
  /** Kleinste Spanne, damit ruhige Werte nicht zur Zackenlinie aufgeblasen werden. */
  readonly minSpan: number
  /** Einheitenbasis für runde Obergrenzen, z. B. 1024 bei Bytes. */
  readonly unitBase?: number
}

/** Rundet auf eine glatte Obergrenze; mit `unitBase` glatt in der passenden Einheit (KB, MB, …). */
function niceTop(max: number, unitBase: number | undefined): number {
  const unit = unitBase && max >= unitBase ? unitBase ** Math.floor(Math.log(max) / Math.log(unitBase)) : 1
  const ticks = niceTicks(max / unit, DOMAIN_TICKS, 1)
  return (ticks[ticks.length - 1] ?? max / unit) * unit
}

/** Wertebereich der Achse als `[unten, oben]`. */
export function trendDomain(stats: TrendStats, options: TrendDomainOptions): readonly [number, number] {
  if (options.zeroBased) return [0, niceTop(Math.max(stats.max, options.minSpan), options.unitBase)]
  let low = Math.floor((stats.min - FLOATING_PADDING) / FLOATING_STEP) * FLOATING_STEP
  let high = Math.ceil((stats.max + FLOATING_PADDING) / FLOATING_STEP) * FLOATING_STEP
  while (high - low < options.minSpan) {
    high += FLOATING_STEP
    if (high - low < options.minSpan) low -= FLOATING_STEP
  }
  return [low, high]
}

/** Zusammenhängende Abschnitte ohne Lücke, als Listen von Indizes. */
export function trendSegments(values: readonly TrendValue[]): number[][] {
  const segments: number[][] = []
  let current: number[] = []
  values.forEach((value, index) => {
    if (value !== null && Number.isFinite(value)) {
      current.push(index)
      return
    }
    if (current.length > 0) segments.push(current)
    current = []
  })
  if (current.length > 0) segments.push(current)
  return segments
}

/** Index des Zeitpunkts, der `target` am nächsten liegt; `null` bei leerer Liste. */
export function nearestIndex(times: readonly number[], target: number): number | null {
  if (times.length === 0) return null
  let best = 0
  times.forEach((time, index) => {
    if (Math.abs(time - target) < Math.abs((times[best] ?? time) - target)) best = index
  })
  return best
}
