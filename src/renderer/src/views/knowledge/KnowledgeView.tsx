import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FolderGit2 } from 'lucide-react'
import type { KnowledgeProgress } from '@shared/knowledge'
import { Button } from '@renderer/components/Button'
import { ViewHeader } from '@renderer/components/Section'
import { EmptyState, ErrorState, SkeletonRows } from '@renderer/components/States'
import { KnowledgeRefreshButton } from '@renderer/components/KnowledgeRefreshButton'
import { useKnowledge } from '@renderer/stores/knowledgeStore'
import { useNav } from '@renderer/stores/navStore'
import { useT } from '@renderer/i18n/useT'
import type { Messages } from '@shared/i18n/messages'
import { KnowledgeRuns } from './KnowledgeRuns'
import { ProjectKnowledgeDetail } from './ProjectKnowledgeDetail'
import { ProjectKnowledgeList } from './ProjectKnowledgeList'

const SWITCH_EASE = [0.16, 1, 0.3, 1] as const

function progressText(progress: KnowledgeProgress, t: Messages['knowledge']): string {
  if (!progress.active) return t.subtitle
  const deferred = progress.deferred > 0 ? t.deferredSuffix(progress.deferred) : ''
  return `${t.updating(progress.done, progress.total)}${deferred}`
}

/** Wählt ohne gültige Auswahl das erste Projekt, damit rechts sofort etwas steht. */
function useDefaultSelection(): void {
  const projects = useKnowledge((s) => s.projects)
  const selectedId = useKnowledge((s) => s.selectedId)
  useEffect(() => {
    if (projects.length === 0) return
    if (selectedId !== null && projects.some((p) => p.favoriteId === selectedId)) return
    useKnowledge.getState().select(projects[0]?.favoriteId ?? null)
  }, [projects, selectedId])
}

function NoProjects(): React.JSX.Element {
  const t = useT().knowledge
  return (
    <div className="px-8">
      <EmptyState
        icon={FolderGit2}
        title={t.noProjectsTitle}
        action={
          <Button size="sm" onClick={() => useNav.getState().go('projects')}>
            {t.toProjects}
          </Button>
        }
      >
        {t.noProjectsBody}
      </EmptyState>
    </div>
  )
}

export function KnowledgeView(): React.JSX.Element {
  const { projects, progress, selectedId, loading, error, load, select } = useKnowledge()
  const t = useT()
  useDefaultSelection()
  const selected = projects.find((p) => p.favoriteId === selectedId) ?? null
  const firstLoad = loading && projects.length === 0
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [selectedId])

  return (
    <div className="flex h-full flex-col">
      <ViewHeader title={t.frame.views.knowledge} actions={<KnowledgeRefreshButton size="sm" />}>
        <span className="num">{progressText(progress, t.knowledge)}</span>
      </ViewHeader>
      {error && projects.length === 0 ? (
        <div className="px-8">
          <ErrorState message={error} onRetry={() => void load()} />
        </div>
      ) : !firstLoad && projects.length === 0 ? (
        <NoProjects />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col border-t border-line/70 md:flex-row">
          <nav aria-label={t.knowledge.projectsNav} className="max-h-52 shrink-0 overflow-y-auto border-b border-line/70 px-2 py-3 md:max-h-none md:w-60 md:border-r md:border-b-0 lg:w-64">
            {firstLoad ? (
              <div className="px-2">
                <SkeletonRows rows={4} />
              </div>
            ) : (
              <ProjectKnowledgeList projects={projects} selectedId={selectedId} onSelect={select} />
            )}
          </nav>
          <div ref={scroller} data-knowledge-scroll className="min-w-0 flex-1 overflow-y-auto px-6 pt-6 pb-16 lg:px-10">
            <AnimatePresence mode="wait" initial={false}>
              {selected ? (
                <motion.div key={selected.favoriteId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: SWITCH_EASE }}>
                  <ProjectKnowledgeDetail project={selected} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      )}
      <KnowledgeRuns />
    </div>
  )
}
