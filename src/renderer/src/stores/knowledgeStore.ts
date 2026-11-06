import { create } from 'zustand'
import type { KnowledgePlan, KnowledgeProgress, KnowledgeProject } from '@shared/knowledge'
import { api } from '@renderer/api/client'
import { reportError, unwrap } from '@renderer/api/call'
import { notify } from './toastStore'
import { useSettings } from './settingsStore'
import { currentT } from '@renderer/i18n/useT'

interface KnowledgeState {
  readonly projects: readonly KnowledgeProject[]
  readonly progress: KnowledgeProgress
  readonly selectedId: number | null
  readonly loading: boolean
  readonly error: string | null
  /** Offener Bestätigungsdialog vor einem Durchgang; null = keiner. */
  readonly plan: KnowledgePlan | null
  load(): Promise<void>
  /** Holt die Vorschau und öffnet den Bestätigungsdialog; gestartet wird erst nach `confirmPlan`. */
  refresh(): Promise<void>
  /** Startet den Durchgang für die angehakten Projekte. */
  confirmPlan(favoriteIds: readonly number[]): Promise<void>
  cancelPlan(): void
  /** Projektwissen für ein Projekt ein- oder ausschalten (Einstellung, kein Lauf). */
  setEnabled(favoriteId: number, enabled: boolean): Promise<void>
  select(id: number | null): void
  applyProgress(progress: KnowledgeProgress): void
}

const IDLE_PROGRESS: KnowledgeProgress = { active: false, total: 0, done: 0, deferred: 0, runs: [] }

/** Meldung nach dem Start: wie viele Projekte laufen, wie viele wegen Kontingent warten. */
function announceStart(progress: KnowledgeProgress): void {
  const t = currentT().knowledge
  if (progress.total === 0 && progress.deferred === 0) return notify.info(t.upToDate)
  const deferred = progress.deferred > 0 ? t.deferredToast(progress.deferred) : undefined
  if (progress.total === 0) return notify.info(deferred ?? '')
  notify.info(t.startedToast(progress.total), deferred)
}

export const useKnowledge = create<KnowledgeState>((set, get) => ({
  projects: [],
  progress: IDLE_PROGRESS,
  selectedId: null,
  loading: false,
  error: null,
  plan: null,
  load: async () => {
    set({ loading: true })
    try {
      const [projects, progress] = await Promise.all([unwrap(api.knowledge.list()), unwrap(api.knowledge.progress())])
      set({ projects, progress, error: null, loading: false })
    } catch (cause) {
      set({ error: cause instanceof Error ? cause.message : String(cause), loading: false })
    }
  },
  refresh: async () => {
    if (get().progress.active || get().plan) return
    try {
      const plan = await unwrap(api.knowledge.plan())
      const t = currentT().knowledge
      if (plan.enabled === 0) return notify.info(t.noneEnabled)
      if (plan.items.length === 0) return notify.info(t.upToDate)
      set({ plan })
    } catch (cause) {
      reportError(cause)
    }
  },
  confirmPlan: async (favoriteIds) => {
    set({ plan: null })
    try {
      const progress = await unwrap(api.knowledge.refresh(favoriteIds))
      set({ progress })
      announceStart(progress)
    } catch (cause) {
      reportError(cause)
    }
  },
  cancelPlan: () => set({ plan: null }),
  setEnabled: async (favoriteId, enabled) => {
    const current = useSettings.getState().settings?.knowledge.projects ?? []
    const projects = enabled ? [...new Set([...current, favoriteId])] : current.filter((id) => id !== favoriteId)
    if (await useSettings.getState().update({ knowledge: { projects } })) await get().load()
  },
  select: (id) => set({ selectedId: id }),
  applyProgress: (progress) => set({ progress })
}))
