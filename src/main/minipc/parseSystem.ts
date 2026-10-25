import type { ClaudeProcess, DiskUsage, SystemStats } from '@shared/types'
import { parseDiskCounters, parseNetCounters, parseWifiPercent, type Counters } from './parseCounters'
import { parseProcesses } from './parseProcesses'
import { parseCooling, parseFans, parseTemps } from './parseSensors'
import { numberOrNull, numbers, sections } from './sections'

const KIB = 1024
const KHZ_PER_MHZ = 1000
const CPU_PREFIX = /^cpu\d*\s+/
const CORE_LINE = /^cpu\d+\s/

/** CPU-Auslastung aus zwei `/proc/stat`-Stichproben (idle + iowait gelten als Leerlauf). */
function cpuPercent(first: string | undefined, second: string | undefined): number {
  const a = numbers(first?.replace(CPU_PREFIX, ''))
  const b = numbers(second?.replace(CPU_PREFIX, ''))
  const total = (v: number[]): number => v.reduce((s, n) => s + n, 0)
  const idle = (v: number[]): number => (v[3] ?? 0) + (v[4] ?? 0)
  const dTotal = total(b) - total(a)
  return dTotal > 0 ? ((dTotal - (idle(b) - idle(a))) / dTotal) * 100 : 0
}

/** Auslastung je Kern aus den `cpuN`-Zeilen beider Stichproben. */
function corePercents(first: readonly string[], second: readonly string[]): number[] {
  const before = first.filter((l) => CORE_LINE.test(l))
  return second.filter((l) => CORE_LINE.test(l)).map((line, i) => cpuPercent(before[i], line))
}

function memInfo(lines: readonly string[], key: string): number {
  const line = lines.find((l) => l.startsWith(`${key}:`))
  return (numbers(line?.slice(key.length + 1))[0] ?? 0) * KIB
}

function disks(lines: readonly string[]): DiskUsage[] {
  const seen = new Set<string>()
  const result: DiskUsage[] = []
  for (const line of lines) {
    const [mount = '', total = '0', used = '0'] = line.trim().split(/\s+/)
    if (!mount || seen.has(mount)) continue
    seen.add(mount)
    result.push({ mount, total: Number(total), used: Number(used) })
  }
  return result
}

/** Liest die Ausgabe von `systemScript()`; Raten (Netz, Datenträger, Leistung) ergänzt `withRates`. */
export function parseSystem(stdout: string): SystemStats {
  const s = sections(stdout)
  const mem = s.get('MEM') ?? []
  const memTotal = memInfo(mem, 'MemTotal')
  const swapTotal = memInfo(mem, 'SwapTotal')
  const [l1 = 0, l5 = 0, l15 = 0] = numbers(s.get('LOAD')?.[0])
  const processes = parseProcesses(s.get('PS') ?? [])
  return {
    cpuPercent: cpuPercent(s.get('STAT1')?.[0], s.get('STAT2')?.[0]),
    memTotal,
    memUsed: memTotal - memInfo(mem, 'MemAvailable'),
    disks: disks(s.get('DF') ?? []),
    uptimeSec: Math.floor(numbers(s.get('UP')?.[0])[0] ?? 0),
    load: [l1, l5, l15],
    cores: numbers(s.get('NPROC')?.[0])[0] ?? 0,
    corePercents: corePercents(s.get('STAT1') ?? [], s.get('STAT2') ?? []),
    coreMhz: numbers((s.get('FREQ') ?? []).join(' ')).map((khz) => khz / KHZ_PER_MHZ),
    governor: s.get('GOV')?.[0]?.trim() ?? null,
    throttleCount: numberOrNull(s.get('THROTTLE')?.[0]),
    memCached: memInfo(mem, 'Cached'),
    swapTotal,
    swapUsed: swapTotal - memInfo(mem, 'SwapFree'),
    temps: parseTemps(s.get('TEMP') ?? []),
    fans: parseFans(s.get('FAN') ?? []),
    cooling: parseCooling(s.get('COOL') ?? []),
    wifiPercent: parseWifiPercent(s.get('WIFI') ?? []),
    net: parseNetCounters(s.get('NET') ?? []).map((c) => ({ ...c, rxRate: null, txRate: null })),
    diskIo: parseDiskCounters(s.get('DISKIO') ?? []).map((c) => ({ name: c.name, readRate: null, writeRate: null })),
    processes: processes.processes,
    processCount: processes.count,
    powerWatts: null
  }
}

/** Fortlaufende Zähler aus der Ausgabe von `systemScript()` (Netz, Datenträger, Energie). */
export function parseCounters(stdout: string): Counters {
  const s = sections(stdout)
  return {
    net: parseNetCounters(s.get('NET') ?? []),
    disks: parseDiskCounters(s.get('DISKIO') ?? []),
    energyUj: numberOrNull(s.get('ENERGY')?.[0])
  }
}

interface RawSession {
  readonly pid?: unknown
  readonly cwd?: unknown
  readonly status?: unknown
  readonly startedAt?: unknown
  readonly name?: unknown
}

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null)

/** Liest `~/.claude/sessions/*.json` (Abschnitt SESS) und behält nur PIDs aus ALIVE. */
export function parseClaudeSessions(stdout: string): ClaudeProcess[] {
  const s = sections(stdout)
  const alive = new Set((s.get('ALIVE') ?? []).map((l) => Number(l.trim())))
  const result: ClaudeProcess[] = []
  for (const line of s.get('SESS') ?? []) {
    let raw: RawSession
    try {
      raw = JSON.parse(line) as RawSession
    } catch {
      continue
    }
    if (typeof raw.pid !== 'number' || !alive.has(raw.pid)) continue
    result.push({ pid: raw.pid, cwd: str(raw.cwd), status: str(raw.status), startedAt: typeof raw.startedAt === 'number' ? raw.startedAt : null, name: str(raw.name) })
  }
  return result
}
