import type { DiskIoRate, NetRate, SystemStats } from '@shared/types'
import type { Counters } from './parseCounters'

const MS_PER_SECOND = 1000
const MICRO = 1_000_000

/** Zähler eines Abrufs samt Zeitpunkt. */
export interface CounterSample {
  readonly at: number
  readonly counters: Counters
}

/** Rate pro Sekunde; `null` ohne Vorwert oder wenn der Zähler zurückgesprungen ist (Neustart, Überlauf). */
function perSecond(previous: number | null | undefined, current: number, seconds: number): number | null {
  if (previous === null || previous === undefined || seconds <= 0 || current < previous) return null
  return (current - previous) / seconds
}

/** Ergänzt Durchsatz und Leistungsaufnahme aus dem Unterschied zum vorherigen Abruf. */
export function withRates(stats: SystemStats, previous: CounterSample | null, current: CounterSample): SystemStats {
  const seconds = previous ? (current.at - previous.at) / MS_PER_SECOND : 0
  const net: NetRate[] = current.counters.net.map((c) => {
    const before = previous?.counters.net.find((p) => p.name === c.name)
    return { ...c, rxRate: perSecond(before?.rxBytes, c.rxBytes, seconds), txRate: perSecond(before?.txBytes, c.txBytes, seconds) }
  })
  const diskIo: DiskIoRate[] = current.counters.disks.map((c) => {
    const before = previous?.counters.disks.find((p) => p.name === c.name)
    return { name: c.name, readRate: perSecond(before?.readBytes, c.readBytes, seconds), writeRate: perSecond(before?.writtenBytes, c.writtenBytes, seconds) }
  })
  const energy = current.counters.energyUj
  const microWatts = energy === null ? null : perSecond(previous?.counters.energyUj, energy, seconds)
  return { ...stats, net, diskIo, powerWatts: microWatts === null ? null : microWatts / MICRO }
}
