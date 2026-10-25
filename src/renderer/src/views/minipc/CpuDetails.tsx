import type { SystemStats } from '@shared/types'
import { Section } from '@renderer/components/Section'
import { useMiniPc } from '@renderer/stores/miniPcStore'
import { meterTone } from '@renderer/lib/miniPc'
import { NO_VALUE, formatClock, formatPercent } from '@renderer/lib/miniPcFormat'
import { Bar, Fact, TONE_TEXT, ValueSkeleton } from './parts'

const GOVERNOR_LABELS: Readonly<Record<string, string>> = {
  powersave: 'sparsam (powersave)',
  performance: 'volle Leistung (performance)',
  schedutil: 'nach Bedarf (schedutil)',
  ondemand: 'nach Bedarf (ondemand)',
  conservative: 'zurückhaltend (conservative)'
}

interface CoreRowProps {
  readonly index: number
  readonly percent: number
  readonly mhz: number | undefined
}

function CoreRow({ index, percent, mhz }: CoreRowProps): React.JSX.Element {
  const label = `Thread ${index + 1}`
  const tone = meterTone(percent)
  const clock = mhz === undefined ? NO_VALUE : formatClock(mhz)
  return (
    <li className="grid grid-cols-[3.25rem_minmax(0,1fr)_2.75rem_4.25rem] items-center gap-x-3 py-1.5">
      <span className="text-xs text-ink-3">{label}</span>
      <Bar label={label} percent={percent} tone={tone} valueText={`${formatPercent(percent)} Auslastung, Takt ${clock}`} />
      <span className={`num text-right text-[0.8125rem] font-[560] ${TONE_TEXT[tone]}`}>{formatPercent(percent)}</span>
      <span className="num text-right text-xs text-ink-3">{clock}</span>
    </li>
  )
}

/** Auslastung und Takt je Thread (logischer Kern), dazu Modell, Maximaltakt und Taktregler. */
export function CpuDetails({ system }: { readonly system: SystemStats }): React.JSX.Element {
  const info = useMiniPc((s) => s.info)
  const infoError = useMiniPc((s) => s.infoError)
  const pending = info ? null : infoError ? NO_VALUE : <ValueSkeleton />
  const governor = system.governor ? (GOVERNOR_LABELS[system.governor] ?? system.governor) : NO_VALUE
  return (
    <Section id="minipc-cpu" title="Prozessor" description="Auslastung und Takt je Thread (logischer Kern)">
      <div className="space-y-3.5">
        {system.corePercents.length > 0 ? (
          <ul>
            {system.corePercents.map((percent, i) => (
              <CoreRow key={i} index={i} percent={percent} mhz={system.coreMhz[i]} />
            ))}
          </ul>
        ) : (
          <p className="text-[0.8125rem] text-ink-3">Keine Werte je Thread gelesen.</p>
        )}
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 border-t border-line pt-3.5">
          <div className="col-span-2">
            <Fact label="Modell" wrap>
              {pending ?? info?.cpuModel}
            </Fact>
          </div>
          <Fact label="Maximaltakt">{pending ?? (info?.cpuMaxMhz ? formatClock(info.cpuMaxMhz) : NO_VALUE)}</Fact>
          <Fact label="Taktregler">{governor}</Fact>
        </dl>
      </div>
    </Section>
  )
}
