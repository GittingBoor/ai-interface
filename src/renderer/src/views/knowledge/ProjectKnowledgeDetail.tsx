import { AlertTriangle, CircleDashed, CloudOff, Hourglass, Lightbulb, LoaderCircle, type LucideIcon } from 'lucide-react'
import type { FeatureStatus, KnowledgeConcept, KnowledgeEvent, KnowledgeFeature, KnowledgeProject, KnowledgeStatus, ProjectKnowledge } from '@shared/knowledge'
import { Button } from '@renderer/components/Button'
import { Section } from '@renderer/components/Section'
import { EmptyState } from '@renderer/components/States'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { formatDateMedium, formatDateTime, formatDayShort, parseDay } from '@renderer/lib/format'
import { hostLabel } from '@renderer/lib/hosts'
import { useKnowledge } from '@renderer/stores/knowledgeStore'
import { useT } from '@renderer/i18n/useT'
import type { Messages } from '@shared/i18n/messages'
import { ArchitectureDiagram } from './ArchitectureDiagram'
import { KnowledgeLinkChip } from './KnowledgeLinks'
import { StatusChip } from './ProjectKnowledgeList'

const SHORT_HASH = 7

const FEATURE_STYLE: Readonly<Record<FeatureStatus, string>> = {
  fertig: 'bg-raised text-ink-2',
  teilweise: 'bg-warn-soft text-warn',
  geplant: 'border border-line text-ink-3'
}

const FEATURE_DOT: Readonly<Record<FeatureStatus, string>> = {
  fertig: 'bg-status-idle',
  teilweise: 'bg-warn',
  geplant: 'bg-line-strong'
}

interface RefreshActionProps {
  readonly label: string
  /** Im Hinweisband zurückhaltender als im Leerzustand. */
  readonly quiet?: boolean
}

function RefreshAction({ label, quiet = false }: RefreshActionProps): React.JSX.Element {
  const active = useKnowledge((s) => s.progress.active)
  const refresh = useKnowledge((s) => s.refresh)
  const t = useT()
  return (
    <Button variant={quiet ? 'secondary' : 'primary'} size="sm" loading={active} onClick={() => void refresh()}>
      {active ? t.knowledge.running : label}
    </Button>
  )
}

function Header({ project }: { readonly project: KnowledgeProject }): React.JSX.Element {
  const knowledge = project.knowledge
  const basis = knowledge?.basedOn
  const t = useT().knowledge
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <ProjectMark color={project.color} icon={project.icon} size="lg" />
        <h2 className="min-w-0 truncate text-lg font-[640] tracking-[-0.01em] text-ink">{project.name}</h2>
        <StatusChip status={project.status} />
      </div>
      <p className="num mt-2 flex flex-wrap gap-x-2 text-xs text-ink-3">
        <span>{hostLabel(project.host)}</span>
        <span aria-hidden>·</span>
        <span className="min-w-0 truncate font-mono" title={project.path}>
          {project.path}
        </span>
      </p>
      {knowledge ? (
        <p className="num mt-0.5 text-xs text-ink-3">
          {t.asOf(formatDateTime(knowledge.generatedAt))}
          {basis?.head ? t.commitSuffix(basis.head.slice(0, SHORT_HASH)) : ''}
          {basis?.protocolDate ? t.protocolSuffix(formatDayShort(basis.protocolDate)) : ''}
        </p>
      ) : null}
    </header>
  )
}

type NoticeStatus = keyof Messages['knowledge']['notice']

const NOTICE_TONES: Readonly<Record<NoticeStatus, 'warn' | 'danger' | 'accent'>> = {
  stale: 'warn',
  running: 'accent',
  queued: 'accent',
  deferred: 'warn',
  unreachable: 'danger',
  failed: 'danger'
}

const isNoticeStatus = (status: KnowledgeStatus): status is NoticeStatus => status in NOTICE_TONES

const NOTICE_TONE = { warn: 'bg-warn-soft text-warn', danger: 'bg-danger-soft text-danger-ink', accent: 'bg-accent-soft text-accent-text' } as const

function StatusNotice({ project }: { readonly project: KnowledgeProject }): React.JSX.Element | null {
  const t = useT().knowledge
  const status = project.status
  if (!isNoticeStatus(status)) return null
  return (
    <div role="status" className={`mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-3 py-2 text-xs ${NOTICE_TONE[NOTICE_TONES[status]]}`}>
      <span className="min-w-0 flex-1">
        {t.notice[status]}
        {project.error ? <span className="mt-0.5 block text-ink-2">{project.error}</span> : null}
      </span>
      {project.status === 'stale' || project.status === 'failed' ? <RefreshAction label={t.update} quiet /> : null}
    </div>
  )
}

function FeatureTable({ features }: { readonly features: readonly KnowledgeFeature[] }): React.JSX.Element {
  const t = useT().knowledge
  if (features.length === 0) return <p className="text-xs text-ink-3">{t.noFeatures}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[0.8125rem]">
        <thead className="text-2xs text-ink-3">
          <tr className="border-b border-line">
            <th scope="col" className="py-1.5 pr-4 font-[560]">{t.colFeature}</th>
            <th scope="col" className="py-1.5 pr-4 font-[560]">{t.colWhere}</th>
            <th scope="col" className="py-1.5 font-[560]">{t.colState}</th>
          </tr>
        </thead>
        <tbody>
          {features.map((f) => (
            <tr key={f.name} className="border-b border-line/50 last:border-0">
              <td className="py-2 pr-4 text-ink">{f.name}</td>
              <td className="max-w-[16rem] truncate py-2 pr-4 font-mono text-xs text-ink-3" title={f.where}>
                {f.where}
              </td>
              <td className="py-2">
                <span className={`inline-flex h-5 items-center gap-1.5 rounded-full px-2 text-2xs font-[600] ${FEATURE_STYLE[f.status]}`}>
                  <span aria-hidden className={`size-1.5 rounded-full ${FEATURE_DOT[f.status]}`} />
                  {t.feature[f.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const newestFirst = (a: KnowledgeEvent, b: KnowledgeEvent): number => b.date.localeCompare(a.date)

function Timeline({ events, project }: { readonly events: readonly KnowledgeEvent[]; readonly project: KnowledgeProject }): React.JSX.Element {
  const t = useT().knowledge
  if (events.length === 0) return <p className="text-xs text-ink-3">{t.noTimeline}</p>
  return (
    <ol className="relative space-y-4 before:absolute before:top-1.5 before:bottom-1.5 before:left-[0.3125rem] before:w-px before:bg-line-strong/70">
      {[...events].sort(newestFirst).map((e, i) => (
        <li key={`${e.date}-${i}`} className="relative grid grid-cols-[0.75rem_1fr] gap-x-3">
          <span aria-hidden className={`mt-1.5 size-2.5 rounded-full border-2 border-canvas ${i === 0 ? 'bg-accent' : 'bg-line-strong'}`} />
          <div className="min-w-0">
            <p className="flex flex-wrap items-baseline gap-x-2.5">
              <time dateTime={e.date} className="num text-xs text-ink-3">
                {formatDateMedium(parseDay(e.date).getTime())}
              </time>
              <span className="text-[0.8125rem] font-[600] text-ink">{e.title}</span>
            </p>
            {e.detail ? <p className="mt-0.5 text-[0.8125rem] text-ink-2">{e.detail}</p> : null}
            {e.links.length ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {e.links.map((l) => (
                  <KnowledgeLinkChip key={`${l.kind}-${l.ref}`} link={l} project={project} />
                ))}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

function Concepts({ concepts }: { readonly concepts: readonly KnowledgeConcept[] }): React.JSX.Element {
  const t = useT().knowledge
  if (concepts.length === 0) return <p className="text-xs text-ink-3">{t.noConcepts}</p>
  return (
    <dl className="space-y-3">
      {concepts.map((c) => (
        <div key={c.term}>
          <dt className="text-[0.8125rem] font-[600] text-ink">{c.term}</dt>
          <dd className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-2">{c.explanation}</dd>
        </div>
      ))}
    </dl>
  )
}

function Gaps({ gaps }: { readonly gaps: readonly string[] }): React.JSX.Element {
  const t = useT().knowledge
  if (gaps.length === 0) return <p className="text-xs text-ink-3">{t.noGaps}</p>
  return (
    <ul className="space-y-2">
      {gaps.map((g) => (
        <li key={g} className="flex gap-2 text-[0.8125rem] leading-relaxed text-ink-2">
          <CircleDashed aria-hidden className="mt-1 size-3.5 shrink-0 text-ink-3" strokeWidth={1.75} />
          {g}
        </li>
      ))}
    </ul>
  )
}

function KnowledgeBody({ knowledge, project }: { readonly knowledge: ProjectKnowledge; readonly project: KnowledgeProject }): React.JSX.Element {
  const { nodes, edges } = knowledge.architecture
  const t = useT().knowledge
  return (
    <div className="space-y-9">
      <Section title={t.sectionSummary} id="knowledge-summary">
        <p className="max-w-[68ch] text-[0.9375rem] leading-relaxed text-ink [text-wrap:pretty]">{knowledge.summary}</p>
      </Section>
      <Section title={t.sectionArchitecture} id="knowledge-architecture">
        {nodes.length ? <ArchitectureDiagram nodes={nodes} edges={edges} /> : <p className="text-xs text-ink-3">{t.noArchitecture}</p>}
      </Section>
      <Section title={t.sectionFeatures} id="knowledge-features">
        <FeatureTable features={knowledge.features} />
      </Section>
      <Section title={t.sectionTimeline} id="knowledge-timeline">
        <Timeline events={knowledge.timeline} project={project} />
      </Section>
      <div className="grid gap-9 xl:grid-cols-2 xl:gap-12">
        <Section title={t.sectionConcepts} id="knowledge-concepts">
          <Concepts concepts={knowledge.concepts} />
        </Section>
        <Section title={t.sectionGaps} id="knowledge-gaps" description={t.sectionGapsHint}>
          <Gaps gaps={knowledge.gaps} />
        </Section>
      </div>
    </div>
  )
}

interface EmptyCopy {
  readonly icon: LucideIcon
  readonly title: string
  readonly text: string
  readonly action?: string
}

function emptyCopy(status: KnowledgeStatus, t: Messages['knowledge']): EmptyCopy {
  const e = t.empty
  switch (status) {
    case 'missing':
      return { icon: Lightbulb, title: e.missingTitle, text: e.missingText, action: t.prepareNow }
    case 'current':
    case 'stale':
      return { icon: Lightbulb, title: e.missingTitle, text: e.nothingText, action: t.prepareNow }
    case 'running':
      return { icon: LoaderCircle, title: e.runningTitle, text: e.runningText }
    case 'queued':
      return { icon: Hourglass, title: e.queuedTitle, text: e.queuedText }
    case 'deferred':
      return { icon: Hourglass, title: e.deferredTitle, text: e.deferredText }
    case 'unreachable':
      return { icon: CloudOff, title: e.unreachableTitle, text: e.unreachableText }
    case 'failed':
      return { icon: AlertTriangle, title: e.failedTitle, text: e.failedText, action: t.retry }
  }
}

function NoKnowledge({ project }: { readonly project: KnowledgeProject }): React.JSX.Element {
  const copy = emptyCopy(project.status, useT().knowledge)
  return (
    <EmptyState icon={copy.icon} title={copy.title} action={copy.action ? <RefreshAction label={copy.action} /> : undefined}>
      {copy.text}
      {project.error ? <span className="mt-1 block text-danger-ink">{project.error}</span> : null}
    </EmptyState>
  )
}

/** Projektwissen eines Projekts: kurz, als Tabellen, Zeitleiste und ein Diagramm. */
export function ProjectKnowledgeDetail({ project }: { readonly project: KnowledgeProject }): React.JSX.Element {
  return (
    <article className="max-w-[60rem]">
      <Header project={project} />
      {project.knowledge ? (
        <>
          <StatusNotice project={project} />
          <KnowledgeBody knowledge={project.knowledge} project={project} />
        </>
      ) : (
        <NoKnowledge project={project} />
      )}
    </article>
  )
}
