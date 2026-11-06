import { useState } from 'react'
import { Globe, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Settings, WebLinkSettings } from '@shared/types'
import { linkError } from '@shared/links'
import { currentT, useT } from '@renderer/i18n/useT'
import { Button, IconButton } from '@renderer/components/Button'
import { LinkForm, newLink, withLinkId } from '@renderer/components/LinkForm'
import { Modal } from '@renderer/components/Modal'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { EmptyState } from '@renderer/components/States'
import { useSettings } from '@renderer/stores/settingsStore'
import { confirmAction } from '@renderer/stores/confirmStore'
import { notify } from '@renderer/stores/toastStore'

interface Editing {
  readonly link: WebLinkSettings
  readonly isNew: boolean
}

interface EditorProps {
  readonly editing: Editing | null
  readonly settings: Settings
  onClose(): void
  onSave(link: WebLinkSettings): Promise<boolean>
}

function LinkEditor({ editing, settings, onClose, onSave }: EditorProps): React.JSX.Element {
  const t = useT()
  const [draft, setDraft] = useState<WebLinkSettings | null>(editing?.link ?? null)
  const [shown, setShown] = useState(editing)
  const [saving, setSaving] = useState(false)
  // Andere Webseite geöffnet: Entwurf übernehmen (ohne Effekt, damit Eingaben nicht flackern).
  if (editing !== shown) {
    setShown(editing)
    setDraft(editing?.link ?? null)
  }
  const invalid = draft ? linkError(draft, settings.links, t) : null
  const l = t.settings.links
  const title = editing?.isNew ? l.add : l.editTitle(editing?.link.name ?? t.frame.link.subjectFallback)
  return (
    <Modal open={editing !== null} label={title} onClose={onClose} className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-raised p-6 shadow-2xl">
      <h2 className="mb-1 text-[0.9375rem] font-[620] text-ink">{title}</h2>
      <p className="mb-5 text-xs leading-relaxed text-ink-3">{l.intro}</p>
      {draft ? <LinkForm value={draft} devices={settings.devices} onChange={setDraft} /> : null}
      <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-4">
        {invalid ? <p className="mr-auto min-w-0 text-xs text-ink-3">{invalid}</p> : null}
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
  readonly link: WebLinkSettings
  readonly deviceName: string | null
  onEdit(): void
  onRemove(): void
}

function LinkRow({ link, deviceName, onEdit, onRemove }: RowProps): React.JSX.Element {
  const l = useT().settings.links
  return (
    <li className="flex items-center gap-3 py-3">
      <ProjectMark color={link.color} icon={link.icon} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[0.8125rem] font-[600] text-ink">
          <span className="truncate">{link.name}</span>
          {deviceName ? <span className="shrink-0 rounded-full bg-raised-2 px-2 text-2xs font-[560] text-ink-3">{l.underDevice(deviceName)}</span> : null}
        </p>
        <p className="truncate font-mono text-2xs text-ink-3">{link.url}</p>
      </div>
      <IconButton size="sm" icon={Pencil} label={l.edit(link.name)} onClick={onEdit} />
      <IconButton size="sm" icon={Trash2} tone="danger" label={l.remove(link.name)} onClick={onRemove} />
    </li>
  )
}

/** Webseiten hinzufügen, bearbeiten und entfernen; sie erscheinen in der Seitenleiste unter „Verknüpfungen“. */
export function LinksSection({ settings }: { readonly settings: Settings }): React.JSX.Element {
  const l = useT().settings.links
  const update = useSettings((s) => s.update)
  const [editing, setEditing] = useState<Editing | null>(null)
  const links = settings.links
  const deviceName = (id: string | null): string | null => settings.devices.find((d) => d.id === id)?.name ?? null

  const save = async (draft: WebLinkSettings): Promise<boolean> => {
    const link = withLinkId(draft, links)
    const next = editing?.isNew ? [...links, link] : links.map((l) => (l.id === link.id ? link : l))
    const ok = await update({ links: next })
    if (ok) notify.success(editing?.isNew ? currentT().settings.links.added(link.name) : currentT().settings.links.saved(link.name))
    return ok
  }

  const remove = async (link: WebLinkSettings): Promise<void> => {
    const text = currentT().settings.links
    const ok = await confirmAction({ title: text.removeTitle(link.name), message: text.removeMessage, confirmLabel: currentT().settings.devices.removeConfirm, danger: true })
    if (ok && (await update({ links: links.filter((l) => l.id !== link.id) }))) notify.success(currentT().settings.links.removed(link.name))
  }

  return (
    <>
      {links.length === 0 ? (
        <EmptyState icon={Globe} title={l.emptyTitle} compact>
          {l.emptyBody}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {links.map((l) => (
            <LinkRow key={l.id} link={l} deviceName={deviceName(l.deviceId)} onEdit={() => setEditing({ link: l, isNew: false })} onRemove={() => void remove(l)} />
          ))}
        </ul>
      )}
      <div className="mt-4">
        <Button size="sm" icon={Plus} onClick={() => setEditing({ link: newLink(links, settings.devices), isNew: true })}>
          {l.add}
        </Button>
      </div>
      <LinkEditor editing={editing} settings={settings} onClose={() => setEditing(null)} onSave={save} />
    </>
  )
}
