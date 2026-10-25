import type { DockerContainer, DriveInfo, MiniPcInfo, NetAddress } from '@shared/types'
import { isVirtualInterface } from './parseCounters'
import { numberOrNull, sections } from './sections'

const FIELD = '|'
const KHZ_PER_MHZ = 1000
const DECIMAL = 1000
const BINARY = 1024
const BYTE_UNITS: Readonly<Record<string, number>> = {
  B: 1,
  kB: DECIMAL,
  KB: DECIMAL,
  MB: DECIMAL ** 2,
  GB: DECIMAL ** 3,
  KiB: BINARY,
  MiB: BINARY ** 2,
  GiB: BINARY ** 3,
  TiB: BINARY ** 4
}

function keyValues(lines: readonly string[]): Map<string, string> {
  const result = new Map<string, string>()
  for (const line of lines) {
    const split = line.indexOf('=')
    if (split > 0) result.set(line.slice(0, split), line.slice(split + 1).trim())
  }
  return result
}

/** „4.762GiB“ → Bytes. */
function dockerBytes(text: string | undefined): number | null {
  const match = /^([\d.]+)\s*([A-Za-z]+)$/.exec(text?.trim() ?? '')
  const unit = match?.[2] ? BYTE_UNITS[match[2]] : undefined
  return match?.[1] && unit ? Math.round(Number(match[1]) * unit) : null
}

interface DockerUsage {
  readonly cpuPercent: number | null
  readonly memBytes: number | null
  readonly memLimitBytes: number | null
}

const NO_USAGE: DockerUsage = { cpuPercent: null, memBytes: null, memLimitBytes: null }

/** Zeilen `name|cpu%|belegt / grenze` aus `docker stats`. */
function dockerUsage(lines: readonly string[]): Map<string, DockerUsage> {
  const result = new Map<string, DockerUsage>()
  for (const line of lines) {
    const [name = '', cpu = '', mem = ''] = line.split(FIELD)
    const [used, limit] = mem.split('/')
    if (name) result.set(name, { cpuPercent: numberOrNull(cpu.replace('%', '')), memBytes: dockerBytes(used), memLimitBytes: dockerBytes(limit) })
  }
  return result
}

/** Zeilen `name|zustand|status|image` aus `docker ps -a`, ergänzt um die Werte aus `docker stats`. */
function dockerContainers(lines: readonly string[], usage: ReadonlyMap<string, DockerUsage>): DockerContainer[] {
  const result: DockerContainer[] = []
  for (const line of lines) {
    const [name = '', state = '', status = '', image = ''] = line.split(FIELD)
    if (name) result.push({ name, image, state, status, ...(usage.get(name) ?? NO_USAGE) })
  }
  return result
}

/** Zeilen `name bytes modell` aus `lsblk`. */
function drives(lines: readonly string[]): DriveInfo[] {
  return lines.map((line) => {
    const [name = '', size = '0', ...model] = line.trim().split(/\s+/)
    return { name, sizeBytes: Number(size) || 0, model: model.join(' ') }
  })
}

/** Zeilen `name zustand adresse …` aus `ip -br addr`, ohne virtuelle Schnittstellen. */
function addresses(lines: readonly string[]): NetAddress[] {
  const result: NetAddress[] = []
  for (const line of lines) {
    const [rawName = '', state = '', ...list] = line.trim().split(/\s+/)
    const name = rawName.split('@')[0] ?? rawName
    if (name && !isVirtualInterface(name)) result.push({ name, state, addresses: list })
  }
  return result
}

/** Liest die Ausgabe von `infoScript()`. */
export function parseInfo(stdout: string, fetchedAt: number): MiniPcInfo {
  const s = sections(stdout)
  const kv = keyValues(s.get('KV') ?? [])
  const text = (key: string): string => kv.get(key) ?? ''
  const maxKhz = numberOrNull(kv.get('cpumax'))
  return {
    vendor: text('vendor'),
    model: text('model'),
    bios: [text('bios'), text('biosdate')].filter(Boolean).join(' · '),
    os: text('os'),
    kernel: text('kernel'),
    hostname: text('hostname'),
    cpuModel: text('cpu'),
    cpuMaxMhz: maxKhz === null ? null : maxKhz / KHZ_PER_MHZ,
    drives: drives(s.get('DRIVES') ?? []),
    addresses: addresses(s.get('ADDR') ?? []),
    updates: numberOrNull(kv.get('updates')) ?? 0,
    rebootRequired: text('reboot') === '1',
    failedUnits: (s.get('FAILED') ?? []).map((l) => l.trim()),
    users: numberOrNull(kv.get('users')) ?? 0,
    docker: s.has('DOCKEROK') ? dockerContainers(s.get('DOCKER') ?? [], dockerUsage(s.get('DSTATS') ?? [])) : null,
    fetchedAt
  }
}
