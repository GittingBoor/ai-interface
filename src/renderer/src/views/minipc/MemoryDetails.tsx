import type { SystemStats } from '@shared/types'
import type { Messages } from '@shared/i18n/messages'
import { Section } from '@renderer/components/Section'
import { useT } from '@renderer/i18n/useT'
import { formatBytes } from '@renderer/lib/format'
import { meterTone, usagePercent } from '@renderer/lib/miniPc'
import { formatPercent } from '@renderer/lib/miniPcFormat'
import { Bar, Fact } from './parts'

interface Share {
  readonly key: string
  readonly label: string
  readonly bytes: number
  /** Füllfarbe des Abschnitts; der freie Rest ist die leere Schiene. */
  readonly fill: string
}

function shares(system: SystemStats, t: Messages['device']): readonly Share[] {
  const cached = Math.min(system.memCached, Math.max(0, system.memTotal - system.memUsed))
  return [
    { key: 'used', label: t.memUsed, bytes: system.memUsed, fill: 'bg-ink-3' },
    { key: 'cached', label: t.memCache, bytes: cached, fill: 'bg-line-strong' },
    { key: 'free', label: t.memFree, bytes: Math.max(0, system.memTotal - system.memUsed - cached), fill: 'bg-raised' }
  ]
}

function Swatch({ fill }: { readonly fill: string }): React.JSX.Element {
  return <span aria-hidden className={`mr-1.5 inline-block size-2 rounded-[2px] align-baseline ${fill} ${fill === 'bg-raised' ? 'border border-line-strong' : ''}`} />
}

/** Aufteilung des Arbeitsspeichers in belegt, Cache und frei, dazu die Auslagerung. */
export function MemoryDetails({ system }: { readonly system: SystemStats }): React.JSX.Element {
  const t = useT().device
  const parts = shares(system, t)
  const swapPercent = usagePercent(system.swapUsed, system.swapTotal)
  const summary = parts.map((p) => t.memShare(p.label, formatBytes(p.bytes))).join(', ')
  return (
    <Section id="minipc-memory" title={t.sectionMemory} description={t.memDesc(formatBytes(system.memTotal))}>
      <div className="space-y-3.5">
        <div role="img" aria-label={t.memAria(summary)} className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
          {parts.map((p) => (
            <span key={p.key} className={`h-full rounded-full transition-[width] duration-500 ease-out ${p.fill}`} style={{ width: `${usagePercent(p.bytes, system.memTotal)}%` }} />
          ))}
        </div>
        <dl className="grid grid-cols-3 gap-x-6">
          {parts.map((p) => (
            <Fact key={p.key} label={p.label}>
              <Swatch fill={p.fill} />
              {formatBytes(p.bytes)}
            </Fact>
          ))}
        </dl>
        <div className="border-t border-line pt-3.5">
          {system.swapTotal > 0 ? (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5">
              <span className="text-xs text-ink-3">{t.swapLabel}</span>
              <span className="num text-right text-[0.8125rem] text-ink-2">
                {t.ofTotal(formatBytes(system.swapUsed), formatBytes(system.swapTotal))}
              </span>
              <Bar
                label={t.swapShort}
                percent={swapPercent}
                tone={meterTone(swapPercent)}
                valueText={`${formatPercent(swapPercent)}, ${t.ofTotal(formatBytes(system.swapUsed), formatBytes(system.swapTotal))}`}
                className="col-span-2"
              />
            </div>
          ) : (
            <p className="text-xs text-ink-3">{t.swapNone}</p>
          )}
        </div>
      </div>
    </Section>
  )
}
