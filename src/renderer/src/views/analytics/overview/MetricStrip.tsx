import { CircleDashed } from 'lucide-react'
import type { DailyUsage, UsageOverview, UsageTotals } from '@shared/types'
import { AnimatedNumber } from '@renderer/components/AnimatedNumber'
import { hostColor, hostLabel, useHostIds } from '@renderer/lib/hosts'
import { formatInteger, formatTokens, formatUsd, splitTokens } from '@renderer/lib/format'

function TokenFigure({ value, size }: { readonly value: number; readonly size: 'lg' | 'md' }): React.JSX.Element {
  const unit = splitTokens(value).unit
  return (
    <span className="flex items-baseline gap-1.5">
      <AnimatedNumber
        value={value}
        format={(v) => splitTokens(v).figure}
        className={`font-[620] tracking-[-0.02em] text-ink [font-stretch:104%] ${size === 'lg' ? 'text-[2.125rem] leading-none' : 'text-[1.5rem] leading-none'}`}
      />
      {unit ? <span className="text-[0.8125rem] font-[520] text-ink-3">{unit}</span> : null}
    </span>
  )
}

function CostLine({ totals }: { readonly totals: UsageTotals }): React.JSX.Element {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink-3">
      <span className="whitespace-nowrap">
        <span className="num text-ink-2">{formatUsd(totals.costUsd)}</span> API-Gegenwert
      </span>
      {totals.hasUnpriced ? (
        <span title="Enthält Token von Modellen ohne hinterlegten Preis. Preise in den Einstellungen ergänzen." className="inline-flex items-center gap-1 whitespace-nowrap text-warn">
          <CircleDashed className="size-3" aria-hidden />
          <span className="sr-only">Enthält unbepreiste Modelle</span>
          <span aria-hidden>+ unbepreist</span>
        </span>
      ) : null}
    </p>
  )
}

function HostSplit({ daily }: { readonly daily: readonly DailyUsage[] }): React.JSX.Element {
  const enabled = useHostIds()
  const hosts = [...new Set([...enabled, ...daily.map((d) => d.host)])]
  const totals = hosts.map((h) => ({ host: h, value: daily.filter((d) => d.host === h).reduce((s, d) => s + d.totalTokens, 0) }))
  const sum = totals.reduce((s, t) => s + t.value, 0) || 1
  return (
    <div className="mt-3">
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {totals.map((t) => (
          <span key={t.host} className="h-full transition-[width] duration-700" style={{ width: `${(t.value / sum) * 100}%`, background: hostColor(t.host) }} />
        ))}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
        {totals.map((t) => (
          <span key={t.host} className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full" style={{ background: hostColor(t.host) }} aria-hidden />
            {hostLabel(t.host)} <span className="num text-ink-2">{formatTokens(t.value)}</span>
          </span>
        ))}
      </p>
    </div>
  )
}

interface MetricStripProps {
  readonly overview: UsageOverview
  readonly openTodos: number | null
}

/** Kennzahlenleiste: 30 Tage führt, die übrigen Werte stehen daneben. */
export function MetricStrip({ overview, openTodos }: MetricStripProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))_minmax(0,0.8fr)] border-y border-line max-[1180px]:grid-cols-[minmax(0,1.5fr)_repeat(2,minmax(0,1fr))] @max-[40rem]:grid-cols-2">
      <div className="py-5 pr-8 max-[1180px]:row-span-2 @max-[40rem]:col-span-2 @max-[40rem]:row-span-1 @max-[40rem]:pr-0">
        <p className="mb-2.5 text-xs font-[560] text-ink-2">Token · 30 Tage</p>
        <TokenFigure value={overview.month.totalTokens} size="lg" />
        <CostLine totals={overview.month} />
        <HostSplit daily={overview.daily} />
      </div>
      <div className="border-l border-line px-7 py-5 @max-[40rem]:border-t @max-[40rem]:border-l-0 @max-[40rem]:pl-0">
        <p className="mb-2.5 text-xs font-[560] text-ink-2">Heute</p>
        <TokenFigure value={overview.today.totalTokens} size="md" />
        <CostLine totals={overview.today} />
      </div>
      <div className="border-l border-line px-7 py-5 @max-[40rem]:border-t">
        <p className="mb-2.5 text-xs font-[560] text-ink-2">7 Tage</p>
        <TokenFigure value={overview.week.totalTokens} size="md" />
        <CostLine totals={overview.week} />
      </div>
      <div className="flex flex-col justify-center gap-4 border-l border-line px-7 py-5 max-[1180px]:col-span-2 max-[1180px]:flex-row max-[1180px]:justify-start max-[1180px]:gap-10 max-[1180px]:border-t max-[1180px]:py-4 @max-[40rem]:border-l-0 @max-[40rem]:pl-0">
        <div>
          <p className="text-xs font-[560] text-ink-2">Aktive Sessions</p>
          <p className="mt-1 flex items-center gap-2">
            <AnimatedNumber value={overview.activeSessions} format={formatInteger} className="text-[1.25rem] leading-tight font-[620] text-ink" />
            {overview.activeSessions > 0 ? <span className="size-1.5 animate-pulse-dot rounded-full bg-accent text-accent" aria-hidden /> : null}
          </p>
        </div>
        <div>
          <p className="text-xs font-[560] text-ink-2">Offene TODOs</p>
          <p className="mt-1 text-[1.25rem] leading-tight font-[620] text-ink">
            {openTodos === null ? <span className="text-ink-3">–</span> : <AnimatedNumber value={openTodos} format={formatInteger} />}
          </p>
        </div>
      </div>
    </div>
  )
}
