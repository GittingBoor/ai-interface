import { useId, useMemo, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Check, Minus } from 'lucide-react'
import type { AnalyticsMetric, AnalyticsRange, AnalyticsResolution, AnalyticsResult, AnalyticsSplit, HostFilter } from '@shared/types'
import { formatMetric, groupSeries, type ChartMode, type ChartSeries } from '@renderer/lib/analytics'
import { hostOptions, useDevices } from '@renderer/lib/hosts'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useAnalytics } from '@renderer/stores/analyticsStore'
import { SERIES_STYLE } from './seriesStyle'
import { useLocale, useT } from '@renderer/i18n/useT'
import type { Messages } from '@shared/i18n/messages'

interface Choice<T extends string> {
  readonly value: T
  readonly label: string
}

type ResolutionChoice = AnalyticsResolution | 'auto'

function rangeChoices(t: Messages['usage']['analytics']): readonly Choice<AnalyticsRange>[] {
  const names = t.ranges
  return [
    { value: '7d', label: names['7d'] },
    { value: '30d', label: names['30d'] },
    { value: '90d', label: names['90d'] },
    { value: '365d', label: names['365d'] },
    { value: 'all', label: names.all }
  ]
}

function splitChoices(t: Messages['usage']['analytics']): readonly Choice<AnalyticsSplit>[] {
  return [
    { value: 'project', label: t.splits.project },
    { value: 'host', label: t.splits.host },
    { value: 'model', label: t.splits.model },
    { value: 'none', label: t.splits.none }
  ]
}

function modeChoices(t: Messages['usage']['analytics']): readonly Choice<ChartMode>[] {
  return [
    { value: 'lines', label: t.modes.lines },
    { value: 'stacked', label: t.modes.stacked },
    { value: 'percent', label: t.modes.percent }
  ]
}

function resolutionChoices(t: Messages['usage']['analytics']): readonly Choice<ResolutionChoice>[] {
  return [
    { value: 'auto', label: t.resolutionAuto },
    { value: 'day', label: t.resolutions.day },
    { value: 'week', label: t.resolutions.week },
    { value: 'month', label: t.resolutions.month }
  ]
}

function Group({ label, id, action, children }: { readonly label: string; readonly id: string; readonly action?: ReactNode; readonly children: ReactNode }): React.JSX.Element {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex min-h-5 items-center justify-between gap-2">
        <p id={id} className="text-xs font-[560] text-ink-2">
          {label}
        </p>
        {action}
      </div>
      {children}
    </div>
  )
}

interface ChoicesProps<T extends string> {
  readonly label: string
  readonly value: T
  readonly choices: readonly Choice<T>[]
  onChange(value: T): void
  readonly hint?: string
}

/** Radiogruppe, die bei wenig Platz umbricht (statt seitlich zu scrollen wie `Segmented`). */
function Choices<T extends string>({ label, value, choices, onChange, hint }: ChoicesProps<T>): React.JSX.Element {
  const id = useId()
  const move = (dir: 1 | -1): void => {
    const index = choices.findIndex((c) => c.value === value)
    const next = choices[(index + dir + choices.length) % choices.length]
    if (next) onChange(next.value)
  }
  return (
    <Group label={label} id={`${id}-label`}>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className="flex flex-wrap gap-0.5 rounded-md border border-line bg-canvas p-0.5"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(1)
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(-1)
        }}
      >
        {choices.map((c) => {
          const active = c.value === value
          return (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(c.value)}
              className={`relative h-7 grow rounded-[5px] px-2 text-xs font-[560] whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${active ? 'text-ink' : 'text-ink-3 hover:text-ink-2'}`}
            >
              {active ? <motion.span layoutId={`choice-${id}`} className="absolute inset-0 rounded-[5px] bg-raised-2" transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }} /> : null}
              <span className="relative">{c.label}</span>
            </button>
          )
        })}
      </div>
      {hint ? <p className="mt-1.5 text-2xs text-ink-3">{hint}</p> : null}
    </Group>
  )
}

type CheckState = 'on' | 'off' | 'mixed'

function stateOf(group: ChartSeries, excluded: ReadonlySet<string>): CheckState {
  const hidden = group.memberKeys.filter((k) => excluded.has(k)).length
  return hidden === 0 ? 'on' : hidden === group.memberKeys.length ? 'off' : 'mixed'
}

/** Abgewählte Projekte nach dem Umschalten einer Gruppe (an → alle ihre Pfade aus, sonst alle an). */
function toggled(group: ChartSeries, state: CheckState, excluded: readonly string[]): readonly string[] {
  const next = new Set(excluded)
  for (const key of group.memberKeys) {
    if (state === 'on') next.add(key)
    else next.delete(key)
  }
  return [...next]
}

function ProjectPicker({ universe, metric }: { readonly universe: AnalyticsResult | null; readonly metric: AnalyticsMetric }): React.JSX.Element {
  const t = useT().usage.analytics.filter
  const locale = useLocale()
  const id = useId()
  const favorites = useFavorites((s) => s.favorites)
  const excluded = useAnalytics((s) => s.query.excludedProjects)
  const setExcluded = useAnalytics((s) => s.setExcluded)
  const groups = useMemo(() => (universe ? groupSeries(universe, 'project', metric, favorites, SERIES_STYLE) : []), [universe, metric, favorites, locale])
  const all = useMemo(() => groups.flatMap((g) => g.memberKeys), [groups])
  const excludedSet = useMemo(() => new Set(excluded), [excluded])
  const chosen = groups.filter((g) => stateOf(g, excludedSet) !== 'off').length

  const quick = (
    <span className="flex items-center gap-0.5 text-2xs">
      <button type="button" className="rounded px-1.5 py-0.5 font-[560] text-ink-3 transition-colors hover:bg-raised-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40" disabled={excluded.length === 0} onClick={() => setExcluded([])}>
        {t.all}
      </button>
      <button type="button" className="rounded px-1.5 py-0.5 font-[560] text-ink-3 transition-colors hover:bg-raised-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40" disabled={chosen === 0} onClick={() => setExcluded(all)}>
        {t.none}
      </button>
    </span>
  )

  return (
    <Group label={groups.length ? t.projectsCount(chosen, groups.length) : t.projects} id={`${id}-label`} action={groups.length ? quick : null}>
      {groups.length ? (
        <ul aria-labelledby={`${id}-label`} className="-mx-1.5 max-h-64 space-y-px overflow-y-auto pr-1 [scrollbar-gutter:stable] @max-[64rem]/analytics:max-h-44">
          {groups.map((g) => {
            const state = stateOf(g, excludedSet)
            return (
              <li key={g.key}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={state === 'mixed' ? 'mixed' : state === 'on'}
                  onClick={() => setExcluded(toggled(g, state, excluded))}
                  className="group flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left text-xs transition-colors duration-150 hover:bg-raised focus-visible:bg-raised focus-visible:outline-none"
                >
                  <span
                    aria-hidden
                    className="grid size-3.5 shrink-0 place-items-center rounded-[4px] border transition-[background-color,border-color] duration-150"
                    style={state === 'off' ? { borderColor: 'var(--color-line-strong)' } : { background: g.color, borderColor: g.color }}
                  >
                    {state === 'on' ? <Check className="size-2.5 text-canvas" strokeWidth={3.5} /> : state === 'mixed' ? <Minus className="size-2.5 text-canvas" strokeWidth={3.5} /> : null}
                  </span>
                  <span className={`min-w-0 flex-1 truncate transition-colors ${state === 'off' ? 'text-ink-3' : 'text-ink-2 group-hover:text-ink'}`}>{g.label}</span>
                  <span className="num shrink-0 text-2xs text-ink-3">{formatMetric(metric, g.total)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-xs text-ink-3">{universe ? t.noProjects : t.loading}</p>
      )}
    </Group>
  )
}

/** Filter der Auswertung; gelten für alle Kacheln und Diagramme rechts davon. */
export function FilterPanel(): React.JSX.Element {
  const t = useT().usage.analytics
  const devices = useDevices()
  const query = useAnalytics((s) => s.query)
  const chartMode = useAnalytics((s) => s.chartMode)
  const resolutionAuto = useAnalytics((s) => s.resolutionAuto)
  const metric = useAnalytics((s) => s.metric)
  const universe = useAnalytics((s) => s.universe)
  const { setRange, setHost, setSplit, setChartMode, setResolution } = useAnalytics.getState()
  const hostChoices: readonly Choice<HostFilter>[] = [{ value: 'all', label: t.filter.all }, ...hostOptions(devices)]

  return (
    <aside
      aria-label={t.filter.aria}
      className="flex shrink-0 flex-wrap gap-x-8 gap-y-5 border-b border-line px-8 pt-1 pb-6 @min-[64rem]/analytics:w-64 @min-[64rem]/analytics:flex-col @min-[64rem]/analytics:flex-nowrap @min-[64rem]/analytics:overflow-y-auto @min-[64rem]/analytics:border-r @min-[64rem]/analytics:border-b-0 @min-[64rem]/analytics:pr-5 @min-[64rem]/analytics:pb-8 *:@max-[64rem]/analytics:w-[15rem]"
    >
      <Choices<AnalyticsRange> label={t.filter.range} value={query.range} choices={rangeChoices(t)} onChange={setRange} />
      <Choices<HostFilter> label={t.filter.host} value={query.host} choices={hostChoices} onChange={setHost} />
      <Choices<AnalyticsSplit> label={t.filter.split} value={query.split} choices={splitChoices(t)} onChange={setSplit} />
      <Choices<ChartMode> label={t.filter.mode} value={chartMode} choices={modeChoices(t)} onChange={setChartMode} />
      <Choices<ResolutionChoice>
        label={t.filter.resolution}
        value={resolutionAuto ? 'auto' : query.resolution}
        choices={resolutionChoices(t)}
        onChange={setResolution}
        hint={resolutionAuto ? t.filter.autoHint(t.resolutions[query.resolution]) : undefined}
      />
      <ProjectPicker universe={universe} metric={metric} />
    </aside>
  )
}
