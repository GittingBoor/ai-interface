import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ChevronUp, GripVertical, Plus, Tags, Trash2, X } from 'lucide-react'
import type { Category } from '@shared/types'
import { Button, IconButton } from '@renderer/components/Button'
import { ColorPicker } from '@renderer/components/ColorPicker'
import { IconPicker } from '@renderer/components/IconPicker'
import { Modal } from '@renderer/components/Modal'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { EmptyState } from '@renderer/components/States'
import { useCategories } from '@renderer/stores/categoriesStore'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { confirmAction } from '@renderer/stores/confirmStore'
import { notify } from '@renderer/stores/toastStore'
import { FAVORITE_COLORS } from '@renderer/lib/hosts'
import { moveBy } from '@renderer/lib/projectOrganize'

const FALLBACK_COLOR = '#a39e96'
const EXPAND_EASE = [0.16, 1, 0.3, 1] as const

const projectCount = (n: number): string => (n === 1 ? '1 Projekt' : `${n} Projekte`)

function nameTaken(categories: readonly Category[], name: string, exceptId: number | null): boolean {
  const wanted = name.trim().toLocaleLowerCase('de-DE')
  return categories.some((c) => c.id !== exceptId && c.name.toLocaleLowerCase('de-DE') === wanted)
}

interface NameFieldProps {
  readonly category: Category
  readonly categories: readonly Category[]
}

/** Name als Knopf; Klick macht daraus ein Eingabefeld (Enter speichert, Esc verwirft). */
function NameField({ category, categories }: NameFieldProps): React.JSX.Element {
  const update = useCategories((s) => s.update)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => setName(category.name), [category.name])

  const cancel = (): void => {
    setName(category.name)
    setError(null)
    setEditing(false)
  }

  const save = async (): Promise<void> => {
    const trimmed = name.trim()
    if (!trimmed) return setError('Name darf nicht leer sein.')
    if (nameTaken(categories, trimmed, category.id)) return setError(`„${trimmed}“ gibt es schon.`)
    if (trimmed !== category.name && !(await update(category.id, { name: trimmed }))) return
    setError(null)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Umbenennen"
        className="min-w-0 flex-1 truncate rounded-md px-1.5 py-1 text-left text-[0.8125rem] font-[580] text-ink transition-colors hover:bg-raised-2"
      >
        {category.name}
      </button>
    )
  }
  return (
    <div className="min-w-0 flex-1">
      <input
        autoFocus
        data-own-escape
        aria-label={`Name der Art ${category.name}`}
        aria-invalid={error !== null}
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setError(null)
        }}
        onFocus={(e) => e.target.select()}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void save()
          if (e.key === 'Escape') cancel()
        }}
        className="field h-7 text-[0.8125rem] font-[580]"
      />
      {error ? <p className="mt-1 text-2xs text-danger-ink">{error}</p> : null}
    </div>
  )
}

interface CategoryRowProps {
  readonly category: Category
  readonly categories: readonly Category[]
  readonly index: number
  readonly count: number
  readonly expanded: boolean
  readonly dragging: boolean
  onToggleColor(): void
  onMove(dir: -1 | 1): void
  onDragStart(): void
  onDragOver(): void
  onDragEnd(): void
}

function CategoryRow(props: CategoryRowProps): React.JSX.Element {
  const { category, categories, index, count, expanded, dragging } = props
  const update = useCategories((s) => s.update)
  const remove = useCategories((s) => s.remove)
  const [picking, setPicking] = useState(false)

  const onDelete = async (): Promise<void> => {
    const ok = await confirmAction({
      title: `Art „${category.name}“ löschen?`,
      message: count > 0 ? `${projectCount(count)} ${count === 1 ? 'wird' : 'werden'} „Ohne Art“. Die Projekte selbst bleiben erhalten.` : 'Keinem Projekt ist diese Art zugeordnet.',
      confirmLabel: 'Löschen',
      danger: true
    })
    if (!ok) return
    const affected = await remove(category.id)
    if (affected !== null) notify.success(affected > 0 ? `„${category.name}“ gelöscht, ${projectCount(affected)} jetzt ohne Art.` : `„${category.name}“ gelöscht.`)
  }

  return (
    <motion.li layout="position" transition={{ type: 'spring', stiffness: 500, damping: 40 }} className={dragging ? 'opacity-40' : ''}>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', String(category.id))
          props.onDragStart()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          props.onDragOver()
        }}
        onDragEnd={props.onDragEnd}
        onDrop={(e) => e.preventDefault()}
        className="group flex items-center gap-1.5 rounded-lg py-1.5 pr-1.5 pl-1 transition-colors hover:bg-raised-2/50"
      >
        <span className="cursor-grab text-ink-3 opacity-50 transition-opacity group-hover:opacity-100 active:cursor-grabbing" aria-hidden>
          <GripVertical className="size-4" />
        </span>
        <button
          type="button"
          onClick={() => setPicking(true)}
          aria-label={`Symbol von ${category.name} ändern`}
          title="Symbol ändern"
          className="rounded-lg transition-transform duration-150 hover:scale-105 active:scale-95"
        >
          <ProjectMark color={category.color} icon={category.icon} size="lg" />
        </button>
        <NameField category={category} categories={categories} />
        <span className="num w-[4.5rem] shrink-0 text-right text-2xs text-ink-3">{projectCount(count)}</span>
        <button
          type="button"
          onClick={props.onToggleColor}
          aria-expanded={expanded}
          aria-label={`Farbe von ${category.name} ändern`}
          title="Farbe ändern"
          className={`grid size-7 shrink-0 place-items-center rounded-md transition-colors hover:bg-raised-2 ${expanded ? 'bg-raised-2' : ''}`}
        >
          <span className="size-3.5 rounded-[4px]" style={{ background: category.color }} />
        </button>
        <div className="flex shrink-0">
          <IconButton size="sm" icon={ChevronUp} label={`${category.name} nach oben`} disabled={index === 0} onClick={() => props.onMove(-1)} />
          <IconButton size="sm" icon={ChevronDown} label={`${category.name} nach unten`} disabled={index === categories.length - 1} onClick={() => props.onMove(1)} />
        </div>
        <IconButton size="sm" tone="danger" icon={Trash2} label={`${category.name} löschen`} onClick={() => void onDelete()} />
      </div>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: EXPAND_EASE }}
            className="overflow-hidden"
          >
            <div className="pt-1 pb-3 pl-[3.25rem]">
              <ColorPicker label={`Farbe von ${category.name}`} value={category.color} onChange={(color) => void update(category.id, { color })} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <IconPicker
        open={picking}
        value={category.icon}
        color={category.color}
        subject={`Art „${category.name}“`}
        onClose={() => setPicking(false)}
        onSelect={(icon) => void update(category.id, { icon })}
      />
    </motion.li>
  )
}

function NewCategoryForm({ categories }: { readonly categories: readonly Category[] }): React.JSX.Element {
  const add = useCategories((s) => s.add)
  const nextColor = FAVORITE_COLORS[categories.length % FAVORITE_COLORS.length] ?? FALLBACK_COLOR
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (): Promise<void> => {
    const trimmed = name.trim()
    if (!trimmed) return setError('Bitte einen Namen eingeben.')
    if (nameTaken(categories, trimmed, null)) return setError(`„${trimmed}“ gibt es schon.`)
    setSaving(true)
    const created = await add({ name: trimmed, color: nextColor, icon })
    setSaving(false)
    if (!created) return
    setName('')
    setIcon(null)
    setError(null)
  }

  return (
    <form
      className="border-t border-line px-5 py-4"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPicking(true)}
          aria-label="Symbol der neuen Art wählen"
          title="Symbol wählen"
          className="rounded-lg transition-transform duration-150 hover:scale-105 active:scale-95"
        >
          <ProjectMark color={nextColor} icon={icon} size="lg" />
        </button>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          aria-label="Name der neuen Art"
          aria-invalid={error !== null}
          placeholder="Neue Art, z. B. Musik"
          className="field flex-1"
        />
        <Button type="submit" variant="soft" icon={Plus} loading={saving}>
          Anlegen
        </Button>
      </div>
      {error ? <p className="mt-1.5 pl-10 text-xs text-danger-ink">{error}</p> : null}
      <IconPicker open={picking} value={icon} color={nextColor} subject={name.trim() || 'Neue Art'} onClose={() => setPicking(false)} onSelect={setIcon} />
    </form>
  )
}

interface CategoryManagerProps {
  readonly open: boolean
  onClose(): void
}

/** Dialog „Arten verwalten“: sortieren, anlegen, umbenennen, Farbe, Symbol, löschen. */
export function CategoryManager({ open, onClose }: CategoryManagerProps): React.JSX.Element {
  const categories = useCategories((s) => s.categories)
  const reorder = useCategories((s) => s.reorder)
  const favorites = useFavorites((s) => s.favorites)
  const [order, setOrder] = useState<number[]>(() => categories.map((c) => c.id))
  const [dragId, setDragId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    if (dragId === null) setOrder(categories.map((c) => c.id))
  }, [categories, dragId])

  const counts = useMemo(() => {
    const map = new Map<number, number>()
    for (const f of favorites) if (f.categoryId !== null) map.set(f.categoryId, (map.get(f.categoryId) ?? 0) + 1)
    return map
  }, [favorites])

  const commit = (ids: readonly number[]): void => {
    if (ids.join() !== categories.map((c) => c.id).join()) void reorder(ids)
  }
  const byId = new Map(categories.map((c) => [c.id, c]))
  const ordered = order.map((id) => byId.get(id)).filter((c): c is Category => c !== undefined)

  return (
    <Modal
      open={open}
      label="Arten verwalten"
      onClose={onClose}
      className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-line-strong/70 bg-raised shadow-[0_24px_60px_-12px_oklch(0_0_0/0.7)]"
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
        <div>
          <h2 className="text-[0.9375rem] font-[640] text-ink">Arten verwalten</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-3">Arten gruppieren deine Projekte. Die Reihenfolge hier gilt für Gruppen und Filter.</p>
        </div>
        <IconButton size="sm" icon={X} label="Schließen" onClick={onClose} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        {ordered.length === 0 ? (
          <div className="px-1">
            <EmptyState icon={Tags} title="Noch keine Arten" compact>
              Lege unten eine Art an, z. B. Programmieren oder Uni.
            </EmptyState>
          </div>
        ) : (
          <ul aria-label="Arten, per Ziehen oder Pfeilknöpfe sortierbar" className="space-y-0.5">
            {ordered.map((category, index) => (
              <CategoryRow
                key={category.id}
                category={category}
                categories={ordered}
                index={index}
                count={counts.get(category.id) ?? 0}
                expanded={expandedId === category.id}
                dragging={dragId === category.id}
                onToggleColor={() => setExpandedId(expandedId === category.id ? null : category.id)}
                onMove={(dir) => {
                  const next = moveBy(order, index, dir)
                  setOrder(next)
                  commit(next)
                }}
                onDragStart={() => setDragId(category.id)}
                onDragOver={() => {
                  if (dragId === null || dragId === category.id) return
                  const from = order.indexOf(dragId)
                  const next = order.filter((id) => id !== dragId)
                  next.splice(index, 0, dragId)
                  if (from !== index) setOrder(next)
                }}
                onDragEnd={() => {
                  commit(order)
                  setDragId(null)
                }}
              />
            ))}
          </ul>
        )}
      </div>
      <NewCategoryForm categories={categories} />
    </Modal>
  )
}
