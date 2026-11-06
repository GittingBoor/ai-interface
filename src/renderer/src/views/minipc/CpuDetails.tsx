import type { SystemStats } from '@shared/types'
import { Section } from '@renderer/components/Section'
import { useT } from '@renderer/i18n/useT'
import { useMiniPc } from '@renderer/stores/miniPcStore'
import { meterTone } from '@renderer/lib/miniPc'
import { NO_VALUE, formatClock, formatPercent } from '@renderer/lib/miniPcFormat'
import { Bar, Fact, TONE_TEXT, ValueSkeleton } from './parts'

interface CoreRowProps {
  readonly index: number
  readonly percent: number
  readonly mhz: number | undefined
}

function CoreRow({ index, percent, mhz }: CoreRowProps): React.JSX.Element {
  const t = useT().device
  const label = t.cpuThread(index + 1)
  const tone = meterTone(percent)
  const clock = mhz === undefined ? NO_VALUE : formatClock(mhz)
  return (
    <li className="grid grid-cols-[3.25rem_minmax(0,1fr)_2.75rem_4.25rem] items-center gap-x-3 py-1.5">
      <span className="text-xs text-ink-3">{label}</span>
      <Bar label={label} percent={percent} tone={tone} valueText={t.cpuCoreValue(formatPercent(percent), clock)} />
      <span className={`num text-right text-[0.8125rem] font-[560] ${TONE_TEXT[tone]}`}>{formatPercent(percent)}</span>
      <span className="num text-right text-xs text-ink-3">{clock}</span>
    </li>
  )
}

/** Auslastung und Takt je Thread (logischer Kern), dazu Modell, Maximaltakt und Taktregler. */
export function CpuDetails({ system }: { readonly system: SystemStats }): React.JSX.Element {
  const t = useT().device
  const info = useMiniPc((s) => s.info)
  const infoError = useMiniPc((s) => s.infoError)
  const pending = info ? null : infoError ? NO_VALUE : <ValueSkeleton />
  const governor = system.governor ? (Object.hasOwn(t.governors, system.governor) ? t.governors[system.governor as keyof typeof t.governors] : system.governor) : NO_VALUE
  return (
    <Section id="minipc-cpu" title={t.sectionCpu} description={t.cpuDesc}>
      <div className="space-y-3.5">
        {system.corePercents.length > 0 ? (
          <ul>
            {system.corePercents.map((percent, i) => (
              <CoreRow key={i} index={i} percent={percent} mhz={system.coreMhz[i]} />
            ))}
          </ul>
        ) : (
          <p className="text-[0.8125rem] text-ink-3">{t.cpuNoThreads}</p>
        )}
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 border-t border-line pt-3.5">
          <div className="col-span-2">
            <Fact label={t.cpuModel} wrap>
              {pending ?? info?.cpuModel}
            </Fact>
          </div>
          <Fact label={t.cpuMaxClock}>{pending ?? (info?.cpuMaxMhz ? formatClock(info.cpuMaxMhz) : NO_VALUE)}</Fact>
          <Fact label={t.cpuGovernor}>{governor}</Fact>
        </dl>
      </div>
    </Section>
  )
}
