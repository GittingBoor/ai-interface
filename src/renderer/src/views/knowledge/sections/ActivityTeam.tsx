import { Bot } from 'lucide-react'
import type { KnowledgeStats } from '@shared/knowledge'
import { BarList, type BarItem } from '@renderer/components/charts/BarList'
import { formatInteger, formatPercentPoints } from '@renderer/lib/format'
import { useT } from '@renderer/i18n/useT'
import { ActivityColumns } from '../charts/ActivityColumns'
import { ChartBlock, SectionFrame } from './SectionFrame'

const PERCENT = 100
const BOT_NAME = /\[bot\]$|^dependabot|^renovate/i
const PERSON_COLOR = 'var(--color-status-review)'
const BOT_COLOR = 'var(--color-status-exited)'

function contributorItems(stats: KnowledgeStats): BarItem[] {
  const total = Math.max(1, stats.commits)
  return stats.contributors.map((c) => {
    const bot = BOT_NAME.test(c.name)
    return {
      key: c.name,
      label: (
        <span className="inline-flex max-w-full items-center gap-1.5">
          {bot ? <Bot aria-hidden className="size-3.5 shrink-0 text-ink-3" strokeWidth={1.75} /> : null}
          <span className="truncate">{c.name}</span>
        </span>
      ),
      value: c.commits,
      valueText: formatInteger(c.commits),
      detail: formatPercentPoints((c.commits / total) * PERCENT),
      color: bot ? BOT_COLOR : PERSON_COLOR
    }
  })
}

/** Wann am Projekt gearbeitet wurde und von wem. */
export function ActivityTeamSection({ stats }: { readonly stats: KnowledgeStats }): React.JSX.Element {
  const t = useT().knowledge
  const hasActivity = stats.activity.some((m) => m.commits > 0)
  const more = stats.contributorCount - stats.contributors.length
  return (
    <SectionFrame id="activity">
      <div className="grid gap-x-10 gap-y-8 @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {hasActivity ? (
          <ChartBlock title={t.view.commitsPerMonth}>
            <ActivityColumns activity={stats.activity} />
          </ChartBlock>
        ) : null}
        {stats.contributors.length ? (
          <ChartBlock title={t.view.team} hint={formatInteger(stats.contributorCount)}>
            <BarList items={contributorItems(stats)} emptyText="" />
            {more > 0 ? <p className="mt-3 text-2xs text-ink-3">{t.view.moreContributors(more)}</p> : null}
          </ChartBlock>
        ) : null}
      </div>
    </SectionFrame>
  )
}
