import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Boxes, Pencil, Plus, Trash2 } from 'lucide-react'
import type { CustomModel, CustomModelInput, CustomModelStatus, HostId } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt, errorMessage, unwrap } from '@renderer/api/call'
import { Button, IconButton } from '@renderer/components/Button'
import { Field, Segmented } from '@renderer/components/Controls'
import { HostBadge } from '@renderer/components/Host'
import { EmptyState, ErrorState, SkeletonRows } from '@renderer/components/States'
import { confirmAction } from '@renderer/stores/confirmStore'
import { notify } from '@renderer/stores/toastStore'
import { formatRelative } from '@renderer/lib/format'
import { hostOptions } from '@renderer/lib/hosts'

const STATUSES: readonly CustomModelStatus[] = ['aktiv', 'training', 'archiviert']
const STATUS_LABEL: Readonly<Record<CustomModelStatus, string>> = { aktiv: 'Aktiv', training: 'Training', archiviert: 'Archiviert' }
const STATUS_STYLE: Readonly<Record<CustomModelStatus, string>> = {
  aktiv: 'bg-raised-2 text-ink',
  training: 'bg-accent-soft text-accent-text',
  archiviert: 'bg-raised text-ink-3'
}

const EMPTY: CustomModelInput = { name: '', host: 'local', path: '', kind: '', note: '', status: 'aktiv' }

function ModelForm({ initial, onDone }: { readonly initial: CustomModelInput; onDone(saved: CustomModel | null): void }): React.JSX.Element {
  const [draft, setDraft] = useState<CustomModelInput>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof CustomModelInput>(key: K, value: CustomModelInput[K]): void => setDraft((d) => ({ ...d, [key]: value }))

  const submit = async (): Promise<void> => {
    if (!draft.name.trim()) {
      setError('Bitte einen Namen vergeben.')
      return
    }
    setSaving(true)
    const saved = await attempt(api.models.upsertCustom({ ...draft, name: draft.name.trim(), path: draft.path.trim(), kind: draft.kind.trim(), note: draft.note.trim() }))
    setSaving(false)
    if (saved) onDone(saved)
  }

  return (
    <form
      className="grid grid-cols-2 gap-4 rounded-xl border border-line-strong/60 bg-raised p-5"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onDone(null)
      }}
    >
      <Field label="Name" error={error}>
        {(id, d) => <input id={id} aria-describedby={d} autoFocus value={draft.name} onChange={(e) => set('name', e.target.value)} className="field" placeholder="z. B. music-taste-encoder" />}
      </Field>
      <Field label="Art">
        {(id) => <input id={id} value={draft.kind} onChange={(e) => set('kind', e.target.value)} className="field" placeholder="z. B. Embedding · PyTorch" />}
      </Field>
      <Field label="Pfad" className="col-span-2">
        {(id) => <input id={id} value={draft.path} onChange={(e) => set('path', e.target.value)} className="field font-mono text-xs" placeholder="Ordner oder Datei des Modells" spellCheck={false} />}
      </Field>
      <Field label="Notiz" className="col-span-2">
        {(id) => <input id={id} value={draft.note} onChange={(e) => set('note', e.target.value)} className="field" placeholder="Wofür, Stand, Besonderheiten" />}
      </Field>
      <div className="col-span-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Segmented<HostId>
            label="Rechner"
            value={draft.host}
            onChange={(v) => set('host', v)}
            options={hostOptions()}
          />
          <Segmented<CustomModelStatus> label="Status" value={draft.status} onChange={(v) => set('status', v)} options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => onDone(null)}>
            Abbrechen
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {draft.id === undefined ? 'Anlegen' : 'Speichern'}
          </Button>
        </div>
      </div>
    </form>
  )
}

export function CustomModels({ creating, onCreatingChange }: { readonly creating: boolean; onCreatingChange(v: boolean): void }): React.JSX.Element {
  const [models, setModels] = useState<CustomModel[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  const load = (): void => {
    setError(null)
    unwrap(api.models.listCustom())
      .then(setModels)
      .catch((e: unknown) => setError(errorMessage(e)))
  }
  useEffect(load, [])

  const onSaved = (saved: CustomModel | null, isNew: boolean): void => {
    if (isNew) onCreatingChange(false)
    else setEditingId(null)
    if (!saved) return
    setModels((list) => (isNew ? [...(list ?? []), saved] : (list ?? []).map((m) => (m.id === saved.id ? saved : m))))
    notify.success(isNew ? `„${saved.name}“ angelegt.` : `„${saved.name}“ gespeichert.`)
  }

  const remove = async (model: CustomModel): Promise<void> => {
    const ok = await confirmAction({ title: `„${model.name}“ löschen?`, message: 'Nur der Eintrag wird gelöscht, die Modelldateien bleiben unberührt.', confirmLabel: 'Löschen', danger: true })
    if (!ok) return
    if ((await attempt(api.models.removeCustom(model.id))) !== null) setModels((list) => (list ?? []).filter((m) => m.id !== model.id))
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {creating ? (
          <motion.div key="new" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="pb-3">
              <ModelForm initial={EMPTY} onDone={(m) => onSaved(m, true)} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {error ? <ErrorState message={error} onRetry={load} /> : null}
      {!models && !error ? <SkeletonRows rows={3} /> : null}
      {models && models.length === 0 && !creating ? (
        <EmptyState icon={Boxes} title="Noch keine eigenen Modelle" compact action={<Button icon={Plus} onClick={() => onCreatingChange(true)}>Modell eintragen</Button>}>
          Trage selbst trainierte oder angepasste Modelle ein, damit Pfad, Zweck und Stand an einer Stelle stehen.
        </EmptyState>
      ) : null}
      {models && models.length > 0 ? (
        <ul className="divide-y divide-line border-y border-line">
          {models.map((m) =>
            editingId === m.id ? (
              <li key={m.id} className="py-3">
                <ModelForm initial={m} onDone={(saved) => onSaved(saved, false)} />
              </li>
            ) : (
              <li key={m.id} className="group flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <p className="truncate font-mono text-[0.8125rem] font-[560] text-ink">{m.name}</p>
                    <span className={`inline-flex h-5 items-center rounded-full px-2 text-2xs font-[600] ${STATUS_STYLE[m.status]}`}>{STATUS_LABEL[m.status]}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-ink-3">
                    {[m.kind, m.note].filter(Boolean).join(' · ') || 'Keine Beschreibung'}
                  </p>
                  {m.path ? <p className="mt-0.5 truncate font-mono text-2xs text-ink-3">{m.path}</p> : null}
                </div>
                <HostBadge host={m.host} subtle />
                <span className="num w-24 text-right text-xs text-ink-3">{formatRelative(m.updatedAt)}</span>
                <div className="flex gap-0.5 opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  <IconButton size="sm" icon={Pencil} label={`${m.name} bearbeiten`} onClick={() => setEditingId(m.id)} />
                  <IconButton size="sm" icon={Trash2} tone="danger" label={`${m.name} löschen`} onClick={() => void remove(m)} />
                </div>
              </li>
            )
          )}
        </ul>
      ) : null}
    </div>
  )
}
