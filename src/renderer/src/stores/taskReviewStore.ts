import { create } from 'zustand'
import type { TaskReviewResult } from '@shared/types'
import { api } from '@renderer/api/client'
import { errorMessage, unwrap } from '@renderer/api/call'
import { notify } from './toastStore'
import { currentT } from '@renderer/i18n/useT'

interface TaskReviewStore {
  /** Steigt bei jeder Änderung durch die Claude-Prüfung; die Aufgabenliste lädt dann neu. */
  readonly version: number
  receive(result: TaskReviewResult): void
}

function reviewTitle(result: TaskReviewResult): string {
  const t = currentT().frame.stores
  const what = t.reviewTasks(result.checked.length)
  return result.finished ? t.reviewFinished(what) : t.reviewAborted(what)
}

/** Ergebnis der Claude-Prüfung, unabhängig von der offenen Seite: melden, mit „Rückgängig“ für alle Häkchen des Laufs. */
export const useTaskReview = create<TaskReviewStore>((set, get) => {
  const bump = (): void => set({ version: get().version + 1 })
  const undo = async (result: TaskReviewResult): Promise<void> => {
    try {
      await Promise.all(result.checked.map((t) => unwrap(api.tasks.uncheck(t.groupId, t.key))))
    } catch (cause) {
      notify.error(currentT().frame.stores.reviewUndoFailed, errorMessage(cause))
    }
    bump()
  }
  return {
    version: 0,
    receive: (result) => {
      bump()
      const hint = result.summary ?? result.checked.map((t) => t.text).join(' · ')
      if (!result.checked.length) return notify.info(reviewTitle(result), hint || undefined)
      notify.undoable(reviewTitle(result), hint, { label: currentT().frame.stores.undo, run: () => void undo(result) })
    }
  }
})
