import { motion } from 'motion/react'
import type { KnowledgeProject, KnowledgeStatus } from '@shared/knowledge'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { formatRelative } from '@renderer/lib/format'
import { useT } from '@renderer/i18n/useT'

interface StatusStyle {
  readonly chip: string
  readonly dot: string
}

export const STATUS_STYLE: Readonly<Record<KnowledgeStatus, StatusStyle>> = {
  current: { chip: 'bg-raised text-ink-2', dot: 'bg-status-idle' },
  stale: { chip: 'bg-warn-soft text-warn', dot: 'bg-warn' },
  running: { chip: 'bg-accent-soft text-accent-text', dot: 'bg-accent animate-pulse motion-reduce:animate-none' },
  queued: { chip: 'bg-raised text-ink-3', dot: 'bg-ink-3' },
  deferred: { chip: 'bg-raised text-ink-3', dot: 'bg-ink-3' },
  missing: { chip: 'bg-raised text-ink-3', dot: 'bg-line-strong' },
  unreachable: { chip: 'bg-danger-soft text-danger-ink', dot: 'bg-danger' },
  failed: { chip: 'bg-danger-soft text-danger-ink', dot: 'bg-danger' }
}

export function StatusChip({ status }: { readonly status: KnowledgeStatus }): React.JSX.Element {
  const style = STATUS_STYLE[status]
  const t = useT()
  return (
    <span className={`inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full px-2 text-2xs font-[600] whitespace-nowrap ${style.chip}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${style.dot}`} />
      {t.knowledge.status[status]}
    </span>
  )
}

interface ItemProps {
  readonly project: KnowledgeProject
  readonly active: boolean
  readonly onSelect: (id: number) => void
}

function ProjectItem({ project, active, onSelect }: ItemProps): React.JSX.Element {
  const generatedAt = project.knowledge?.generatedAt
  return (
    <button
      type="button"
      onClick={() => onSelect(project.favoriteId)}
      aria-current={active ? 'true' : undefined}
      className={`relative w-full rounded-md py-2 pr-3 pl-3 text-left transition-colors duration-150 ${active ? 'bg-raised' : 'hover:bg-raised/50'}`}
    >
      {active ? <motion.span layoutId="knowledge-active" className="absolute top-2 bottom-2 left-0 w-px bg-accent" /> : null}
      <span className="flex items-center gap-2">
        <ProjectMark color={project.color} icon={project.icon} size="sm" />
        <span className={`min-w-0 flex-1 truncate text-[0.8125rem] ${active ? 'font-[600] text-ink' : 'text-ink-2'}`}>{project.name}</span>
      </span>
      <span className="mt-1.5 flex items-center gap-2 pl-6">
        <StatusChip status={project.status} />
        <span className="num truncate text-2xs text-ink-3">{generatedAt ? formatRelative(generatedAt) : ''}</span>
      </span>
    </button>
  )
}

interface ListProps {
  readonly projects: readonly KnowledgeProject[]
  readonly selectedId: number | null
  readonly onSelect: (id: number) => void
}

/** Projekte mit Zustand des Projektwissens und Alter des Stands. */
export function ProjectKnowledgeList({ projects, selectedId, onSelect }: ListProps): React.JSX.Element {
  return (
    <ul className="space-y-px">
      {projects.map((p) => (
        <li key={p.favoriteId}>
          <ProjectItem project={p} active={p.favoriteId === selectedId} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  )
}
