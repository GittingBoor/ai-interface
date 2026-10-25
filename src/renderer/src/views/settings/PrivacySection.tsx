import { useEffect, useState } from 'react'
import { FolderPlus, KeyRound, Lock, LockOpen, Trash2 } from 'lucide-react'
import type { HostId } from '@shared/types'
import { Button } from '@renderer/components/Button'
import { Segmented, Switch } from '@renderer/components/Controls'
import { FolderBrowser } from '@renderer/components/FolderBrowser'
import { PinDialog, type PinDialogMode } from '@renderer/components/PinDialog'
import { findDevice, hostLabel, hostOptions } from '@renderer/lib/hosts'
import { useSettings } from '@renderer/stores/settingsStore'
import { baseName } from '@renderer/lib/format'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { usePrivacy } from '@renderer/stores/privacyStore'
import { notify } from '@renderer/stores/toastStore'


/** Ordner über den Ordner-Browser oder einen vorhandenen Favoriten als privat markieren. */
function AddPrivate(): React.JSX.Element {
  const favorites = useFavorites((s) => s.favorites)
  const projects = usePrivacy((s) => s.projects)
  const add = usePrivacy((s) => s.add)
  const [host, setHost] = useState<HostId>('local')
  const [path, setPath] = useState<string | null>(null)
  const [browsing, setBrowsing] = useState(false)
  const candidates = favorites.filter((f) => !projects.some((p) => p.host === f.host && p.path === f.path))

  const addEntry = async (entryHost: HostId, entryPath: string, label: string): Promise<void> => {
    if (await add({ host: entryHost, path: entryPath, label })) notify.success(`„${label}“ ist jetzt privat.`)
  }

  return (
    <div className="mt-4 grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Favorit als privat markieren"
          value=""
          disabled={candidates.length === 0}
          onChange={(e) => {
            const fav = candidates.find((f) => String(f.id) === e.target.value)
            if (fav) void addEntry(fav.host, fav.path, fav.name)
          }}
          className="field max-w-xs text-[0.8125rem]"
        >
          <option value="">{candidates.length === 0 ? 'Keine weiteren Favoriten' : 'Favorit hinzufügen …'}</option>
          {candidates.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({hostLabel(f.host)})
            </option>
          ))}
        </select>
        <Button size="sm" variant="ghost" icon={FolderPlus} onClick={() => setBrowsing(!browsing)} aria-expanded={browsing}>
          Ordner hinzufügen
        </Button>
      </div>
      {browsing ? (
        <div className="grid gap-3 rounded-lg border border-line p-3">
          <Segmented
            label="Rechner"
            value={host}
            options={hostOptions()}
            onChange={(next: HostId) => {
              setHost(next)
              setPath(null)
            }}
          />
          <div className="h-64 overflow-hidden rounded-md border border-line">
            <FolderBrowser key={host} host={host} initialPath={host === 'local' ? (useSettings.getState().settings?.projectsRoot ?? '~') : (findDevice(host)?.projectsDir || '~')} selectedPath={path} onSelect={setPath} />
          </div>
          <div className="flex items-center justify-end gap-2">
            <p aria-live="polite" className="min-w-0 flex-1 truncate font-mono text-2xs text-ink-3" title={path ?? undefined}>
              {path ?? 'Ordner auswählen'}
            </p>
            <Button
              size="sm"
              variant="primary"
              disabled={!path}
              onClick={() => {
                if (!path) return
                void addEntry(host, path, baseName(path)).then(() => {
                  setPath(null)
                  setBrowsing(false)
                })
              }}
            >
              Als privat markieren
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** Inhalt der Einstellungsgruppe „Privatmodus“. */
export function PrivacySection(): React.JSX.Element {
  const status = usePrivacy((s) => s.status)
  const projects = usePrivacy((s) => s.projects)
  const { load, lock, unlock, setPin, remove } = usePrivacy.getState()
  const [dialog, setDialog] = useState<PinDialogMode | null>(null)

  useEffect(() => {
    void load()
  }, [load])

  if (!status) return <p className="text-xs text-ink-3">Lädt …</p>
  const count = status.hiddenCount === 1 ? '1 Projekt' : `${status.hiddenCount} Projekte`

  return (
    <div>
      <Switch
        checked={status.locked}
        label="Privatmodus"
        description={status.locked ? `Aktiv: ${count} ausgeblendet. Ausschalten nur mit PIN.` : 'Aus: private Projekte sind sichtbar. Einschalten blendet sie sofort aus.'}
        onChange={(on) => {
          if (on) void lock()
          else setDialog(status.hasPin ? 'unlock' : 'create')
        }}
      />
      {status.locked ? (
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-3">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden /> Die Liste der privaten Projekte ist nur entsperrt sichtbar. Beim App-Start ist der Privatmodus immer an.
        </p>
      ) : (
        <>
          <ul className="mt-5 divide-y divide-line rounded-lg border border-line">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <LockOpen className="size-3.5 shrink-0 text-ink-3" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8125rem] font-[560] text-ink">
                    {p.label} <span className="font-normal text-ink-3">· {hostLabel(p.host)}</span>
                  </p>
                  <p className="truncate font-mono text-2xs text-ink-3" title={p.path}>
                    {p.path}
                  </p>
                </div>
                <Button size="sm" variant="ghost" icon={Trash2} aria-label={`„${p.label}“ entfernen (nicht mehr privat)`} onClick={() => void remove(p.id)}>
                  Entfernen
                </Button>
              </li>
            ))}
            {projects.length === 0 ? <li className="px-3 py-2.5 text-xs text-ink-3">Noch keine privaten Projekte.</li> : null}
          </ul>
          <AddPrivate />
          <div className="mt-4">
            <Button size="sm" variant="ghost" icon={KeyRound} onClick={() => setDialog('change')}>
              PIN ändern
            </Button>
          </div>
        </>
      )}
      <PinDialog
        mode={dialog}
        onClose={() => setDialog(null)}
        onSubmit={async (pin, next) => {
          if (dialog === 'unlock') await unlock(pin)
          else if (next !== null) await setPin(dialog === 'change' ? pin : null, next)
          if (dialog === 'change') notify.success('PIN geändert.')
        }}
      />
    </div>
  )
}
