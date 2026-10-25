import { useEffect, useMemo, useState } from 'react'
import { MicButton } from '@renderer/components/speech/MicButton'
import { AnimatePresence, motion } from 'motion/react'
import { Columns2, FolderGit2, Grid2x2, Play, Plus, RotateCcw, Rows2, Square, SquareTerminal, Star, TerminalSquare, X, type LucideIcon } from 'lucide-react'
import type { Favorite, TerminalInfo, TerminalLayoutMode } from '@shared/types'
import { Button, IconButton } from '@renderer/components/Button'
import { HostBadge } from '@renderer/components/Host'
import { OrchestratorMark, TerminalMark } from './TerminalMark'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { EmptyState } from '@renderer/components/States'
import { StatusDot, useTerminalStatus } from '@renderer/components/StatusDot'
import { useTerminals } from '@renderer/stores/terminalStore'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useNav } from '@renderer/stores/navStore'
import { hostLabel } from '@renderer/lib/hosts'
import { useCategories } from '@renderer/stores/categoriesStore'
import { useSettings } from '@renderer/stores/settingsStore'
import { groupProjects, pinnedFirst } from '@renderer/lib/projectOrganize'
import { NoCategoryMark } from '../projects/ProjectsView'
import { NewTerminalDialog, ORCHESTRATOR_HINT, ORCHESTRATOR_NAME } from './NewTerminalDialog'
import { TerminalGrid } from './TerminalGrid'

interface LayoutOption {
  readonly value: TerminalLayoutMode
  readonly label: string
  readonly icon: LucideIcon
}

const LAYOUT_OPTIONS: readonly LayoutOption[] = [
  { value: 'tabs', label: 'Tabs', icon: Square },
  { value: 'columns', label: 'Nebeneinander', icon: Columns2 },
  { value: 'rows', label: 'Untereinander', icon: Rows2 },
  { value: 'grid', label: 'Raster', icon: Grid2x2 }
]

/** Einfügemarke beim Umsortieren: vor diesem Tab bzw. `null` = ans Ende. */
interface DropMark {
  readonly before: string | null
}

interface TabDrag {
  readonly dragId: string | null
  readonly mark: DropMark | null
  start(id: string): void
  over(id: string, after: boolean): void
  drop(): void
  end(): void
}

interface TerminalTabProps {
  readonly info: TerminalInfo
  readonly active: boolean
  readonly shown: boolean
  readonly attached: boolean
  readonly exitCode: number | undefined
  readonly drag: TabDrag
}

function TerminalTab({ info, active, shown, attached, exitCode, drag }: TerminalTabProps): React.JSX.Element {
  const activate = useTerminals((s) => s.activate)
  const close = useTerminals((s) => s.close)
  const status = useTerminalStatus(info.id, info.running)
  const shape = attached
    ? `h-9 rounded-t-lg border border-b-0 ${active ? 'border-line bg-canvas' : 'border-transparent hover:bg-raised/60'}`
    : `mb-1.5 h-8 rounded-lg border ${active ? 'border-line-strong/60 bg-raised' : shown ? 'border-line' : 'border-transparent hover:bg-raised/60'}`
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: drag.dragId === info.id ? 0.45 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      data-tab
      className={`group relative flex max-w-[15rem] min-w-[9rem] shrink-0 items-center transition-colors duration-150 ${shape}`}
    >
      {drag.mark?.before === info.id ? <span aria-hidden className="absolute top-1.5 bottom-1.5 -left-[3px] w-0.5 rounded-full bg-accent" /> : null}
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', info.title)
          drag.start(info.id)
        }}
        onDragOver={(e) => {
          if (!drag.dragId) return
          e.preventDefault()
          const rect = e.currentTarget.getBoundingClientRect()
          drag.over(info.id, e.clientX > rect.left + rect.width / 2)
        }}
        onDragEnd={drag.end}
        className="flex h-full min-w-0 flex-1"
      >
        <button
          type="button"
          role="tab"
          id={`term-tab-${info.id}`}
          aria-selected={active}
          aria-controls={shown ? `term-panel-${info.id}` : undefined}
          onClick={() => activate(info.id)}
          onAuxClick={(e) => {
            if (e.button === 1) void close(info.id)
          }}
          title={`${info.title}\n${hostLabel(info.host)}: ${info.path}`}
          className="flex h-full min-w-0 flex-1 items-center gap-2 pr-1 pl-3 text-left text-xs"
        >
          <TerminalMark info={info} />
          <span className={`truncate ${active ? 'font-[580] text-ink' : shown ? 'text-ink' : 'text-ink-2'}`}>{info.title}</span>
          <StatusDot status={status} />
          {info.running ? null : <span className="shrink-0 text-2xs text-ink-3">{exitCode === undefined ? 'beendet' : `Code ${exitCode}`}</span>}
        </button>
      </div>
      <IconButton size="sm" icon={X} label={`${info.title} schließen`} onClick={() => void close(info.id)} className="mr-1 size-6 opacity-60 group-hover:opacity-100" />
    </motion.div>
  )
}

function LayoutSwitch(): React.JSX.Element {
  const mode = useTerminals((s) => s.layout.mode)
  const setMode = useTerminals((s) => s.setMode)
  const move = (dir: 1 | -1): void => {
    const index = LAYOUT_OPTIONS.findIndex((o) => o.value === mode)
    const next = LAYOUT_OPTIONS[(index + dir + LAYOUT_OPTIONS.length) % LAYOUT_OPTIONS.length]
    if (next) setMode(next.value)
  }
  return (
    <div
      role="radiogroup"
      aria-label="Anordnung"
      className="inline-flex h-8 items-center gap-0.5 rounded-md border border-line bg-canvas p-0.5"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') move(1)
        if (e.key === 'ArrowLeft') move(-1)
      }}
    >
      {LAYOUT_OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = value === mode
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            tabIndex={active ? 0 : -1}
            onClick={() => setMode(value)}
            className={`relative grid h-full w-7 place-items-center rounded-[5px] transition-colors duration-150 ${active ? 'text-ink' : 'text-ink-3 hover:text-ink-2'}`}
          >
            {active ? <motion.span layoutId="terminal-layout" className="absolute inset-0 rounded-[5px] bg-raised-2" transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }} /> : null}
            <Icon className="relative size-3.5" aria-hidden strokeWidth={1.75} />
          </button>
        )
      })}
    </div>
  )
}

interface LaunchButtonsProps {
  readonly startLabel: string
  readonly disabled: boolean
  readonly onLaunch: (mode: 'new' | 'continue') => void
}

function LaunchButtons({ startLabel, disabled, onLaunch }: LaunchButtonsProps): React.JSX.Element {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button size="sm" variant="ghost" icon={RotateCcw} disabled={disabled} onClick={() => onLaunch('continue')}>
        Fortsetzen
      </Button>
      <Button size="sm" variant="primary" icon={Play} disabled={disabled} onClick={() => onLaunch('new')}>
        {startLabel}
      </Button>
    </div>
  )
}

function OrchestratorCard(): React.JSX.Element {
  const openOrchestrator = useTerminals((s) => s.openOrchestrator)
  const opening = useTerminals((s) => s.opening)
  return (
    <section aria-label={ORCHESTRATOR_NAME} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-accent/25 bg-raised px-4 py-3.5">
      <OrchestratorMark size="lg" />
      <div className="min-w-0 flex-1 basis-48">
        <h3 className="truncate text-[0.875rem] font-[620] text-ink">{ORCHESTRATOR_NAME}</h3>
        <p className="mt-0.5 truncate text-xs text-ink-3">{ORCHESTRATOR_HINT}</p>
      </div>
      <LaunchButtons startLabel="Orchestrator starten" disabled={opening} onLaunch={(mode) => void openOrchestrator(mode)} />
    </section>
  )
}

function ProjectCard({ project }: { readonly project: Favorite }): React.JSX.Element {
  const launch = useTerminals((s) => s.launch)
  const opening = useTerminals((s) => s.opening)
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-raised/50 p-3 transition-colors duration-150 hover:border-line-strong/70">
      <div className="flex min-w-0 items-start gap-2.5">
        <ProjectMark color={project.color} icon={project.icon} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="flex min-w-0 items-center gap-1.5 text-[0.8125rem] font-[560] text-ink">
              <span className="truncate">{project.name}</span>
              {project.starred ? <Star className="size-3 shrink-0 fill-accent text-accent" aria-label="angepinnt" /> : null}
            </p>
            <span className="ml-auto shrink-0">
              <HostBadge host={project.host} />
            </span>
          </div>
          <p className="mt-0.5 truncate font-mono text-2xs text-ink-3" title={project.path}>
            {project.path}
          </p>
        </div>
      </div>
      <div className="flex justify-end">
        <LaunchButtons startLabel="Claude starten" disabled={opening} onLaunch={(mode) => void launch(project, mode)} />
      </div>
    </li>
  )
}

interface ProjectSectionProps {
  readonly mark: React.ReactNode
  readonly title: string
  readonly projects: readonly Favorite[]
}

function ProjectSection({ mark, title, projects }: ProjectSectionProps): React.JSX.Element {
  return (
    <section aria-label={title}>
      <h3 className="flex items-center gap-2 pb-2.5 pl-0.5">
        {mark}
        <span className="text-[0.8125rem] font-[620] text-ink">{title}</span>
        <span className="num text-xs text-ink-3">{projects.length}</span>
      </h3>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-3">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </ul>
    </section>
  )
}

function PinnedMark(): React.JSX.Element {
  return (
    <span aria-hidden className="grid size-5 shrink-0 place-items-center">
      <Star className="size-3.5 fill-accent text-accent" />
    </span>
  )
}

function ProjectGroups({ favorites }: { readonly favorites: readonly Favorite[] }): React.JSX.Element {
  const categories = useCategories((s) => s.categories)
  const pinned = useMemo(() => pinnedFirst(favorites.filter((f) => f.starred)), [favorites])
  const groups = useMemo(() => groupProjects(favorites.filter((f) => !f.starred), categories), [favorites, categories])
  return (
    <>
      {pinned.length ? <ProjectSection mark={<PinnedMark />} title="Angepinnt" projects={pinned} /> : null}
      {groups.map(({ category, projects }) => (
        <ProjectSection
          key={category?.id ?? 'none'}
          mark={category ? <ProjectMark color={category.color} icon={category.icon} size="md" /> : <NoCategoryMark size="md" />}
          title={category?.name ?? 'Ohne Art'}
          projects={projects}
        />
      ))}
    </>
  )
}

function FavoriteLauncher(): React.JSX.Element {
  const favorites = useFavorites((s) => s.favorites)
  const openDialog = useTerminals((s) => s.openDialog)
  const orchestratorEnabled = useSettings((s) => s.settings?.orchestrator.enabled !== false)
  const go = useNav((s) => s.go)
  const newButton = (
    <Button icon={Plus} onClick={openDialog}>
      Neues Terminal …
    </Button>
  )
  const orchestrator = orchestratorEnabled ? <OrchestratorCard /> : null
  if (!favorites.length) {
    return (
      <div className="flex min-h-full flex-col gap-6">
        {orchestrator}
        <div className="grid flex-1 place-items-center">
          <EmptyState
            icon={TerminalSquare}
            title="Noch keine Projekte"
            action={
              <div className="flex gap-2">
                <Button icon={FolderGit2} onClick={() => go('projects')}>
                  Projekt anlegen
                </Button>
                {newButton}
              </div>
            }
          >
            Lege unter Projekte einen Ordner als Projekt an oder öffne ein Terminal in einem beliebigen Ordner, lokal oder auf einem Gerät.
          </EmptyState>
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-48 flex-1">
          <h2 className="text-[0.9375rem] font-[620] text-ink">Kein Terminal offen</h2>
          <p className="mt-1 text-[0.8125rem] text-ink-3">Starte Claude Code in einem Projekt. Terminals laufen weiter, wenn du den Bereich wechselst.</p>
        </div>
        {newButton}
      </div>
      {orchestrator}
      <ProjectGroups favorites={favorites} />
    </div>
  )
}

/** Tab-Drag: Umsortieren in der Leiste und Ablegen auf Slots teilen sich den Zustand. */
function useTabDrag(): TabDrag {
  const order = useTerminals((s) => s.order)
  const reorder = useTerminals((s) => s.reorder)
  const [dragId, setDragId] = useState<string | null>(null)
  const [mark, setMark] = useState<DropMark | null>(null)

  const isNoop = (id: string, before: string | null): boolean => {
    const index = order.indexOf(id)
    return before === id || before === (order[index + 1] ?? null)
  }

  return {
    dragId,
    mark,
    start: (id) => setDragId(id),
    over: (id, after) => {
      if (!dragId) return
      const before = after ? (order[order.indexOf(id) + 1] ?? null) : id
      const next = isNoop(dragId, before) ? null : { before }
      if (next?.before !== mark?.before || (next === null) !== (mark === null)) setMark(next)
    },
    drop: () => {
      if (dragId && mark) reorder(dragId, mark.before)
      setDragId(null)
      setMark(null)
    },
    end: () => {
      setDragId(null)
      setMark(null)
    }
  }
}

/** Strg+T öffnet „Neues Terminal“, solange der Bereich sichtbar ist – auch aus dem Terminal heraus. */
function useNewTerminalShortcut(visible: boolean): void {
  const openDialog = useTerminals((s) => s.openDialog)
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent): void => {
      if (!e.ctrlKey || e.shiftKey || e.altKey || e.metaKey || e.key.toLowerCase() !== 't') return
      e.preventDefault()
      e.stopPropagation()
      openDialog()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [visible, openDialog])
}

export function TerminalView({ visible }: { readonly visible: boolean }): React.JSX.Element {
  const terminals = useTerminals((s) => s.terminals)
  const order = useTerminals((s) => s.order)
  const slots = useTerminals((s) => s.slots)
  const mode = useTerminals((s) => s.layout.mode)
  const activeId = useTerminals((s) => s.activeId)
  const exitCodes = useTerminals((s) => s.exitCodes)
  const opening = useTerminals((s) => s.opening)
  const openDialog = useTerminals((s) => s.openDialog)
  const drag = useTabDrag()
  useNewTerminalShortcut(visible)

  const byId = new Map(terminals.map((t) => [t.id, t]))
  const tabs = order.map((id) => byId.get(id)).filter((t): t is TerminalInfo => t !== undefined)
  const active = activeId ? byId.get(activeId) : undefined
  const attached = mode === 'tabs'
  const hasTerminals = tabs.length > 0

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-end gap-3 px-6">
        <div
          role="tablist"
          aria-label="Offene Terminals"
          className="flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto"
          onDragOver={(e) => {
            if (!drag.dragId) return
            e.preventDefault()
            if (e.target instanceof Element && e.target.closest('[data-tab]')) return
            const last = tabs[tabs.length - 1]
            if (last) drag.over(last.id, true)
          }}
          onDrop={(e) => {
            e.preventDefault()
            drag.drop()
          }}
        >
          {hasTerminals ? null : (
            <div className="flex h-9 items-center gap-2 pl-2 text-[0.8125rem] font-[600] text-ink">
              <SquareTerminal className="size-4 text-ink-3" aria-hidden /> Terminal
            </div>
          )}
          <AnimatePresence initial={false}>
            {tabs.map((t) => (
              <TerminalTab key={t.id} info={t} active={t.id === activeId} shown={slots.includes(t.id)} attached={attached} exitCode={exitCodes[t.id]} drag={drag} />
            ))}
          </AnimatePresence>
          {drag.mark && drag.mark.before === null ? <span aria-hidden className="mb-2.5 h-5 w-0.5 shrink-0 rounded-full bg-accent" /> : null}
          {opening ? <div className="skeleton mb-1.5 ml-1 h-6 w-28 rounded-md" aria-label="Terminal wird geöffnet" /> : null}
          <div className="min-w-4 flex-1 self-stretch" aria-hidden />
        </div>
        <div className="mb-1.5 flex shrink-0 items-center gap-2">
          {active && attached ? (
            <p className="mr-1 hidden max-w-[22rem] truncate font-mono text-2xs text-ink-3 xl:block" title={active.path}>
              {active.path}
            </p>
          ) : null}
          {active ? <MicButton target={{ kind: 'terminal', id: active.id }} disabled={!active.running} menuBelow /> : null}
          <IconButton icon={Plus} label="Neues Terminal (Strg+T)" onClick={openDialog} />
          {hasTerminals ? <LayoutSwitch /> : null}
        </div>
      </div>
      <div
        className={`relative mx-6 mb-6 min-h-0 flex-1 overflow-hidden ${
          !hasTerminals ? 'rounded-lg border border-line' : attached ? 'rounded-b-lg rounded-tr-lg border border-line bg-canvas' : ''
        }`}
      >
        {hasTerminals ? (
          <TerminalGrid visible={visible} dragId={drag.dragId} onDropped={drag.end} />
        ) : (
          <div className="h-full overflow-y-auto p-6 max-lg:p-5">
            <FavoriteLauncher />
          </div>
        )}
      </div>
      <NewTerminalDialog />
    </div>
  )
}
