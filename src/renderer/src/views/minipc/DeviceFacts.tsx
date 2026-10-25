import { AlertTriangle, RotateCw } from 'lucide-react'
import type { MiniPcInfo } from '@shared/types'
import { Section } from '@renderer/components/Section'
import { Skeleton } from '@renderer/components/States'
import { useMiniPc } from '@renderer/stores/miniPcStore'
import { formatTime } from '@renderer/lib/format'
import { Fact } from './parts'

const SKELETON_FACTS = 6
const FACT_GRID = 'grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-x-8 gap-y-3.5'

function updatesText(count: number): string {
  if (count === 0) return 'alles aktuell'
  return count === 1 ? '1 Update offen' : `${count} Updates offen`
}

function usersText(count: number): string {
  if (count === 0) return 'niemand'
  return count === 1 ? '1 Nutzer' : `${count} Nutzer`
}

function FailedUnits({ units }: { readonly units: readonly string[] }): React.JSX.Element {
  return (
    <div className="border-t border-line pt-3.5">
      <p className="flex items-center gap-1.5 text-xs font-[560] text-danger-ink">
        <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
        {units.length === 1 ? '1 systemd-Dienst ist fehlgeschlagen' : `${units.length} systemd-Dienste sind fehlgeschlagen`}
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
  return (
    <div className="space-y-3.5">
      <dl className={FACT_GRID}>
        <Fact label="Gerät" wrap>
          {info.vendor} {info.model}
        </Fact>
        <Fact label="Hostname" wrap>
          {info.hostname}
        </Fact>
        <Fact label="Betriebssystem" wrap>
          {info.os}
        </Fact>
        <Fact label="Kernel" wrap>
          {info.kernel}
        </Fact>
        <Fact label="BIOS" wrap>
          {info.bios}
        </Fact>
        <Fact label="Angemeldet">{usersText(info.users)}</Fact>
        <Fact label="Updates">
          <span className={info.updates > 0 ? 'text-ink' : undefined}>{updatesText(info.updates)}</span>
        </Fact>
        <Fact label="Neustart">
          {info.rebootRequired ? (
            <span className="inline-flex items-center gap-1.5 text-warn">
              <RotateCw className="size-3.5 shrink-0" aria-hidden />
              Neustart nötig
            </span>
          ) : (
            'nicht nötig'
          )}
        </Fact>
        <Fact label="systemd-Dienste">{info.failedUnits.length === 0 ? 'keiner fehlgeschlagen' : <span className="text-danger-ink">{info.failedUnits.length} fehlgeschlagen</span>}</Fact>
      </dl>
      {info.failedUnits.length > 0 ? <FailedUnits units={info.failedUnits} /> : null}
    </div>
  )
}

function FactsSkeleton(): React.JSX.Element {
  return (
    <div className={FACT_GRID} aria-busy="true" aria-label="Gerätedaten werden geladen">
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
  const info = useMiniPc((s) => s.info)
  const infoError = useMiniPc((s) => s.infoError)
  return (
    <Section id="minipc-device" title="Gerät" description={info ? `Stand ${formatTime(info.fetchedAt)} Uhr, alle 5 Minuten` : 'Hardware, Betriebssystem und Wartung'}>
      {info ? <Facts info={info} /> : infoError ? <p className="text-[0.8125rem] text-ink-3">Gerätedaten fehlen.</p> : <FactsSkeleton />}
    </Section>
  )
}
