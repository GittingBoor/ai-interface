import { AlertTriangle, RotateCw } from 'lucide-react'
import type { MiniPcInfo } from '@shared/types'
import { useT } from '@renderer/i18n/useT'
import { Section } from '@renderer/components/Section'
import { Skeleton } from '@renderer/components/States'
import { useMiniPc } from '@renderer/stores/miniPcStore'
import { formatTime } from '@renderer/lib/format'
import { Fact } from './parts'

const SKELETON_FACTS = 6
const FACT_GRID = 'grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-x-8 gap-y-3.5'

function FailedUnits({ units }: { readonly units: readonly string[] }): React.JSX.Element {
  const t = useT().device
  return (
    <div className="border-t border-line pt-3.5">
      <p className="flex items-center gap-1.5 text-xs font-[560] text-danger-ink">
        <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
        {t.servicesFailedHeading(units.length)}
      </p>
      <ul className="mt-1.5 space-y-0.5 pl-5">
        {units.map((unit) => (
          <li key={unit} className="font-mono text-xs break-all text-ink-2">
            {unit}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Facts({ info }: { readonly info: MiniPcInfo }): React.JSX.Element {
  const t = useT().device
  return (
    <div className="space-y-3.5">
      <dl className={FACT_GRID}>
        <Fact label={t.factDevice} wrap>
          {info.vendor} {info.model}
        </Fact>
        <Fact label={t.factHostname} wrap>
          {info.hostname}
        </Fact>
        <Fact label={t.factOs} wrap>
          {info.os}
        </Fact>
        <Fact label={t.factKernel} wrap>
          {info.kernel}
        </Fact>
        <Fact label={t.factBios} wrap>
          {info.bios}
        </Fact>
        <Fact label={t.factUsers}>{info.users === 0 ? t.usersNobody : t.usersCount(info.users)}</Fact>
        <Fact label={t.factUpdates}>
          <span className={info.updates > 0 ? 'text-ink' : undefined}>{info.updates === 0 ? t.updatesCurrent : t.updatesPending(info.updates)}</span>
        </Fact>
        <Fact label={t.factReboot}>
          {info.rebootRequired ? (
            <span className="inline-flex items-center gap-1.5 text-warn">
              <RotateCw className="size-3.5 shrink-0" aria-hidden />
              {t.rebootNeeded}
            </span>
          ) : (
            t.rebootNotNeeded
          )}
        </Fact>
        <Fact label={t.factServices}>{info.failedUnits.length === 0 ? t.servicesOk : <span className="text-danger-ink">{t.servicesFailed(info.failedUnits.length)}</span>}</Fact>
      </dl>
      {info.failedUnits.length > 0 ? <FailedUnits units={info.failedUnits} /> : null}
    </div>
  )
}

function FactsSkeleton(): React.JSX.Element {
  const t = useT().device
  return (
    <div className={FACT_GRID} aria-busy="true" aria-label={t.factsLoadingAria}>
      {Array.from({ length: SKELETON_FACTS }, (_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      ))}
    </div>
  )
}

/** Hersteller, Betriebssystem, Updates und Dienste des Geräts. */
export function DeviceFacts(): React.JSX.Element {
  const t = useT().device
  const info = useMiniPc((s) => s.info)
  const infoError = useMiniPc((s) => s.infoError)
  return (
    <Section id="minipc-device" title={t.factDevice} description={info ? t.factsStamp(formatTime(info.fetchedAt)) : t.factsDesc}>
      {info ? <Facts info={info} /> : infoError ? <p className="text-[0.8125rem] text-ink-3">{t.infoMissing}</p> : <FactsSkeleton />}
    </Section>
  )
}
