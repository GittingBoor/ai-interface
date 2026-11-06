import { BookOpen, Settings2 } from 'lucide-react'
import { useNav } from '@renderer/stores/navStore'
import { useSettings } from '@renderer/stores/settingsStore'
import { useT } from '@renderer/i18n/useT'
import { Button } from './Button'
import { EmptyState } from './States'

/** true, sobald die Einstellungen geladen sind und kein Vault eingetragen ist. */
export function useNoVault(): boolean {
  return useSettings((s) => s.settings !== null && s.settings.vault.path.trim() === '')
}

/** Hinweis für TODOs und Protokolle, wenn kein Obsidian-Vault eingerichtet ist. */
export function NoVault({ what }: { readonly what: string }): React.JSX.Element {
  const t = useT()
  const openSettings = useNav((s) => s.openSettings)
  return (
    <EmptyState
      icon={BookOpen}
      title={t.frame.noVault.title}
      action={
        <Button variant="primary" icon={Settings2} onClick={() => openSettings('vault')}>
          {t.frame.noVault.action}
        </Button>
      }
    >
      {t.frame.noVault.body(what)}
    </EmptyState>
  )
}
