import { useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Plus, RotateCcw, Trash2 } from 'lucide-react'
import type { NavGroup, NavigationSettings, Settings } from '@shared/types'
import { ALWAYS_VISIBLE, DEFAULT_NAVIGATION, moveItem, resolveNavigation } from '@shared/layout'
import { Button, IconButton } from '@renderer/components/Button'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { useSettings } from '@renderer/stores/settingsStore'
import { navEntries, type NavEntry } from '@renderer/lib/views'

const NEW_GROUP_LABEL = 'Neue Gruppe'
const DRAG_TYPE = 'application/x-aii-nav'

function EntryIcon({ entry }: { readonly entry: NavEntry }): React.JSX.Element {
  const Icon = entry.icon
  if (!Icon) return <ProjectMark color={entry.color ?? 'var(--color-ink-3)'} icon={entry.deviceIcon} size="sm" />
  return <Icon className="size-4 text-ink-3" style={entry.color ? { color: entry.color } : undefined} aria-hidden strokeWidth={1.75} />
}

/** Name einer Gruppe; gespeichert wird beim Verlassen des Felds oder mit Enter. */
function GroupLabel({ value, onCommit }: { readonly value: string; onCommit(label: string): void }): React.JSX.Element {
  const [draft, setDraft] = useState(value)
  const [source, setSource] = useState(value)
  if (value !== source) {
    setSource(value)
    setDraft(value)
  }
  const commit = (): void => {
    const label = draft.trim() || value
    setDraft(label)
    if (label !== value) onCommit(label)
  }
  return (
    <input
      aria-label="Name der Gruppe"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-xs font-[620] text-ink outline-none hover:bg-raised focus:bg-raised focus:ring-1 focus:ring-accent"
    />
  )
}

/** Einträge in eine andere Gruppe an Position `index` setzen. */
function placeItem(groups: readonly NavGroup[], item: string, groupId: string, index: number | null): NavGroup[] {
  const without = groups.map((g) => ({ ...g, items: g.items.filter((i) => i !== item) }))
  return without.map((g) => {
    if (g.id !== groupId) return g
    const items = [...g.items]
    items.splice(index ?? items.length, 0, item)
    return { ...g, items }
  })
}

/** Seitenleiste anpassen: Gruppen benennen und ordnen, Einträge verschieben und ausblenden. */
export function NavigationSection({ settings }: { readonly settings: Settings }): React.JSX.Element {
  const update = useSettings((s) => s.update)
  const nav = settings.navigation
  const entries = navEntries(settings.devices, settings.links)
  const byId = new Map(entries.map((e) => [e.id, e]))
  const groups = resolveNavigation(nav, entries.map((e) => e.id))
  const [dragging, setDragging] = useState<string | null>(null)

  const save = (patch: Partial<NavigationSettings>): void => void update({ navigation: { ...nav, groups, ...patch } })
  const setGroups = (next: readonly NavGroup[]): void => save({ groups: next })
  const toggleHidden = (id: string): void => save({ hidden: nav.hidden.includes(id) ? nav.hidden.filter((h) => h !== id) : [...nav.hidden, id] })
  const rename = (id: string, label: string): void => setGroups(groups.map((g) => (g.id === id ? { ...g, label } : g)))
  const moveGroup = (group: NavGroup, delta: number): void => setGroups(moveItem(groups, group, delta))
  const moveEntry = (group: NavGroup, item: string, delta: number): void => setGroups(groups.map((g) => (g.id === group.id ? { ...g, items: moveItem(g.items, item, delta) } : g)))
  const addGroup = (): void => setGroups([...groups, { id: `gruppe-${Date.now().toString(36)}`, label: NEW_GROUP_LABEL, items: [] }])
  const removeGroup = (id: string): void => setGroups(groups.filter((g) => g.id !== id))

  const drop = (groupId: string, index: number | null) => (e: React.DragEvent): void => {
    const item = e.dataTransfer.getData(DRAG_TYPE)
    if (!item) return
    e.preventDefault()
    e.stopPropagation()
    setDragging(null)
    setGroups(placeItem(groups, item, groupId, index))
  }
  const allowDrop = (e: React.DragEvent): void => {
    if (e.dataTransfer.types.includes(DRAG_TYPE)) e.preventDefault()
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-ink-3">
        Einträge per Ziehen oder mit den Pfeilen verschieben, über das Auge aus- und einblenden. Gruppen lassen sich in der Seitenleiste auch per Klick auf die Überschrift einklappen.
      </p>
      {groups.map((group, gi) => (
        <section
          key={group.id}
          aria-label={`Gruppe ${group.label}`}
          onDragOver={allowDrop}
          onDrop={drop(group.id, null)}
          className={`rounded-lg border bg-canvas/60 transition-colors ${dragging ? 'border-dashed border-line-strong' : 'border-line'}`}
        >
          <header className="flex items-center gap-1 border-b border-line px-3 py-2">
            <GroupLabel value={group.label} onCommit={(label) => rename(group.id, label)} />
            <IconButton size="sm" icon={ArrowUp} label={`Gruppe ${group.label} nach oben`} disabled={gi === 0} onClick={() => moveGroup(group, -1)} />
            <IconButton size="sm" icon={ArrowDown} label={`Gruppe ${group.label} nach unten`} disabled={gi === groups.length - 1} onClick={() => moveGroup(group, 1)} />
            <IconButton
              size="sm"
              icon={Trash2}
              tone="danger"
              label={group.items.length ? 'Nur leere Gruppen lassen sich löschen' : `Gruppe ${group.label} löschen`}
              disabled={group.items.length > 0}
              onClick={() => removeGroup(group.id)}
            />
          </header>
          <ul className="px-1.5 py-1.5">
            {group.items.length === 0 ? <li className="px-2 py-2 text-xs text-ink-3">Leer. Einträge hierher ziehen.</li> : null}
            {group.items.map((item, ii) => {
              const entry = byId.get(item)
              if (!entry) return null
              const hidden = nav.hidden.includes(item) && !ALWAYS_VISIBLE.includes(item)
              return (
                <li
                  key={item}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_TYPE, item)
                    e.dataTransfer.effectAllowed = 'move'
                    setDragging(item)
                  }}
                  onDragEnd={() => setDragging(null)}
                  onDragOver={allowDrop}
                  onDrop={drop(group.id, ii)}
                  className={`flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-raised ${dragging === item ? 'opacity-40' : ''}`}
                >
                  <GripVertical className="size-3.5 shrink-0 cursor-grab text-ink-3" aria-hidden />
                  <EntryIcon entry={entry} />
                  <span className={`min-w-0 flex-1 truncate text-[0.8125rem] ${hidden ? 'text-ink-3 line-through decoration-ink-3/50' : 'text-ink-2'}`}>{entry.label}</span>
                  <select
                    aria-label={`${entry.label} in Gruppe verschieben`}
                    value={group.id}
                    onChange={(e) => setGroups(placeItem(groups, item, e.target.value, null))}
                    className="field h-7 w-auto max-w-[9rem] py-0 text-2xs"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                  <IconButton size="sm" icon={ArrowUp} label={`${entry.label} nach oben`} disabled={ii === 0} onClick={() => moveEntry(group, item, -1)} />
                  <IconButton size="sm" icon={ArrowDown} label={`${entry.label} nach unten`} disabled={ii === group.items.length - 1} onClick={() => moveEntry(group, item, 1)} />
                  <IconButton
                    size="sm"
                    icon={hidden ? EyeOff : Eye}
                    label={ALWAYS_VISIBLE.includes(item) ? 'Einstellungen bleiben immer sichtbar' : hidden ? `${entry.label} einblenden` : `${entry.label} ausblenden`}
                    disabled={ALWAYS_VISIBLE.includes(item)}
                    onClick={() => toggleHidden(item)}
                  />
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      <div className="flex gap-2">
        <Button size="sm" icon={Plus} onClick={addGroup}>
          Gruppe hinzufügen
        </Button>
        <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => void update({ navigation: DEFAULT_NAVIGATION })}>
          Standard wiederherstellen
        </Button>
      </div>
    </div>
  )
}
