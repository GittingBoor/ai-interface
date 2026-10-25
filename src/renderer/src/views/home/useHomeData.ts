import { useCallback, useEffect, useState } from 'react'
import type { AnalyticsQuery, AnalyticsResult, OpenTask, ProjectTasks } from '@shared/types'
import { api } from '@renderer/api/client'
import { errorMessage, unwrap } from '@renderer/api/call'
import { useTaskReview } from '@renderer/stores/taskReviewStore'
import { useUsage } from '@renderer/stores/usageStore'
import { notify } from '@renderer/stores/toastStore'

/** Letzte 7 Tage ohne Aufteilung: Wochenkacheln, Vorwoche, Sparklines. */
const WEEK_QUERY: AnalyticsQuery = { range: '7d', host: 'all', split: 'none', resolution: 'day', projects: null, excludedProjects: [], models: null }
/** Letzte 30 Tage je Projekt: Grundlage der Weiterarbeiten-Karten. */
const PROJECTS_QUERY: AnalyticsQuery = { range: '30d', host: 'all', split: 'project', resolution: 'day', projects: null, excludedProjects: [], models: null }

export interface HomeUsage {
  readonly week: AnalyticsResult | null
  readonly projects: AnalyticsResult | null
  readonly error: string | null
  retry(): void
}

/** Verbrauchszahlen der Startseite; lädt neu, sobald der Verbrauch neu abgerufen wurde. */
export function useHomeUsage(): HomeUsage {
  const loadedAt = useUsage((s) => s.loadedAt)
  const [week, setWeek] = useState<AnalyticsResult | null>(null)
  const [projects, setProjects] = useState<AnalyticsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    Promise.all([unwrap(api.usage.analytics(WEEK_QUERY)), unwrap(api.usage.analytics(PROJECTS_QUERY))])
      .then(([w, p]) => {
        if (!current) return
        setWeek(w)
        setProjects(p)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (current) setError(errorMessage(cause))
      })
    return () => {
      current = false
    }
  }, [loadedAt, attempt])

  return { week, projects, error, retry: () => setAttempt((a) => a + 1) }
}

export interface OpenTasks {
  readonly groups: readonly ProjectTasks[] | null
  readonly error: string | null
  retry(): void
  check(group: ProjectTasks, task: OpenTask): void
}

const withoutTask = (groups: readonly ProjectTasks[], groupId: string, key: string): ProjectTasks[] =>
  groups.map((g) => (g.groupId === groupId ? { ...g, tasks: g.tasks.filter((t) => t.key !== key) } : g)).filter((g) => g.tasks.length > 0)

/** Offene Aufgaben aus den Protokollen; Abhaken sofort sichtbar, mit „Rückgängig“ im Toast. */
export function useOpenTasks(): OpenTasks {
  const loadedAt = useUsage((s) => s.loadedAt)
  const reviewVersion = useTaskReview((s) => s.version)
  const [groups, setGroups] = useState<readonly ProjectTasks[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    try {
      const list = await unwrap(api.tasks.list())
      setGroups([...list].sort((a, b) => b.protocolDate - a.protocolDate))
      setError(null)
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, loadedAt, reviewVersion])

  const undo = useCallback(
    async (group: ProjectTasks, task: OpenTask): Promise<void> => {
      try {
        await unwrap(api.tasks.uncheck(group.groupId, task.key))
      } catch (cause) {
        notify.error(`„${task.text}“ konnte nicht wiederhergestellt werden`, errorMessage(cause))
      }
      await load()
    },
    [load]
  )

  const check = useCallback(
    (group: ProjectTasks, task: OpenTask): void => {
      setGroups((current) => (current ? withoutTask(current, group.groupId, task.key) : current))
      unwrap(api.tasks.check(group.groupId, task.key))
        .then(() => notify.undoable('Erledigt', task.text, { label: 'Rückgängig', run: () => void undo(group, task) }))
        .catch((cause: unknown) => {
          notify.error(`„${task.text}“ konnte nicht abgehakt werden`, errorMessage(cause))
          void load()
        })
    },
    [load, undo]
  )

  return { groups, error, retry: () => void load(), check }
}
