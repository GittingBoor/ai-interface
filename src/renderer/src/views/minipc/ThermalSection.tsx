import { Fan } from 'lucide-react'
import type { FanReading, SystemStats, TempReading } from '@shared/types'
import { Section } from '@renderer/components/Section'
import { formatInteger } from '@renderer/lib/format'
import { DEFAULT_CRIT_CELSIUS, fanStages, fanStagesText, tempLabel, tempTone, throttleText, usagePercent } from '@renderer/lib/miniPc'
import { formatCelsius } from '@renderer/lib/miniPcFormat'
import { Fact, Meter, TONE_TEXT } from './parts'

function TempMeter({ temp }: { readonly temp: TempReading }): React.JSX.Element {
  const limit = temp.critCelsius ?? DEFAULT_CRIT_CELSIUS
  return (
    <Meter
      label={tempLabel(temp)}
      percent={usagePercent(temp.celsius, limit)}
      tone={tempTone(temp)}
      value={formatCelsius(temp.celsius)}
      detail={temp.critCelsius === null ? 'kein Grenzwert gemeldet' : `Grenze ${formatCelsius(temp.critCelsius)}`}
      title={`Fühler ${temp.chip}${temp.label ? ` · ${temp.label}` : ''}`}
    />
  )
}

function FanSpeeds({ fans }: { readonly fans: readonly FanReading[] }): React.JSX.Element {
  return (
    <>
      {fans.map((fan, i) => (
        <Fact key={`${fan.chip}-${fan.label}-${i}`} label={fan.label || (fans.length > 1 ? `Lüfter ${i + 1}` : 'Lüfter')}>
          <span title={`Fühler ${fan.chip}`}>{fan.rpm > 0 ? `${formatInteger(fan.rpm)} U/min` : 'steht'}</span>
        </Fact>
      ))}
    </>
  )
}

/** Lüfter ohne Drehzahlfühler: nur die ACPI-Stufen sagen, ob er läuft. */
function FanStagesFact({ system }: { readonly system: SystemStats }): React.JSX.Element {
  const stages = fanStages(system.cooling)
  return (
    <Fact label="Lüfter">
      <span className="inline-flex items-center gap-1.5">
        <Fan className={`size-3.5 shrink-0 ${stages && stages.active > 0 ? 'text-ink-2' : 'text-ink-3'}`} aria-hidden strokeWidth={1.75} />
        {stages ? fanStagesText(stages) : 'nicht gemeldet'}
      </span>
    </Fact>
  )
}

/** Alle Temperaturfühler, der Lüfter und die Hitzedrosselung. */
export function ThermalSection({ system }: { readonly system: SystemStats }): React.JSX.Element {
  const hasSpeeds = system.fans.length > 0
  const throttled = (system.throttleCount ?? 0) > 0
  return (
    <Section id="minipc-thermal" title="Temperaturen und Lüfter" description="Jeder Fühler, gemessen an seinem Grenzwert">
      <div className="space-y-5">
        {system.temps.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-x-8 gap-y-5">
            {system.temps.map((temp, i) => (
              <TempMeter key={`${temp.chip}-${temp.label}-${i}`} temp={temp} />
            ))}
          </div>
        ) : (
          <p className="text-[0.8125rem] text-ink-3">Das Gerät meldet keine Temperaturfühler.</p>
        )}
        <div className="space-y-2 border-t border-line pt-3.5">
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-x-8 gap-y-3">
            {hasSpeeds ? <FanSpeeds fans={system.fans} /> : <FanStagesFact system={system} />}
            <Fact label="Hitzedrosselung">
              <span className={throttled ? TONE_TEXT.warn : undefined}>{throttleText(system.throttleCount)}</span>
            </Fact>
          </dl>
          {hasSpeeds ? null : <p className="max-w-[70ch] text-2xs leading-relaxed text-ink-3">Dieses Gerät meldet ohne Zusatztreiber keine Drehzahl, nur die Schaltstufen des Lüfters.</p>}
        </div>
      </div>
    </Section>
  )
}
