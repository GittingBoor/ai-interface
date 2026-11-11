import type { ProjectKnowledge } from '@shared/knowledge'
import { formatDateMedium, formatInteger, formatPercentPoints, parseDay } from '@renderer/lib/format'
import { useT } from '@renderer/i18n/useT'
import type { Messages } from '@shared/i18n/messages'
import { FEATURE_COLOR, FEATURE_ORDER } from '../knowledgePalette'
import { sectionAnchor } from '../knowledgeSections'

const PERCENT = 100
const MONTHS_PER_YEAR = 12
/** Ab so vielen Kennzahlen füllt die Leiste die Breite; weniger stehen kompakt links. */
const FULL_ROW_FROM = 3

interface Kpi {
  readonly key: string
  readonly value: string
  readonly label: string
  readonly hint?: string
}

function monthsBetween(first: string, last: string): number {
  const a = parseDay(first)
  const b = parseDay(last)
  return (b.getFullYear() - a.getFullYear()) * MONTHS_PER_YEAR + (b.getMonth() - a.getMonth()) + 1
}

function statKpis(knowledge: ProjectKnowledge, t: Messages['knowledge']['view']): Kpi[] {
  const s = knowledge.stats
  if (!s) return []
  const items: Kpi[] = [
    { key: 'lines', value: formatInteger(s.lines), label: t.kpi.lines },
    { key: 'files', value: formatInteger(s.files), label: t.kpi.files },
    { key: 'commits', value: formatInteger(s.commits), label: t.kpi.commits },
    { key: 'contributors', value: formatInteger(s.contributorCount), label: t.kpi.contributors }
  ]
  if (s.firstCommit && s.lastCommit) {
    const range = t.periodRange(formatDateMedium(parseDay(s.firstCommit).getTime()), formatDateMedium(parseDay(s.lastCommit).getTime()))
    items.push({ key: 'period', value: t.months(monthsBetween(s.firstCommit, s.lastCommit)), label: t.kpi.period, hint: range })
  }
  return items
}

function kpis(knowledge: ProjectKnowledge, t: Messages['knowledge']['view']): Kpi[] {
  const total = knowledge.features.length
  const done = knowledge.features.filter((f) => f.status === 'fertig').length
  const features: Kpi[] = total ? [{ key: 'features', value: formatPercentPoints((done / total) * PERCENT), label: t.kpi.features, hint: t.featuresOf(done, total) }] : []
  return [...statKpis(knowledge, t), ...features]
}

function FeatureMeter({ knowledge }: { readonly knowledge: ProjectKnowledge }): React.JSX.Element {
  const total = knowledge.features.length
  return (
    <span aria-hidden className="mt-2 flex h-1 w-full max-w-28 gap-[2px] overflow-hidden rounded-full">
      {FEATURE_ORDER.map((status) => {
        const count = knowledge.features.filter((f) => f.status === status).length
        return count ? <span key={status} style={{ width: `${(count / total) * PERCENT}%`, background: FEATURE_COLOR[status] }} /> : null
      })}
    </span>
  )
}

/** Kurzfassung und Kennzahlen: der erste Blick auf das Projekt. */
export function Overview({ knowledge }: { readonly knowledge: ProjectKnowledge }): React.JSX.Element {
  const t = useT().knowledge
  const items = kpis(knowledge, t.view)
  return (
    <div id={sectionAnchor('overview')} data-knowledge-section="overview" className="scroll-mt-6">
      <p className="max-w-[70ch] text-[1.0625rem] leading-[1.6] text-ink [text-wrap:pretty]">{knowledge.summary}</p>
      {items.length ? (
        <dl className={`mt-6 flex flex-wrap gap-px overflow-hidden rounded-xl border border-line bg-line ${items.length < FULL_ROW_FROM ? 'w-fit min-w-[13rem]' : ''}`}>
          {items.map((k) => (
            <div key={k.key} className="min-w-[calc(50%-1px)] flex-1 bg-canvas px-4 py-3.5 @md:min-w-[calc(33.333%-1px)] @5xl:min-w-0">
              <dt className="text-2xs text-ink-3">{k.label}</dt>
              <dd className="num mt-1 truncate text-[1.375rem] leading-tight font-[640] tracking-[-0.015em] text-ink [font-stretch:108%]">{k.value}</dd>
              {k.hint ? <dd className="num mt-0.5 truncate text-2xs text-ink-3" title={k.hint}>{k.hint}</dd> : null}
              {k.key === 'features' ? <FeatureMeter knowledge={knowledge} /> : null}
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}
