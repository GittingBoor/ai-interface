import { useMemo, useState } from 'react'
import type { SystemStats } from '@shared/types'
import { Section } from '@renderer/components/Section'
import { useMiniPc } from '@renderer/stores/miniPcStore'
import { formatDuration } from '@renderer/lib/format'
import { hottestTemp, tempTone, type HistoryPoint } from '@renderer/lib/miniPc'
import { formatCelsius, formatPercent, formatRate, formatWatts } from '@renderer/lib/miniPcFormat'
import type { TrendDomainOptions, TrendValue } from '@renderer/lib/trend'
import { TrendChart, type TrendSeries } from './TrendChart'

const BYTES_PER_KIB = 1024
/** Die Linien tragen die Gerätefarbe der App; die zweite Reihe ist zurückgenommen und gestrichelt. */
const LINE_COLOR = 'var(--color-mini)'
const SECOND_LINE_COLOR = 'var(--color-ink-2)'

const PERCENT_DOMAIN: TrendDomainOptions = { zeroBased: true, minSpan: 10 }
const TEMP_DOMAIN: TrendDomainOptions = { zeroBased: false, minSpan: 10 }
const RATE_DOMAIN: TrendDomainOptions = { zeroBased: true, minSpan: 10 * BYTES_PER_KIB, unitBase: BYTES_PER_KIB }
const POWER_DOMAIN: TrendDomainOptions = { zeroBased: true, minSpan: 5 }

function column(history: readonly HistoryPoint[], pick: (point: HistoryPoint) => TrendValue): readonly TrendValue[] {
  return history.map(pick)
}

const single = (key: string, label: string, values: readonly TrendValue[]): readonly TrendSeries[] => [{ key, label, values, color: LINE_COLOR }]

function describe(history: readonly HistoryPoint[]): string {
  const first = history[0]
  const last = history[history.length - 1]
  if (!first || !last || history.length < 2) return 'Eine Messung alle 10 Sekunden, höchstens die letzte Stunde'
  return `Letzte ${formatDuration(last.at - first.at)} · eine Messung alle 10 Sekunden, höchstens eine Stunde`
}

/** Verlaufslinien für CPU, Arbeitsspeicher, Temperatur, Netzwerk und Leistungsaufnahme. */
export function HistorySection({ system }: { readonly system: SystemStats }): React.JSX.Element {
  const history = useMiniPc((s) => s.history)
  const [hover, setHover] = useState<number | null>(null)
  const times = useMemo(() => history.map((p) => p.at), [history])
  const hottest = hottestTemp(system.temps)
  const hasTemp = history.some((p) => p.tempCelsius !== null)
  const hasPower = history.some((p) => p.powerWatts !== null)
  const shared = { times, hover, onHover: setHover }
  return (
    <Section id="minipc-history" title="Verlauf" description={describe(history)}>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-x-8 gap-y-5">
        <TrendChart {...shared} title="CPU" format={formatPercent} domain={PERCENT_DOMAIN} series={single('cpu', 'CPU', column(history, (p) => p.cpuPercent))} />
        <TrendChart {...shared} title="Arbeitsspeicher" format={formatPercent} domain={PERCENT_DOMAIN} series={single('mem', 'Arbeitsspeicher', column(history, (p) => p.memPercent))} />
        {hasTemp ? (
          <TrendChart
            {...shared}
            title="Temperatur (wärmster Fühler)"
            format={formatCelsius}
            domain={TEMP_DOMAIN}
            tone={hottest ? tempTone(hottest) : 'normal'}
            series={single('temp', 'Temperatur', column(history, (p) => p.tempCelsius))}
          />
        ) : null}
        <TrendChart
          {...shared}
          title="Netzwerk"
          format={formatRate}
          domain={RATE_DOMAIN}
          series={[
            { key: 'rx', label: 'Down', values: column(history, (p) => p.rxRate), color: LINE_COLOR },
            { key: 'tx', label: 'Up', values: column(history, (p) => p.txRate), color: SECOND_LINE_COLOR, dashed: true }
          ]}
        />
        {hasPower ? (
          <TrendChart {...shared} title="Leistungsaufnahme der CPU" format={formatWatts} domain={POWER_DOMAIN} series={single('power', 'Leistung', column(history, (p) => p.powerWatts))} />
        ) : null}
      </div>
    </Section>
  )
}
