import { motion } from 'motion/react'
import type { FeatureStatus, KnowledgeFeature, KnowledgeProject } from '@shared/knowledge'
import { formatInteger } from '@renderer/lib/format'
import { useT } from '@renderer/i18n/useT'
import { FileLink } from '../KnowledgeLinks'
import { FEATURE_COLOR, FEATURE_ORDER } from '../knowledgePalette'
import { SectionFrame } from './SectionFrame'

const PERCENT = 100
const EASE = [0.16, 1, 0.3, 1] as const
const STAGGER_S = 0.08

function ProgressBar({ features }: { readonly features: readonly KnowledgeFeature[] }): React.JSX.Element {
  const t = useT().knowledge
  const done = features.filter((f) => f.status === 'fertig').length
  return (
    <div>
      <div role="img" aria-label={t.view.featureProgress(done, features.length)} className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-raised">
        {FEATURE_ORDER.map((status, i) => {
          const count = features.filter((f) => f.status === status).length
          return count ? (
            <motion.span
              key={status}
              className="h-full origin-left"
              style={{ width: `${(count / features.length) * PERCENT}%`, background: FEATURE_COLOR[status] }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: i * STAGGER_S, ease: EASE }}
            />
          ) : null
        })}
      </div>
    </div>
  )
}

interface GroupProps {
  readonly status: FeatureStatus
  readonly features: readonly KnowledgeFeature[]
  readonly project: KnowledgeProject
}

function StatusGroup({ status, features, project }: GroupProps): React.JSX.Element {
  const t = useT().knowledge
  return (
    <div className="min-w-0">
      <h3 className="mb-2 flex items-center gap-2 text-xs font-[600] text-ink-2">
        <span aria-hidden className="size-2 rounded-full" style={{ background: FEATURE_COLOR[status] }} />
        {t.feature[status]}
        <span className="num font-normal text-ink-3">{formatInteger(features.length)}</span>
      </h3>
      <ul className="space-y-1">
        {features.map((f) => (
          <li key={f.name} className="flex flex-col items-start gap-1 rounded-md px-2 py-1.5 transition-colors duration-150 hover:bg-raised">
            <span className={`min-w-0 text-[0.8125rem] ${status === 'geplant' ? 'text-ink-2' : 'text-ink'}`}>{f.name}</span>
            {f.where ? <FileLink project={project} path={f.where} /> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

interface FeaturesProps {
  readonly features: readonly KnowledgeFeature[]
  readonly project: KnowledgeProject
}

/** Was das Projekt kann: Fortschritt als Balken, darunter die Funktionen nach Stand. */
export function FeaturesSection({ features, project }: FeaturesProps): React.JSX.Element {
  const t = useT().knowledge
  const done = features.filter((f) => f.status === 'fertig').length
  const groups = FEATURE_ORDER.map((status) => ({ status, items: features.filter((f) => f.status === status) })).filter((g) => g.items.length > 0)
  return (
    <SectionFrame id="features" description={t.view.featureProgress(done, features.length)}>
      <ProgressBar features={features} />
      <div className="mt-5 grid gap-x-8 gap-y-5 @3xl:grid-cols-3">
        {groups.map((g) => (
          <StatusGroup key={g.status} status={g.status} features={g.items} project={project} />
        ))}
      </div>
    </SectionFrame>
  )
}
