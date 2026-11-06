import type { SystemStats } from '@shared/types'
import { formatBytes, formatTime } from '@renderer/lib/format'
import { formatUptime, meterTone, usagePercent } from '@renderer/lib/miniPc'
import { formatPercent } from '@renderer/lib/miniPcFormat'
import { Fact, Meter } from './parts'
import { localized } from '@renderer/i18n/activeLocale'
import { useT } from '@renderer/i18n/useT'

const LOAD_DECIMALS = 2
const LOAD_WINDOWS = [1, 5, 15] as const

const loadFormat = localized((tag) => new Intl.NumberFormat(tag, { minimumFractionDigits: LOAD_DECIMALS, maximumFractionDigits: LOAD_DECIMALS }))

interface SystemCardProps {
  readonly system: SystemStats
  readonly fetchedAt: number
}

/** Auslastung des Geräts: CPU, Arbeitsspeicher, Datenträger, Laufzeit und Last. */
export function SystemCard({ system, fetchedAt }: SystemCardProps): React.JSX.Element {
  const t = useT().device
  const [load1, load5, load15] = system.load
  const memPercent = usagePercent(system.memUsed, system.memTotal)
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-x-8 gap-y-5">
        <Meter label="CPU" percent={system.cpuPercent} tone={meterTone(system.cpuPercent)} value={formatPercent(system.cpuPercent)} detail={t.threads(system.cores)} />
        <Meter label={t.sectionMemory} percent={memPercent} tone={meterTone(memPercent)} value={formatPercent(memPercent)} detail={t.ofTotal(formatBytes(system.memUsed), formatBytes(system.memTotal))} />
        {system.disks.map((d) => {
          const percent = usagePercent(d.used, d.total)
          return (
            <Meter
              key={d.mount}
              label={t.storage(d.mount)}
              percent={percent}
              tone={meterTone(percent)}
              value={formatPercent(percent)}
              detail={t.ofTotal(formatBytes(d.used), formatBytes(d.total))}
            />
          )
        })}
      </div>
      <dl className="grid grid-cols-3 border-t border-line pt-3.5">
        <Fact label={t.uptimeLabel}>{formatUptime(system.uptimeSec)}</Fact>
        <Fact label={t.loadLabel}>
          <span title={LOAD_WINDOWS.map((w, i) => `${t.loadWindow(w)}: ${loadFormat().format(system.load[i] ?? 0)}`).join(', ')}>
            {loadFormat().format(load1)} · {loadFormat().format(load5)} · {loadFormat().format(load15)}
          </span>
        </Fact>
        <Fact label={t.asOf}>{t.clockTime(formatTime(fetchedAt))}</Fact>
      </dl>
    </div>
  )
}
