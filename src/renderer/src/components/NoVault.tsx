import { useState } from 'react'
import { BookOpen, HardDrive, Settings2 } from 'lucide-react'
import { useNav } from '@renderer/stores/navStore'
import { useSettings } from '@renderer/stores/settingsStore'
import { useTodos } from '@renderer/stores/todoStore'
import { useT } from '@renderer/i18n/useT'
import { Button } from './Button'
import { EmptyState } from './States'

/** true, sobald die Einstellungen geladen sind, Obsidian gewählt ist und kein Vault eingetragen ist. */
export function useNoVault(): boolean {
  return useSettings((s) => s.settings !== null && s.settings.storage === 'obsidian' && s.settings.vault.path.trim() === '')
}

/** Hinweis für TODOs und Protokolle ohne Speicherort: in der App speichern oder einen Vault wählen. */
export function NoVault({ what }: { readonly what: string }): React.JSX.Element {
  const t = useT()
  const openSettings = useNav((s) => s.openSettings)
  const update = useSettings((s) => s.update)
  const [saving, setSaving] = useState(false)

  const storeInApp = async (): Promise<void> => {
    setSaving(true)
    const ok = await update({ storage: 'app' })
    setSaving(false)
    if (ok) await useTodos.getState().load()
  }

  return (
    <EmptyState
      icon={BookOpen}
      title={t.frame.noVault.title}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="primary" icon={HardDrive} loading={saving} onClick={() => void storeInApp()}>
            {t.frame.noVault.useApp}
          </Button>
          <Button icon={Settings2} onClick={() => openSettings('vault')}>
            {t.frame.noVault.action}
          </Button>
        </div>
      }
    >
      {t.frame.noVault.body(what)}
    </EmptyState>
  )
}
