import type { SystemStats } from '@shared/types'
import { formatBytes, formatTime } from '@renderer/lib/format'
import { formatUptime, meterTone, usagePercent } from '@renderer/lib/miniPc'
import { formatPercent } from '@renderer/lib/miniPcFormat'
import { Fact, Meter } from './parts'

const LOAD_DECIMALS = 2
const LOAD_LABELS = ['1 Min.', '5 Min.', '15 Min.'] as const

const loadFormat = new Intl.NumberFormat('de-DE', { minimumFractionDigits: LOAD_DECIMALS, maximumFractionDigits: LOAD_DECIMALS })

interface SystemCardProps {
  readonly system: SystemStats
  readonly fetchedAt: number
}

/** Auslastung des Geräts: CPU, Arbeitsspeicher, Datenträger, Laufzeit und Last. */
export function SystemCard({ system, fetchedAt }: SystemCardProps): React.JSX.Element {
  const [load1, load5, load15] = system.load
  const memPercent = usagePercent(system.memUsed, system.memTotal)
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-x-8 gap-y-5">
        <Meter label="CPU" percent={system.cpuPercent} tone={meterTone(system.cpuPercent)} value={formatPercent(system.cpuPercent)} detail={`${system.cores} Threads`} />
        <Meter label="Arbeitsspeicher" percent={memPercent} tone={meterTone(memPercent)} value={formatPercent(memPercent)} detail={`${formatBytes(system.memUsed)} von ${formatBytes(system.memTotal)}`} />
        {system.disks.map((d) => {
          const percent = usagePercent(d.used, d.total)
          return (
            <Meter
              key={d.mount}
              label={`Speicher ${d.mount}`}
              percent={percent}
              tone={meterTone(percent)}
              value={formatPercent(percent)}
              detail={`${formatBytes(d.used)} von ${formatBytes(d.total)}`}
            />
          )
        })}
      </div>
      <dl className="grid grid-cols-3 border-t border-line pt-3.5">
        <Fact label="Laufzeit">{formatUptime(system.uptimeSec)}</Fact>
        <Fact label="Last 1 · 5 · 15 Min.">
          <span title={LOAD_LABELS.map((l, i) => `${l}: ${loadFormat.format(system.load[i] ?? 0)}`).join(', ')}>
            {loadFormat.format(load1)} · {loadFormat.format(load5)} · {loadFormat.format(load15)}
          </span>
        </Fact>
        <Fact label="Stand">{formatTime(fetchedAt)} Uhr</Fact>
      </dl>
    </div>
  )
}
