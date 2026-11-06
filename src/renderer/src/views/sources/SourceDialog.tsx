import { useState, type FormEvent } from 'react'
import type { Source } from '@shared/types'
import { isWebUrl, normalizeUrl } from '@shared/links'
import { Button } from '@renderer/components/Button'
import { Field } from '@renderer/components/Controls'
import { Modal } from '@renderer/components/Modal'
import { hostLabel } from '@renderer/lib/hosts'
import { useSources } from '@renderer/stores/sourcesStore'
import { notify } from '@renderer/stores/toastStore'
import { currentT, useT } from '@renderer/i18n/useT'
import type { Messages } from '@shared/i18n/messages'
import { folderKeyOf, type SourceFolder } from './folders'

/** Was der Dialog gerade tut: neue Quelle in einem Ordner, oder eine vorhandene bearbeiten bzw. verschieben. */
export type SourceDialogRequest =
  | { readonly kind: 'add'; readonly folderKey: string }
  | { readonly kind: 'edit'; readonly source: Source }
  | { readonly kind: 'move'; readonly source: Source }

interface SourceDialogProps {
  readonly request: SourceDialogRequest | null
  readonly folders: readonly SourceFolder[]
  onClose(): void
  /** Nach dem Speichern: Zielordner, damit die Ansicht dorthin wechseln kann. */
  onSaved(folderKey: string): void
}

function dialogTitle(t: Messages, kind: SourceDialogRequest['kind']): string {
  const titles: Readonly<Record<SourceDialogRequest['kind'], string>> = {
    add: t.sources.dialogAdd,
    edit: t.sources.dialogEdit,
    move: t.sources.dialogMove
  }
  return titles[kind]
}

/** Ordnerauswahl; mehrere Rechner bekommen den Rechnernamen dazu. */
function folderOptionLabel(folder: SourceFolder, folders: readonly SourceFolder[]): string {
  const twin = folders.some((f) => f !== folder && f.label === folder.label)
  return twin && folder.host ? `${folder.label} (${hostLabel(folder.host)})` : folder.label
}

export function SourceDialog({ request, folders, onClose, onSaved }: SourceDialogProps): React.JSX.Element {
  const t = useT()
  return (
    <Modal
      open={request !== null}
      label={request ? dialogTitle(t, request.kind) : t.sources.sourceFallback}
      onClose={onClose}
      className="w-full max-w-[30rem] rounded-xl border border-line-strong/70 bg-raised p-5 shadow-[0_24px_60px_-12px_oklch(0_0_0/0.7)]"
    >
      {request ? <SourceForm key={request.kind === 'add' ? 'add' : `${request.kind}-${request.source.id}`} request={request} folders={folders} onClose={onClose} onSaved={onSaved} /> : null}
    </Modal>
  )
}

interface SourceFormProps {
  readonly request: SourceDialogRequest
  readonly folders: readonly SourceFolder[]
  onClose(): void
  onSaved(folderKey: string): void
}

/** Warum die Adresse nicht angenommen wurde; der Text folgt der aktuellen Sprache. */
type UrlProblem = 'invalid' | 'required'

function SourceForm({ request, folders, onClose, onSaved }: SourceFormProps): React.JSX.Element {
  const t = useT()
  const add = useSources((s) => s.add)
  const update = useSources((s) => s.update)
  const existing = request.kind === 'add' ? null : request.source
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState(existing?.title ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [folderKey, setFolderKey] = useState(request.kind === 'add' ? request.folderKey : folderKeyOf(request.source))
  const [urlProblem, setUrlProblem] = useState<UrlProblem | null>(null)
  const urlError = urlProblem === null ? null : urlProblem === 'invalid' ? t.sources.urlError : t.sources.urlRequired
  const [saving, setSaving] = useState(false)
  const folder = folders.find((f) => f.key === folderKey) ?? folders[folders.length - 1]

  const save = async (): Promise<boolean> => {
    const target = { host: folder?.host ?? null, project: folder?.project ?? null }
    if (existing) return update(existing.id, { title: title.trim(), note: note.trim(), ...target })
    const created = await add({ url: normalizeUrl(url), title: title.trim(), note: note.trim(), ...target })
    return created !== null
  }

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (!existing && !isWebUrl(normalizeUrl(url))) {
      setUrlProblem(url.trim() ? 'invalid' : 'required')
      return
    }
    setSaving(true)
    const ok = await save()
    setSaving(false)
    if (!ok) return
    notify.success(request.kind === 'move' ? currentT().sources.moved(folder?.label ?? '') : currentT().sources.saved)
    onSaved(folder?.key ?? folderKey)
    onClose()
  }

  const moveOnly = request.kind === 'move'
  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <h2 className="text-[0.9375rem] font-[640] text-ink">{dialogTitle(t, request.kind)}</h2>
      {existing ? <p className="mt-1 truncate font-mono text-2xs text-ink-3" title={existing.url}>{existing.url}</p> : null}
      <div className="mt-4 space-y-4">
        {existing ? null : (
          <Field label={t.frame.fields.address} error={urlError}>
            {(id, d) => (
              <input
                id={id}
                aria-describedby={d}
                aria-invalid={urlError !== null}
                data-autofocus
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setUrlProblem(null)
                }}
                className="field font-mono text-xs"
                placeholder={t.sources.urlPlaceholder}
                spellCheck={false}
                inputMode="url"
              />
            )}
          </Field>
        )}
        {moveOnly ? null : (
          <>
            <Field label={t.sources.fieldTitle} hint={existing ? undefined : t.sources.titleHint}>
              {(id, d) => <input id={id} aria-describedby={d} data-autofocus={existing ? true : undefined} value={title} onChange={(e) => setTitle(e.target.value)} className="field" placeholder={t.sources.titlePlaceholder} />}
            </Field>
            <Field label={t.sources.fieldNote} hint={t.sources.noteHint}>
              {(id, d) => <input id={id} aria-describedby={d} value={note} onChange={(e) => setNote(e.target.value)} className="field" placeholder={t.sources.notePlaceholder} />}
            </Field>
          </>
        )}
        <Field label={t.sources.fieldFolder}>
          {(id, d) => (
            <select id={id} aria-describedby={d} data-autofocus={moveOnly ? true : undefined} value={folder?.key ?? folderKey} onChange={(e) => setFolderKey(e.target.value)} className="field">
              {folders.map((f) => (
                <option key={f.key} value={f.key}>
                  {folderOptionLabel(f, folders)}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          {t.common.cancel}
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          {moveOnly ? t.sources.move : t.common.save}
        </Button>
      </div>
    </form>
  )
}
