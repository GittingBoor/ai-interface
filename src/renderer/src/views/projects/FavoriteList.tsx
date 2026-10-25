import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { GripVertical, Play, RotateCcw, SquareTerminal } from 'lucide-react'
import type { Category, Favorite } from '@shared/types'
import { Button, IconButton } from '@renderer/components/Button'
import { HostBadge } from '@renderer/components/Host'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { StarToggle } from './ProjectFields'
import { useTerminals } from '@renderer/stores/terminalStore'
import type { FavoriteStats } from '@renderer/lib/projects'
import { formatRelative, formatTokens } from '@renderer/lib/format'

interface FavoriteRowProps {
  readonly fav: Favorite
  readonly stats: FavoriteStats
  readonly openTodos: number
  readonly selected: boolean
  readonly dragging: boolean
  readonly now: number
  /** Art-Kennzeichen in der Zeile (nur in der ungruppierten Liste). */
  readonly category: Category | null | undefined
  onSelect(): void
  onDragStart(): void
  onDragOver(): void
  onDragEnd(): void
  onMove(dir: -1 | 1): void
}

function FavoriteRow(props: FavoriteRowProps): React.JSX.Element {
  const { fav, stats, openTodos, selected, dragging, now, category } = props
  const update = useFavorites((s) => s.update)
  const launch = useTerminals((s) => s.launch)
  const opening = useTerminals((s) => s.opening)
  return (
    <motion.li layout="position" transition={{ type: 'spring', stiffness: 500, damping: 40 }}>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', String(fav.id))
          props.onDragStart()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          props.onDragOver()
        }}
        onDragEnd={props.onDragEnd}
        onDrop={(e) => e.preventDefault()}
        onClick={props.onSelect}
        className={`group relative flex cursor-default flex-wrap items-center gap-3 rounded-lg py-3 pr-3 pl-1.5 transition-colors duration-150 ${selected ? 'bg-raised' : 'hover:bg-raised/50'} ${dragging ? 'opacity-40' : ''}`}
      >
      <span className="cursor-grab text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing" aria-hidden>
        <GripVertical className="size-4" />
      </span>
      <ProjectMark color={fav.color} icon={fav.icon} size="md" />
      <div className="min-w-0 flex-1 basis-48">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              props.onSelect()
            }}
            onKeyDown={(e) => {
              if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                e.preventDefault()
                props.onMove(e.key === 'ArrowUp' ? -1 : 1)
              }
            }}
            aria-pressed={selected}
            aria-description="Alt+Pfeiltasten verschieben"
            className="truncate text-left text-[0.875rem] font-[600] text-ink hover:underline hover:decoration-line-strong hover:underline-offset-4"
          >
            {fav.name}
          </button>
          <HostBadge host={fav.host} />
          {category ? (
            <span className="inline-flex h-5 shrink-0 items-center gap-1 text-2xs font-[540] text-ink-3">
              <ProjectMark color={category.color} icon={category.icon} size="sm" />
              {category.name}
            </span>
          ) : null}
        </div>
        <p className="mt-1 flex min-w-0 items-center gap-2 text-xs text-ink-3">
          <span className="truncate font-mono text-2xs">{fav.path}</span>
        </p>
        <p className="num mt-1 flex flex-wrap gap-x-3 text-xs text-ink-3">
          <span>{stats.lastActive ? formatRelative(stats.lastActive, now) : 'keine Aktivität'}</span>
          <span>
            <span className="text-ink-2">{formatTokens(stats.tokens7d)}</span> Token · 7 T
          </span>
          {openTodos > 0 ? (
            <span>
              <span className="text-ink-2">{openTodos}</span> {openTodos === 1 ? 'offenes TODO' : 'offene TODOs'}
            </span>
          ) : null}
        </p>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <StarToggle
          starred={fav.starred}
          name={fav.name}
          onToggle={() => void update(fav.id, { starred: !fav.starred })}
          className={fav.starred ? '' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}
        />
        <IconButton size="sm" icon={SquareTerminal} label={`Shell in ${fav.name}`} disabled={opening} onClick={() => void launch(fav, 'shell')} />
        <Button size="sm" variant="ghost" icon={RotateCcw} disabled={opening} onClick={() => void launch(fav, 'continue')} title="Letzte Claude-Sitzung fortsetzen">
          Fortsetzen
        </Button>
        <Button size="sm" variant="soft" icon={Play} disabled={opening} onClick={() => void launch(fav, 'new')}>
          Claude starten
        </Button>
      </div>
      </div>
    </motion.li>
  )
}

interface FavoriteListProps {
  readonly favorites: readonly Favorite[]
  readonly statsById: ReadonlyMap<number, FavoriteStats>
  readonly todosById: ReadonlyMap<number, number>
  readonly selectedId: number | null
  readonly now: number
  /** Wenn gesetzt, zeigt jede Zeile ihre Art. */
  readonly categoriesById?: ReadonlyMap<number, Category>
  readonly label: string
  onSelect(id: number): void
  /** Neue Reihenfolge genau dieser Projekte. */
  onReorder(ids: readonly number[]): void
}

export function FavoriteList({ favorites, statsById, todosById, selectedId, now, categoriesById, label, onSelect, onReorder }: FavoriteListProps): React.JSX.Element {
  const [order, setOrder] = useState<number[]>(() => favorites.map((f) => f.id))
  const [dragId, setDragId] = useState<number | null>(null)

  useEffect(() => {
    if (dragId === null) setOrder(favorites.map((f) => f.id))
  }, [favorites, dragId])

  const moveTo = (id: number, target: number): number[] => {
    const next = order.filter((x) => x !== id)
    next.splice(target, 0, id)
    return next
  }

  const commit = (ids: number[]): void => {
    if (ids.join() !== favorites.map((f) => f.id).join()) onReorder(ids)
  }

  const byId = new Map(favorites.map((f) => [f.id, f]))
  const empty: FavoriteStats = { tokens7d: 0, cost7d: 0, lastActive: null, sessions: 0 }

  return (
    <ul className="space-y-0.5" aria-label={`${label}, per Ziehen oder Alt+Pfeiltasten sortierbar`}>
      {order.map((id, index) => {
        const fav = byId.get(id)
        if (!fav) return null
        return (
          <FavoriteRow
            key={id}
            fav={fav}
            stats={statsById.get(id) ?? empty}
            openTodos={todosById.get(id) ?? 0}
            selected={selectedId === id}
            dragging={dragId === id}
            now={now}
            category={categoriesById && fav.categoryId !== null ? categoriesById.get(fav.categoryId) : undefined}
            onSelect={() => onSelect(id)}
            onDragStart={() => setDragId(id)}
            onDragOver={() => {
              if (dragId !== null && dragId !== id) setOrder(moveTo(dragId, index))
            }}
            onDragEnd={() => {
              commit(order)
              setDragId(null)
            }}
            onMove={(dir) => {
              const target = Math.max(0, Math.min(order.length - 1, index + dir))
              const next = moveTo(id, target)
              setOrder(next)
              commit(next)
            }}
          />
        )
      })}
    </ul>
  )
}
