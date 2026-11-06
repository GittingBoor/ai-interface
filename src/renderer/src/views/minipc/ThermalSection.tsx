import { Fan } from 'lucide-react'
import type { FanReading, SystemStats, TempReading } from '@shared/types'
import { useT } from '@renderer/i18n/useT'
import { Section } from '@renderer/components/Section'
import { formatInteger } from '@renderer/lib/format'
import { DEFAULT_CRIT_CELSIUS, fanStages, fanStagesText, tempLabel, tempTone, throttleText, usagePercent } from '@renderer/lib/miniPc'
import { formatCelsius } from '@renderer/lib/miniPcFormat'
import { Fact, Meter, TONE_TEXT } from './parts'

function TempMeter({ temp }: { readonly temp: TempReading }): React.JSX.Element {
  const t = useT().device
  const limit = temp.critCelsius ?? DEFAULT_CRIT_CELSIUS
  return (
    <Meter
      label={tempLabel(temp)}
      percent={usagePercent(temp.celsius, limit)}
      tone={tempTone(temp)}
      value={formatCelsius(temp.celsius)}
      detail={temp.critCelsius === null ? t.tempNoLimit : t.tempLimit(formatCelsius(temp.critCelsius))}
      title={t.sensorTitle(temp.chip, temp.label)}
    />
  )
}

function FanSpeeds({ fans }: { readonly fans: readonly FanReading[] }): React.JSX.Element {
  const t = useT().device
  return (
    <>
      {fans.map((fan, i) => (
        <Fact key={`${fan.chip}-${fan.label}-${i}`} label={fan.label || (fans.length > 1 ? t.fanNumbered(i + 1) : t.fan)}>
          <span title={t.sensorChip(fan.chip)}>{fan.rpm > 0 ? t.fanRpm(formatInteger(fan.rpm)) : t.fanStopped}</span>
        </Fact>
      ))}
    </>
  )
}

/** Lüfter ohne Drehzahlfühler: nur die ACPI-Stufen sagen, ob er läuft. */
function FanStagesFact({ system }: { readonly system: SystemStats }): React.JSX.Element {
  const t = useT().device
  const stages = fanStages(system.cooling)
  return (
    <Fact label={t.fan}>
      <span className="inline-flex items-center gap-1.5">
        <Fan className={`size-3.5 shrink-0 ${stages && stages.active > 0 ? 'text-ink-2' : 'text-ink-3'}`} aria-hidden strokeWidth={1.75} />
        {stages ? fanStagesText(stages) : t.fanNotReported}
      </span>
    </Fact>
  )
}

/** Alle Temperaturfühler, der Lüfter und die Hitzedrosselung. */
export function ThermalSection({ system }: { readonly system: SystemStats }): React.JSX.Element {
  const t = useT().device
  const hasSpeeds = system.fans.length > 0
  const throttled = (system.throttleCount ?? 0) > 0
  return (
    <Section id="minipc-thermal" title={t.thermalTitle} description={t.thermalDesc}>
      <div className="space-y-5">
        {system.temps.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-x-8 gap-y-5">
            {system.temps.map((temp, i) => (
              <TempMeter key={`${temp.chip}-${temp.label}-${i}`} temp={temp} />
            ))}
          </div>
        ) : (
          <p className="text-[0.8125rem] text-ink-3">{t.thermalNone}</p>
        )}
        <div className="space-y-2 border-t border-line pt-3.5">
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-x-8 gap-y-3">
            {hasSpeeds ? <FanSpeeds fans={system.fans} /> : <FanStagesFact system={system} />}
            <Fact label={t.throttling}>
              <span className={throttled ? TONE_TEXT.warn : undefined}>{throttleText(system.throttleCount)}</span>
            </Fact>
          </dl>
          {hasSpeeds ? null : <p className="max-w-[70ch] text-2xs leading-relaxed text-ink-3">{t.fanNote}</p>}
        </div>
      </div>
    </Section>
  )
}
