import type { TopProcess } from '@shared/types'

const KIB = 1024
const TOTAL = 'total'

export interface ProcessList {
  readonly processes: TopProcess[]
  readonly count: number
}

/** Zeilen `pid cpu rss befehl` aus `ps`, zuletzt `total <anzahl>`. */
export function parseProcesses(lines: readonly string[]): ProcessList {
  const processes: TopProcess[] = []
  let count = 0
  for (const line of lines) {
    const [first = '', cpu = '', rss = '', ...command] = line.trim().split(/\s+/)
    if (first === TOTAL) {
      count = Number(cpu) || 0
      continue
    }
    const pid = Number(first)
    if (!Number.isInteger(pid) || command.length === 0) continue
    processes.push({ pid, cpuPercent: Number(cpu) || 0, memBytes: (Number(rss) || 0) * KIB, command: command.join(' ') })
  }
  return { processes, count }
}
