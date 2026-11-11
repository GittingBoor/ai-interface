import { useMemo } from 'react'
import { AlertTriangle, CloudOff, Hourglass, Lightbulb, LoaderCircle, type LucideIcon } from 'lucide-react'
import type { KnowledgeProject, KnowledgeStatus, ProjectKnowledge } from '@shared/knowledge'
import { Button } from '@renderer/components/Button'
import { EmptyState } from '@renderer/components/States'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { formatDateTime, formatDayShort } from '@renderer/lib/format'
import { hostLabel } from '@renderer/lib/hosts'
import { useKnowledge } from '@renderer/stores/knowledgeStore'
import { useT } from '@renderer/i18n/useT'
import type { Messages } from '@shared/i18n/messages'
import { ArchitectureDiagram } from './ArchitectureDiagram'
import { KnowledgeTocInline, KnowledgeTocRail } from './KnowledgeToc'
import { presentSections, type KnowledgeSectionEntry, type KnowledgeSectionId } from './knowledgeSections'
import { StatusChip } from './ProjectKnowledgeList'
import { ActivityTeamSection } from './sections/ActivityTeam'
import { CodeStructureSection } from './sections/CodeStructure'
import { ConceptsSection } from './sections/Concepts'
import { DependenciesSection } from './sections/Dependencies'
import { FeaturesSection } from './sections/Features'
import { FlowsSection } from './sections/Flows'
import { GapsSection, HistorySection } from './sections/History'
import { OrientationSection } from './sections/Orientation'
import { Overview } from './sections/Overview'
import { PitfallsSection } from './sections/Pitfalls'
import { ResourcesSection } from './sections/Resources'
import { SectionFrame } from './sections/SectionFrame'

const SHORT_HASH = 7

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
        <h2 className="min-w-0 truncate text-[1.5rem] leading-tight font-[660] tracking-[-0.015em] text-ink [font-stretch:108%]">{project.name}</h2>
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

interface BodyProps {
  readonly knowledge: ProjectKnowledge
  readonly project: KnowledgeProject
}

function SectionList({ knowledge, project, entries }: BodyProps & { readonly entries: readonly KnowledgeSectionEntry[] }): React.JSX.Element {
  const has = (id: KnowledgeSectionId): boolean => entries.some((e) => e.id === id)
  const { nodes, edges } = knowledge.architecture
  const stats = knowledge.stats
  return (
    <div className="@container min-w-0 space-y-12">
      <Overview knowledge={knowledge} />
      {has('orientation') && knowledge.orientation ? <OrientationSection orientation={knowledge.orientation} project={project} /> : null}
      {has('architecture') ? (
        <SectionFrame id="architecture">
          <ArchitectureDiagram nodes={nodes} edges={edges} project={project} />
        </SectionFrame>
      ) : null}
      {has('flows') && knowledge.flows ? <FlowsSection flows={knowledge.flows} nodes={nodes} /> : null}
      {has('code') && stats ? <CodeStructureSection stats={stats} project={project} /> : null}
      {has('activity') && stats ? <ActivityTeamSection stats={stats} /> : null}
      {has('features') ? <FeaturesSection features={knowledge.features} project={project} /> : null}
      {has('pitfalls') && knowledge.pitfalls ? <PitfallsSection pitfalls={knowledge.pitfalls} project={project} /> : null}
      {has('concepts') ? <ConceptsSection concepts={knowledge.concepts} project={project} /> : null}
      {has('dependencies') && stats ? <DependenciesSection dependencies={stats.dependencies} project={project} /> : null}
      {has('resources') && knowledge.resources ? <ResourcesSection resources={knowledge.resources} /> : null}
      {has('history') ? <HistorySection events={knowledge.timeline} project={project} /> : null}
      {has('gaps') ? <GapsSection gaps={knowledge.gaps} /> : null}
    </div>
  )
}

function KnowledgeBody({ knowledge, project }: BodyProps): React.JSX.Element {
  const entries = useMemo(() => presentSections(knowledge), [knowledge])
  return (
    <>
      <div className="mb-8 @5xl:hidden">
        <KnowledgeTocInline entries={entries} />
      </div>
      <div className="grid gap-x-12 @5xl:grid-cols-[minmax(0,1fr)_11.5rem]">
        <SectionList knowledge={knowledge} project={project} entries={entries} />
        <aside className="hidden @5xl:block">
          <KnowledgeTocRail entries={entries} />
        </aside>
      </div>
    </>
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

/** Projektwissen eines Projekts: Kennzahlen, Diagramme und kurze Texte über die volle Breite. */
export function ProjectKnowledgeDetail({ project }: { readonly project: KnowledgeProject }): React.JSX.Element {
  return (
    <article className="@container min-w-0">
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
