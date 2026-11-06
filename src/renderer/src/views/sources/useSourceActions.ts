import type { Source, SourceOpenMode } from '@shared/types'
import { useNav } from '@renderer/stores/navStore'
import { useSettings } from '@renderer/stores/settingsStore'
import { useSources } from '@renderer/stores/sourcesStore'
import { confirmAction } from '@renderer/stores/confirmStore'
import { notify } from '@renderer/stores/toastStore'
import { currentT } from '@renderer/i18n/useT'
import { openInBrowser } from '../links/LinkView'
import { displayTitle } from './folders'
import type { SourceActions } from './SourceRow'
import type { SourceDialogRequest } from './SourceDialog'

/** Standard, solange die Einstellungen noch laden. */
export const DEFAULT_OPEN_MODE: SourceOpenMode = 'app'

export const useOpenMode = (): SourceOpenMode => useSettings((s) => s.settings?.sources.openIn ?? DEFAULT_OPEN_MODE)

/** Stern umschalten mit kurzer Rückmeldung, wo die Quelle jetzt steht. */
export async function toggleStar(source: Source): Promise<void> {
  const ok = await useSources.getState().update(source.id, { starred: !source.starred })
  const t = currentT()
  if (ok) notify.success(source.starred ? t.sources.unstarredToast : t.sources.starredToast(t.nav.groups.websites))
}

async function removeConfirmed(source: Source, remove: (id: number) => Promise<boolean>): Promise<void> {
  const t = currentT()
  const ok = await confirmAction({
    title: t.sources.removeTitle,
    message: t.sources.removeMessage(displayTitle(source)),
    confirmLabel: t.common.delete,
    danger: true
  })
  if (ok) await remove(source.id)
}

/** Aktionen der Quellen-Liste; Bearbeiten und Verschieben öffnen den Dialog der Ansicht. */
export function useSourceActions(openDialog: (request: SourceDialogRequest) => void): SourceActions {
  const openIn = useOpenMode()
  const update = useSources((s) => s.update)
  const removeSource = useSources((s) => s.remove)
  return {
    open: (source) => (openIn === 'app' ? useNav.getState().openSource(source.id) : openInBrowser(source.url)),
    openExternal: (source) => openInBrowser(source.url),
    toggleStar: (source) => void toggleStar(source),
    adopt: (source) => {
      void update(source.id, { origin: 'user' }).then((ok) => ok && notify.success(currentT().sources.adopted(currentT().sources.originUser)))
    },
    edit: (source) => openDialog({ kind: 'edit', source }),
    move: (source) => openDialog({ kind: 'move', source }),
    remove: (source) => void removeConfirmed(source, removeSource)
  }
}
