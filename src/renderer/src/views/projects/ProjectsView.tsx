import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FolderGit2, MousePointerClick, Plus, SearchX, Star, Tags } from 'lucide-react'
import type { Category, Favorite } from '@shared/types'
import { Button } from '@renderer/components/Button'
import { Segmented } from '@renderer/components/Controls'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { HostBadge } from '@renderer/components/Host'
import { Section, ViewHeader } from '@renderer/components/Section'
import { EmptyState, ErrorState, SkeletonRows } from '@renderer/components/States'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useCategories } from '@renderer/stores/categoriesStore'
import { useUsage } from '@renderer/stores/usageStore'
import { useTodos } from '@renderer/stores/todoStore'
import { useNav } from '@renderer/stores/navStore'
import { notify } from '@renderer/stores/toastStore'
import { useNow } from '@renderer/lib/hooks'
import { FAVORITE_COLORS } from '@renderer/lib/hosts'
import { openTodosFor, statsFor, unassignedProjects, type FavoriteStats } from '@renderer/lib/projects'
import { baseName, formatRelative, formatTokens } from '@renderer/lib/format'
import { groupProjects, matchesFilter, mergeSubsetOrder, pinnedFirst, type ProjectFilter } from '@renderer/lib/projectOrganize'
import { AddFavoriteForm } from './AddFavoriteForm'
import { FavoriteList } from './FavoriteList'
import { ProjectDetail } from './ProjectDetail'
import { CategoryManager } from './CategoryManager'
import { useProjectsView, type ProjectsLayout } from './projectsViewStore'

const NOW_TICK_MS = 30_000
const OTHER_LIMIT = 8
const FALLBACK_COLOR = '#e08a4f'
const EMPTY_STATS: FavoriteStats = { tokens7d: 0, cost7d: 0, lastActive: null, sessions: 0 }

const LAYOUT_OPTIONS: readonly { readonly value: ProjectsLayout; readonly label: string }[] = [
  { value: 'grouped', label: 'Gruppiert' },
  { value: 'list', label: 'Liste' }
]

const filterKey = (filter: ProjectFilter): string => String(filter)

interface ChipProps {
  readonly active: boolean
  readonly count: number
  onSelect(): void
  readonly children: React.ReactNode
}

function Chip({ active, count, onSelect, children }: ChipProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border pr-2.5 pl-2 text-xs font-[540] transition-colors duration-150 ${active ? 'border-line-strong bg-raised-2 text-ink' : 'border-line text-ink-3 hover:border-line-strong hover:text-ink-2'}`}
    >
      {children}
      <span className={`num text-2xs ${active ? 'text-ink-2' : 'text-ink-3/80'}`}>{count}</span>
    </button>
  )
}

interface FilterChipsProps {
  readonly filter: ProjectFilter
  readonly favorites: readonly Favorite[]
  readonly categories: readonly Category[]
  onFilter(filter: ProjectFilter): void
}

function FilterChips({ filter, favorites, categories, onFilter }: FilterChipsProps): React.JSX.Element {
  const count = (f: ProjectFilter): number => favorites.filter((p) => matchesFilter(p, f)).length
  return (
    <div role="radiogroup" aria-label="Projekte filtern" className="flex min-w-0 flex-wrap gap-1.5">
      <Chip active={filter === 'all'} count={favorites.length} onSelect={() => onFilter('all')}>
        <span className="pl-0.5">Alle</span>
      </Chip>
      <Chip active={filter === 'starred'} count={count('starred')} onSelect={() => onFilter('starred')}>
        <Star className={`size-3.5 ${filter === 'starred' ? 'fill-accent text-accent' : ''}`} strokeWidth={1.75} aria-hidden />
        Angepinnt
      </Chip>
      {categories.map((c) => (
        <Chip key={c.id} active={filter === c.id} count={count(c.id)} onSelect={() => onFilter(c.id)}>
          <ProjectMark color={c.color} icon={c.icon} size="sm" />
          {c.name}
        </Chip>
      ))}
      <Chip active={filter === 'uncategorized'} count={count('uncategorized')} onSelect={() => onFilter('uncategorized')}>
        <NoCategoryMark size="sm" />
        Ohne Art
      </Chip>
    </div>
  )
}

/** Gestricheltes Quadrat für „Ohne Art“. */
export function NoCategoryMark({ size }: { readonly size: 'sm' | 'md' }): React.JSX.Element {
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center ${size === 'sm' ? 'size-4' : 'size-5'}`}>
      <span className={`rounded-[3px] border border-dashed border-ink-3 ${size === 'sm' ? 'size-2.5' : 'size-3'}`} />
    </span>
  )
}

function GroupHeader({ category, count }: { readonly category: Category | null; readonly count: number }): React.JSX.Element {
  return (
    <h2 className="flex items-center gap-2 border-t border-line pt-3.5 pb-1.5 pl-1.5">
      {category ? <ProjectMark color={category.color} icon={category.icon} size="md" /> : <NoCategoryMark size="md" />}
      <span className="text-[0.8125rem] font-[620] text-ink">{category?.name ?? 'Ohne Art'}</span>
      <span className="num text-xs text-ink-3">{count}</span>
    </h2>
  )
}

export function ProjectsView(): React.JSX.Element {
  const favorites = useFavorites((s) => s.favorites)
  const loaded = useFavorites((s) => s.loaded)
  const error = useFavorites((s) => s.error)
  const load = useFavorites((s) => s.load)
  const add = useFavorites((s) => s.add)
  const reorder = useFavorites((s) => s.reorder)
  const categories = useCategories((s) => s.categories)
  const projects7d = useUsage((s) => s.projects7d)
  const projects30d = useUsage((s) => s.overview?.projects ?? [])
  const todoItems = useTodos((s) => s.state?.items ?? [])
  const selectedId = useNav((s) => s.selectedFavoriteId)
  const layout = useProjectsView((s) => s.layout)
  const filter = useProjectsView((s) => s.filter)
  const setLayout = useProjectsView((s) => s.setLayout)
  const setFilter = useProjectsView((s) => s.setFilter)
  const [adding, setAdding] = useState(false)
  const [managing, setManaging] = useState(false)
  const now = useNow(NOW_TICK_MS)

  const selectFavorite = (id: number | null): void => useNav.setState({ selectedFavoriteId: id })
  const selected = favorites.find((f) => f.id === selectedId) ?? favorites[0] ?? null

  // Gelöschte Art als Filter → zurück auf „Alle“.
  const activeFilter: ProjectFilter = typeof filter === 'number' && !categories.some((c) => c.id === filter) ? 'all' : filter
  const filterCategoryId = typeof activeFilter === 'number' ? activeFilter : null
  const visible = useMemo(() => pinnedFirst(favorites.filter((f) => matchesFilter(f, activeFilter))), [favorites, activeFilter])
  const groups = useMemo(() => groupProjects(visible, categories), [visible, categories])
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const pinnedCount = favorites.filter((f) => f.starred).length

  const statsById = useMemo(() => new Map<number, FavoriteStats>(favorites.map((f) => [f.id, statsFor(f, projects7d)])), [favorites, projects7d])
  const todosById = useMemo(() => new Map<number, number>(favorites.map((f) => [f.id, openTodosFor(f, todoItems)])), [favorites, todoItems])
  const others = useMemo(() => unassignedProjects(favorites, projects30d).slice(0, OTHER_LIMIT), [favorites, projects30d])

  const reorderSubset = (ids: readonly number[]): void => void reorder(mergeSubsetOrder(favorites.map((f) => f.id), ids))

  const promote = async (host: (typeof others)[number]['host'], path: string): Promise<void> => {
    const color = FAVORITE_COLORS[favorites.length % FAVORITE_COLORS.length] ?? FALLBACK_COLOR
    const fav = await add({ host, path, name: baseName(path), color, categoryId: filterCategoryId, starred: false })
    if (fav) {
      notify.success(`„${fav.name}“ ist jetzt ein Projekt.`)
      selectFavorite(fav.id)
    }
  }

  const listProps = { statsById, todosById, selectedId: selected?.id ?? null, now, onSelect: selectFavorite, onReorder: reorderSubset }

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title="Projekte"
        actions={
          <>
            <Button variant="ghost" icon={Tags} onClick={() => setManaging(true)}>
              Arten verwalten
            </Button>
            <Button icon={Plus} onClick={() => setAdding(true)} disabled={adding}>
              Projekt hinzufügen
            </Button>
          </>
        }
      >
        {favorites.length
          ? `${favorites.length} ${favorites.length === 1 ? 'Projekt' : 'Projekte'} · ${pinnedCount} angepinnt · Reihenfolge per Ziehen ändern`
          : 'Projektordner auf deinen Rechnern'}
      </ViewHeader>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto px-8 pb-10 max-lg:px-5">
          <AnimatePresence initial={false}>
            {adding ? (
              <motion.div
                key="add"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="pb-6">
                  <AddFavoriteForm
                    initialCategoryId={filterCategoryId}
                    onDone={(id) => {
                      setAdding(false)
                      if (id !== null) selectFavorite(id)
                    }}
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {favorites.length > 0 ? (
            <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
              <FilterChips filter={activeFilter} favorites={favorites} categories={categories} onFilter={setFilter} />
              <Segmented label="Darstellung" value={layout} options={LAYOUT_OPTIONS} onChange={(next: ProjectsLayout) => setLayout(next)} />
            </div>
          ) : null}

          {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
          {!loaded ? <SkeletonRows rows={5} /> : null}
          {loaded && !error && favorites.length === 0 && !adding ? (
            <EmptyState
              icon={FolderGit2}
              title="Noch keine Projekte"
              action={
                <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>
                  Erstes Projekt anlegen
                </Button>
              }
            >
              Projekte sind Ordner auf diesem PC oder einem angebundenen Gerät. Von hier startest du Claude Code mit einem Klick und siehst Verbrauch und TODOs je Projekt.
            </EmptyState>
          ) : null}
          {favorites.length > 0 && visible.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={activeFilter === 'starred' ? 'Nichts angepinnt' : 'Keine Projekte in dieser Auswahl'}
              compact
              action={
                <Button size="sm" onClick={() => setFilter('all')}>
                  Alle zeigen
                </Button>
              }
            >
              {activeFilter === 'starred'
                ? 'Pinne Projekte mit dem Stern an. Angepinnte stehen oben, auch im Terminal und in der Befehlspalette.'
                : 'Die Art eines Projekts stellst du in seinen Details ein.'}
            </EmptyState>
          ) : null}

          {visible.length > 0 && layout === 'list' ? (
            <FavoriteList key={`list-${filterKey(activeFilter)}`} label="Projekte" favorites={visible} categoriesById={categoriesById} {...listProps} />
          ) : null}
          {visible.length > 0 && layout === 'grouped' ? (
            <div className="space-y-4">
              {groups.map((g) => (
                <section key={g.category?.id ?? 'none'} aria-label={g.category?.name ?? 'Ohne Art'}>
                  <GroupHeader category={g.category} count={g.projects.length} />
                  <FavoriteList label={g.category?.name ?? 'Ohne Art'} favorites={g.projects} {...listProps} />
                </section>
              ))}
            </div>
          ) : null}

          {others.length > 0 ? (
            <Section className="mt-10" title="Weitere Projekte" description="Aus den Verbrauchsdaten der letzten 30 Tage, noch nicht angelegt">
              <ul className="divide-y divide-line">
                {others.map((p) => (
                  <li key={`${p.host}-${p.project}`} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.8125rem] font-[560] text-ink-2">{baseName(p.project)}</p>
                      <p className="truncate font-mono text-2xs text-ink-3">{p.project}</p>
                    </div>
                    <HostBadge host={p.host} subtle />
                    <span className="num w-24 text-right text-xs text-ink-3">{formatRelative(p.lastActive, now)}</span>
                    <span className="num w-20 text-right text-xs text-ink-2">{formatTokens(p.totalTokens)}</span>
                    <Button size="sm" variant="ghost" icon={Plus} onClick={() => void promote(p.host, p.project)}>
                      Als Projekt
                    </Button>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>

        <aside aria-label="Projektdetails" className="w-[23rem] shrink-0 overflow-y-auto border-l border-line/70 px-6 pb-10 max-[1180px]:w-[20rem] max-lg:w-[18rem] max-lg:px-5">
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="pt-1"
              >
                <ProjectDetail
                  fav={selected}
                  stats={statsById.get(selected.id) ?? EMPTY_STATS}
                  openTodos={todosById.get(selected.id) ?? 0}
                  now={now}
                  onRemoved={() => selectFavorite(null)}
                />
              </motion.div>
            ) : (
              <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState icon={MousePointerClick} title="Projekt auswählen" compact>
                  Wähle links ein Projekt, um Sessions, Bilder und Einstellungen zu sehen.
                </EmptyState>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
      <CategoryManager open={managing} onClose={() => setManaging(false)} />
    </div>
  )
}
