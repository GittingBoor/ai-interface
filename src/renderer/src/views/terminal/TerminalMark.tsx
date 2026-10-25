import { Workflow } from 'lucide-react'
import type { TerminalInfo } from '@shared/types'
import { HostDot } from '@renderer/components/Host'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { findFavorite } from '@renderer/lib/projects'

interface TerminalMarkProps {
  readonly info: Pick<TerminalInfo, 'host' | 'path' | 'orchestrator'>
  /** Kleiner Punkt für Slot-Köpfe. */
  readonly compact?: boolean
}

export type OrchestratorMarkSize = 'xs' | 'sm' | 'md' | 'lg'

interface OrchestratorSizeSpec {
  readonly box: string
  readonly iconPx: number
}

/** Boxgrößen wie `ProjectMark` (`sm` = size-4, `md` = size-5, `lg` = size-8), `xs` für Slot-Köpfe. */
const ORCHESTRATOR_SIZES: Readonly<Record<OrchestratorMarkSize, OrchestratorSizeSpec>> = {
  xs: { box: 'size-3.5 rounded-[4px]', iconPx: 10 },
  sm: { box: 'size-4 rounded-[4px]', iconPx: 11 },
  md: { box: 'size-5 rounded-[5px]', iconPx: 13 },
  lg: { box: 'size-8 rounded-lg', iconPx: 17 }
}
const ORCHESTRATOR_STROKE = 2.25

/** Kennzeichen des Orchestrators: Workflow-Symbol im Akzentfeld. */
export function OrchestratorMark({ size = 'sm' }: { readonly size?: OrchestratorMarkSize }): React.JSX.Element {
  const spec = ORCHESTRATOR_SIZES[size]
  return (
    <span aria-hidden className={`inline-grid shrink-0 place-items-center bg-accent-soft text-accent ring-1 ring-accent/20 ring-inset ${spec.box}`}>
      <Workflow size={spec.iconPx} strokeWidth={ORCHESTRATOR_STROKE} />
    </span>
  )
}

/** Symbol des Projekts, in dem das Terminal läuft; Orchestrator eigenes Symbol; ohne Projekt der Host-Punkt. */
export function TerminalMark({ info, compact = false }: TerminalMarkProps): React.JSX.Element {
  const project = useFavorites((s) => findFavorite(s.favorites, info.host, info.path))
  if (info.orchestrator) return <OrchestratorMark size={compact ? 'xs' : 'sm'} />
  if (project) return <ProjectMark color={project.color} icon={project.icon} size="sm" className={compact ? 'scale-90' : ''} />
  return <HostDot host={info.host} className={compact ? 'size-1.5' : ''} />
}
