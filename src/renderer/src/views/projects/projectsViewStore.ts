import { create } from 'zustand'
import type { ProjectFilter } from '@renderer/lib/projectOrganize'

export type ProjectsLayout = 'grouped' | 'list'

interface ProjectsViewStore {
  readonly layout: ProjectsLayout
  readonly filter: ProjectFilter
  setLayout(layout: ProjectsLayout): void
  setFilter(filter: ProjectFilter): void
}

/** Ansichtszustand der Projekte; bleibt beim Wechsel zwischen Bereichen erhalten. */
export const useProjectsView = create<ProjectsViewStore>((set) => ({
  layout: 'grouped',
  filter: 'all',
  setLayout: (layout) => set({ layout }),
  setFilter: (filter) => set({ filter })
}))
