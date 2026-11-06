import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Boxes, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Messages } from '@shared/i18n/messages'
import type { CustomModel, CustomModelInput, CustomModelStatus, HostId } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt, errorMessage, unwrap } from '@renderer/api/call'
import { Button, IconButton } from '@renderer/components/Button'
import { Field, Segmented } from '@renderer/components/Controls'
import { HostBadge } from '@renderer/components/Host'
import { EmptyState, ErrorState, SkeletonRows } from '@renderer/components/States'
import { confirmAction } from '@renderer/stores/confirmStore'
import { notify } from '@renderer/stores/toastStore'
import { currentT, useT } from '@renderer/i18n/useT'
import { formatRelative } from '@renderer/lib/format'
import { hostOptions } from '@renderer/lib/hosts'

const STATUSES: readonly CustomModelStatus[] = ['aktiv', 'training', 'archiviert']
const STATUS_STYLE: Readonly<Record<CustomModelStatus, string>> = {
  aktiv: 'bg-raised-2 text-ink',
  training: 'bg-accent-soft text-accent-text',
  archiviert: 'bg-raised text-ink-3'
}

const statusLabel = (t: Messages['models'], status: CustomModelStatus): string =>
  status === 'aktiv' ? t.statusActive : status === 'training' ? t.statusTraining : t.statusArchived

const EMPTY: CustomModelInput = { name: '', host: 'local', path: '', kind: '', note: '', status: 'aktiv' }

function ModelForm({ initial, onDone }: { readonly initial: CustomModelInput; onDone(saved: CustomModel | null): void }): React.JSX.Element {
  const { models: t, common } = useT()
  const [draft, setDraft] = useState<CustomModelInput>(initial)
  const [saving, setSaving] = useState(false)
  const [nameMissing, setNameMissing] = useState(false)
  const set = <K extends keyof CustomModelInput>(key: K, value: CustomModelInput[K]): void => setDraft((d) => ({ ...d, [key]: value }))

  const submit = async (): Promise<void> => {
    if (!draft.name.trim()) {
      setNameMissing(true)
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
      <Field label={t.fieldName} error={nameMissing ? t.nameRequired : null}>
        {(id, d) => <input id={id} aria-describedby={d} autoFocus value={draft.name} onChange={(e) => set('name', e.target.value)} className="field" placeholder={t.fieldNamePlaceholder} />}
      </Field>
      <Field label={t.fieldKind}>
        {(id) => <input id={id} value={draft.kind} onChange={(e) => set('kind', e.target.value)} className="field" placeholder={t.fieldKindPlaceholder} />}
      </Field>
      <Field label={t.fieldPath} className="col-span-2">
        {(id) => <input id={id} value={draft.path} onChange={(e) => set('path', e.target.value)} className="field font-mono text-xs" placeholder={t.fieldPathPlaceholder} spellCheck={false} />}
      </Field>
      <Field label={t.fieldNote} className="col-span-2">
        {(id) => <input id={id} value={draft.note} onChange={(e) => set('note', e.target.value)} className="field" placeholder={t.fieldNotePlaceholder} />}
      </Field>
      <div className="col-span-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Segmented<HostId>
            label={t.fieldHost}
            value={draft.host}
            onChange={(v) => set('host', v)}
            options={hostOptions()}
          />
          <Segmented<CustomModelStatus> label={t.fieldStatus} value={draft.status} onChange={(v) => set('status', v)} options={STATUSES.map((s) => ({ value: s, label: statusLabel(t, s) }))} />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => onDone(null)}>
            {common.cancel}
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {draft.id === undefined ? t.create : common.save}
          </Button>
        </div>
      </div>
    </form>
  )
}

export function CustomModels({ creating, onCreatingChange }: { readonly creating: boolean; onCreatingChange(v: boolean): void }): React.JSX.Element {
  const { models: t, common } = useT()
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
    notify.success(isNew ? currentT().models.created(saved.name) : currentT().models.saved(saved.name))
  }

  const remove = async (model: CustomModel): Promise<void> => {
    const ok = await confirmAction({ title: t.deleteTitle(model.name), message: t.deleteMessage, confirmLabel: common.delete, danger: true })
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
        <EmptyState icon={Boxes} title={t.emptyTitle} compact action={<Button icon={Plus} onClick={() => onCreatingChange(true)}>{t.addModel}</Button>}>
          {t.emptyBody}
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
                    <span className={`inline-flex h-5 items-center rounded-full px-2 text-2xs font-[600] ${STATUS_STYLE[m.status]}`}>{statusLabel(t, m.status)}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-ink-3">
                    {[m.kind, m.note].filter(Boolean).join(' · ') || t.noDescription}
                  </p>
                  {m.path ? <p className="mt-0.5 truncate font-mono text-2xs text-ink-3">{m.path}</p> : null}
                </div>
                <HostBadge host={m.host} subtle />
                <span className="num w-24 text-right text-xs text-ink-3">{formatRelative(m.updatedAt)}</span>
                <div className="flex gap-0.5 opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  <IconButton size="sm" icon={Pencil} label={t.edit(m.name)} onClick={() => setEditingId(m.id)} />
                  <IconButton size="sm" icon={Trash2} tone="danger" label={t.remove(m.name)} onClick={() => void remove(m)} />
                </div>
              </li>
            )
          )}
        </ul>
      ) : null}
    </div>
  )
}
