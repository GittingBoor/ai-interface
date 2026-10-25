import { numberOrNull, numbers } from './sections'

const SECTOR_BYTES = 512
/** Höchstwert der Linkqualität in `/proc/net/wireless`. */
const WIFI_QUALITY_MAX = 70
const PERCENT = 100
/** Schleifen-, Docker- und Brückenschnittstellen zählen nicht als Netzwerk des Geräts. */
const VIRTUAL_INTERFACE = /^(lo$|veth|br-|docker|virbr|tun|tap)/
/** Ganze Datenträger, keine Partitionen. */
const WHOLE_DISK = /^(sd[a-z]+|vd[a-z]+|nvme\d+n\d+|mmcblk\d+)$/
const RX_BYTES = 0
const TX_BYTES = 8
const DISK_NAME = 2
const DISK_SECTORS_READ = 5
const DISK_SECTORS_WRITTEN = 9

export interface NetCounter {
  readonly name: string
  readonly rxBytes: number
  readonly txBytes: number
}

export interface DiskCounter {
  readonly name: string
  readonly readBytes: number
  readonly writtenBytes: number
}

/** Fortlaufende Zähler eines Abrufs; Raten entstehen erst aus zwei Abrufen (`rates.ts`). */
export interface Counters {
  readonly net: readonly NetCounter[]
  readonly disks: readonly DiskCounter[]
  /** Energiezähler der CPU in Mikrojoule. */
  readonly energyUj: number | null
}

export function isVirtualInterface(name: string): boolean {
  return VIRTUAL_INTERFACE.test(name)
}

/** Zeilen aus `/proc/net/dev` ohne Kopf. */
export function parseNetCounters(lines: readonly string[]): NetCounter[] {
  const result: NetCounter[] = []
  for (const line of lines) {
    const split = line.indexOf(':')
    if (split < 0) continue
    const name = line.slice(0, split).trim()
    if (!name || isVirtualInterface(name)) continue
    const values = numbers(line.slice(split + 1))
    result.push({ name, rxBytes: values[RX_BYTES] ?? 0, txBytes: values[TX_BYTES] ?? 0 })
  }
  return result
}

/** Zeilen aus `/proc/diskstats`. */
export function parseDiskCounters(lines: readonly string[]): DiskCounter[] {
  const result: DiskCounter[] = []
  for (const line of lines) {
    const fields = line.trim().split(/\s+/)
    const name = fields[DISK_NAME] ?? ''
    if (!WHOLE_DISK.test(name)) continue
    result.push({ name, readBytes: Number(fields[DISK_SECTORS_READ] ?? 0) * SECTOR_BYTES, writtenBytes: Number(fields[DISK_SECTORS_WRITTEN] ?? 0) * SECTOR_BYTES })
  }
  return result
}

/** Signalqualität der ersten WLAN-Schnittstelle aus `/proc/net/wireless` in Prozent. */
export function parseWifiPercent(lines: readonly string[]): number | null {
  const line = lines[0]
  if (!line) return null
  const fields = line.slice(line.indexOf(':') + 1).trim().split(/\s+/)
  const quality = numberOrNull(fields[1]?.replace(/\.$/, ''))
  return quality === null ? null : Math.min(PERCENT, Math.max(0, (quality / WIFI_QUALITY_MAX) * PERCENT))
}
