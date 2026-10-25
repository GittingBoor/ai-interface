import { create } from 'zustand'
import type { TaskReviewResult } from '@shared/types'
import { api } from '@renderer/api/client'
import { errorMessage, unwrap } from '@renderer/api/call'
import { notify } from './toastStore'

interface TaskReviewStore {
  /** Steigt bei jeder Änderung durch die Claude-Prüfung; die Aufgabenliste lädt dann neu. */
  readonly version: number
  receive(result: TaskReviewResult): void
}

function reviewTitle(result: TaskReviewResult): string {
  const count = result.checked.length
  const what = count === 1 ? '1 Aufgabe' : `${count} Aufgaben`
  return result.finished ? `Claude-Prüfung: ${what} als erledigt erkannt` : `Claude-Prüfung abgebrochen, ${what} abgehakt`
}

/** Ergebnis der Claude-Prüfung, unabhängig von der offenen Seite: melden, mit „Rückgängig“ für alle Häkchen des Laufs. */
export const useTaskReview = create<TaskReviewStore>((set, get) => {
  const bump = (): void => set({ version: get().version + 1 })
  const undo = async (result: TaskReviewResult): Promise<void> => {
    try {
      await Promise.all(result.checked.map((t) => unwrap(api.tasks.uncheck(t.groupId, t.key))))
    } catch (cause) {
      notify.error('Häkchen der Prüfung konnten nicht aufgehoben werden', errorMessage(cause))
    }
    bump()
  }
  return {
    version: 0,
    receive: (result) => {
      bump()
      const hint = result.summary ?? result.checked.map((t) => t.text).join(' · ')
      if (!result.checked.length) return notify.info(reviewTitle(result), hint || undefined)
      notify.undoable(reviewTitle(result), hint, { label: 'Rückgängig', run: () => void undo(result) })
    }
  }
})
