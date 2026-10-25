import { BookOpen, Settings2 } from 'lucide-react'
import { useNav } from '@renderer/stores/navStore'
import { useSettings } from '@renderer/stores/settingsStore'
import { Button } from './Button'
import { EmptyState } from './States'

/** true, sobald die Einstellungen geladen sind und kein Vault eingetragen ist. */
export function useNoVault(): boolean {
  return useSettings((s) => s.settings !== null && s.settings.vault.path.trim() === '')
}

/** Hinweis für TODOs und Protokolle, wenn kein Obsidian-Vault eingerichtet ist. */
export function NoVault({ what }: { readonly what: string }): React.JSX.Element {
  const openSettings = useNav((s) => s.openSettings)
  return (
    <EmptyState
      icon={BookOpen}
      title="Kein Obsidian-Vault verbunden"
      action={
        <Button variant="primary" icon={Settings2} onClick={() => openSettings('vault')}>
          Vault wählen
        </Button>
      }
    >
      {what} kommen aus einem Obsidian-Vault. Wähle in den Einstellungen unter „Ordner und Notizen“ den Vault-Ordner, dann erscheinen sie hier.
    </EmptyState>
  )
}
