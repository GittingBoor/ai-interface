import { useState } from 'react'
import { Eye, EyeOff, Pencil, Plus, RotateCcw, Server, Trash2 } from 'lucide-react'
import type { DeviceSettings, Settings } from '@shared/types'
import { deviceNavId } from '@shared/layout'
import { Button, IconButton } from '@renderer/components/Button'
import { DeviceForm, deviceError, newDevice, withId } from '@renderer/components/DeviceForm'
import { Modal } from '@renderer/components/Modal'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { EmptyState } from '@renderer/components/States'
import { useSettings } from '@renderer/stores/settingsStore'
import { confirmAction } from '@renderer/stores/confirmStore'
import { notify } from '@renderer/stores/toastStore'
import { currentT, useT } from '@renderer/i18n/useT'

/** Standardpfad für neue Geräte: der SSH-Schlüssel des ersten Geräts oder `~/.ssh/id_ed25519`. */
function defaultKeyPath(settings: Settings): string {
  return settings.devices[0]?.privateKeyPath ?? '~/.ssh/id_ed25519'
}

interface EditorProps {
  readonly device: DeviceSettings | null
  readonly others: readonly DeviceSettings[]
  readonly isNew: boolean
  onClose(): void
  onSave(device: DeviceSettings): Promise<boolean>
}

function DeviceEditor({ device, others, isNew, onClose, onSave }: EditorProps): React.JSX.Element {
  const t = useT()
  const d = t.settings.devices
  const [draft, setDraft] = useState<DeviceSettings | null>(device)
  const [saving, setSaving] = useState(false)
  const [shown, setShown] = useState(device)
  // Neues Gerät geöffnet: Entwurf übernehmen (ohne Effekt, damit Eingaben nicht flackern).
  if (device !== shown) {
    setShown(device)
    setDraft(device)
  }
  const invalid = draft ? deviceError(draft, others) : null
  return (
    <Modal open={device !== null} label={isNew ? d.add : d.editTitle(device?.name ?? t.device.deviceFallback)} onClose={onClose} className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-raised p-6 shadow-2xl">
      <h2 className="mb-1 text-[0.9375rem] font-[620] text-ink">{isNew ? d.add : d.editTitle(device?.name ?? t.device.deviceFallback)}</h2>
      <p className="mb-5 text-xs leading-relaxed text-ink-3">{d.intro}</p>
      {draft ? <DeviceForm value={draft} others={others} onChange={setDraft} /> : null}
      <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onClose}>
          {t.common.cancel}
        </Button>
        <Button
          variant="primary"
          loading={saving}
          disabled={invalid !== null}
          onClick={() => {
            if (!draft) return
            setSaving(true)
            void onSave(draft).then((ok) => {
              setSaving(false)
              if (ok) onClose()
            })
          }}
        >
          {t.common.save}
        </Button>
      </div>
    </Modal>
  )
}

interface RowProps {
  readonly device: DeviceSettings
  readonly inSidebar: boolean
  onEdit(): void
  onToggleSidebar(): void
  onResetFingerprint(): void
  onRemove(): void
}

function DeviceRow({ device, inSidebar, onEdit, onToggleSidebar, onResetFingerprint, onRemove }: RowProps): React.JSX.Element {
  const d = useT().settings.devices
  return (
    <li className="flex items-center gap-3 py-3">
      <ProjectMark color={device.color} icon={device.icon} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[0.8125rem] font-[600] text-ink">
          <span className="truncate">{device.name}</span>
          {!device.enabled ? <span className="rounded-full bg-raised-2 px-2 text-2xs font-[560] text-ink-3">{d.off}</span> : null}
        </p>
        <p className="truncate font-mono text-2xs text-ink-3">
          {device.user}@{device.host}
          {device.port !== 22 ? `:${device.port}` : ''} · {device.projectsDir}
        </p>
      </div>
      <IconButton size="sm" icon={inSidebar ? Eye : EyeOff} label={inSidebar ? d.pinHide : d.pinShow} onClick={onToggleSidebar} disabled={!device.enabled} />
      <IconButton size="sm" icon={RotateCcw} label={d.resetFingerprint} onClick={onResetFingerprint} disabled={!device.hostFingerprint} />
      <IconButton size="sm" icon={Pencil} label={d.edit(device.name)} onClick={onEdit} />
      <IconButton size="sm" icon={Trash2} tone="danger" label={d.remove(device.name)} onClick={onRemove} />
    </li>
  )
}

/** Geräte hinzufügen, bearbeiten, in der Seitenleiste anheften und entfernen. */
export function DevicesSection({ settings }: { readonly settings: Settings }): React.JSX.Element {
  const d = useT().settings.devices
  const update = useSettings((s) => s.update)
  const resetFingerprint = useSettings((s) => s.resetFingerprint)
  const [editing, setEditing] = useState<{ readonly device: DeviceSettings; readonly isNew: boolean } | null>(null)
  const devices = settings.devices
  const nav = settings.navigation

  const save = async (draft: DeviceSettings): Promise<boolean> => {
    const others = devices.filter((d) => d.id !== draft.id || !draft.id)
    const device = withId(draft, others)
    const next = editing?.isNew ? [...devices, device] : devices.map((d) => (d.id === device.id ? device : d))
    const ok = await update({ devices: next })
    if (ok) notify.success(editing?.isNew ? currentT().settings.devices.added(device.name) : currentT().settings.devices.saved(device.name))
    return ok
  }

  const toggleSidebar = (device: DeviceSettings): void => {
    const id = deviceNavId(device.id)
    const hidden = nav.hidden.includes(id) ? nav.hidden.filter((h) => h !== id) : [...nav.hidden, id]
    void update({ navigation: { ...nav, hidden } })
  }

  const remove = async (device: DeviceSettings): Promise<void> => {
    const text = currentT().settings.devices
    const ok = await confirmAction({ title: text.removeTitle(device.name), message: text.removeMessage, confirmLabel: text.removeConfirm, danger: true })
    if (ok && (await update({ devices: devices.filter((d) => d.id !== device.id) }))) notify.success(currentT().settings.devices.removed(device.name))
  }

  const onResetFingerprint = async (device: DeviceSettings): Promise<void> => {
    const text = currentT().settings.devices
    const ok = await confirmAction({ title: text.fingerprintTitle, message: text.fingerprintMessage(device.name), confirmLabel: text.fingerprintConfirm, danger: true })
    if (ok && (await resetFingerprint(device.id))) notify.success(currentT().settings.devices.fingerprintDone)
  }

  return (
    <>
      {devices.length === 0 ? (
        <EmptyState icon={Server} title={d.emptyTitle} compact>
          {d.emptyBody}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {devices.map((d) => (
            <DeviceRow
              key={d.id}
              device={d}
              inSidebar={d.enabled && !nav.hidden.includes(deviceNavId(d.id))}
              onEdit={() => setEditing({ device: d, isNew: false })}
              onToggleSidebar={() => toggleSidebar(d)}
              onResetFingerprint={() => void onResetFingerprint(d)}
              onRemove={() => void remove(d)}
            />
          ))}
        </ul>
      )}
      <div className="mt-4">
        <Button size="sm" icon={Plus} onClick={() => setEditing({ device: newDevice(devices, defaultKeyPath(settings)), isNew: true })}>
          {d.add}
        </Button>
      </div>
      <DeviceEditor device={editing?.device ?? null} others={editing?.isNew ? devices : devices.filter((d) => d.id !== editing?.device.id)} isNew={editing?.isNew ?? false} onClose={() => setEditing(null)} onSave={save} />
    </>
  )
}
