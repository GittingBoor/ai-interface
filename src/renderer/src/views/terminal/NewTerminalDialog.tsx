import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FolderOpen, Search, Star } from 'lucide-react'
import type { Favorite, HostId, LaunchMode } from '@shared/types'
import type { Messages } from '@shared/i18n/messages'
import { api } from '@renderer/api/client'
import { attempt } from '@renderer/api/call'
import { Button } from '@renderer/components/Button'
import { Field, Kbd, Segmented } from '@renderer/components/Controls'
import { FolderBrowser } from '@renderer/components/FolderBrowser'
import { HostBadge } from '@renderer/components/Host'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { Modal } from '@renderer/components/Modal'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useSettings } from '@renderer/stores/settingsStore'
import { type LaunchTarget, useTerminals } from '@renderer/stores/terminalStore'
import { baseName } from '@renderer/lib/format'
import { pinnedFirst } from '@renderer/lib/projectOrganize'
import { findDevice, hostOptions } from '@renderer/lib/hosts'
import { useT } from '@renderer/i18n/useT'
import { OrchestratorMark } from './TerminalMark'

type Source = 'project' | 'folder'

interface LabeledOption<V> {
  readonly value: V
  readonly label: string
}

const sourceOptions = (t: Messages['terminal']['dialog']): readonly LabeledOption<Source>[] => [
  { value: 'project', label: t.sourceProject },
  { value: 'folder', label: t.sourceFolder }
]

const modeOptions = (t: Messages['terminal']['dialog']): readonly LabeledOption<LaunchMode>[] => [
  { value: 'new', label: t.modeNew },
  { value: 'continue', label: t.modeContinue },
  { value: 'shell', label: t.modeShell }
]

/** Der Orchestrator startet immer Claude, eine reine Shell ergibt für ihn keinen Sinn. */
const orchestratorModeOptions = (t: Messages['terminal']['dialog']): readonly LabeledOption<LaunchMode>[] => modeOptions(t).filter((o) => o.value !== 'shell')

/** Eigenname und gespeicherter Titel des Orchestrators: wird nicht übersetzt. */
export const ORCHESTRATOR_NAME = 'Orchestrator'

type PickerEntry = { readonly kind: 'orchestrator'; readonly open: boolean } | { readonly kind: 'project'; readonly favorite: Favorite }

function orchestratorMatches(query: string): boolean {
  return ORCHESTRATOR_NAME.toLowerCase().includes(query.trim().toLowerCase())
}

function matches(favorite: Favorite, query: string): boolean {
  const q = query.trim().toLowerCase()
  return q === '' || favorite.name.toLowerCase().includes(q) || favorite.path.toLowerCase().includes(q)
}

function OrchestratorOption({ open, selected }: { readonly open: boolean; readonly selected: boolean }): React.JSX.Element {
  const t = useT().terminal
  return (
    <>
      <OrchestratorMark size="md" />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[0.8125rem] font-[560] ${selected ? 'text-ink' : 'text-ink-2'}`}>{ORCHESTRATOR_NAME}</p>
        <p className="truncate text-2xs text-ink-3">{t.orchestratorHint}</p>
      </div>
      {open ? <span className="shrink-0 rounded-full border border-accent/30 px-1.5 py-px text-2xs font-[560] text-accent">{t.dialog.openBadge}</span> : null}
    </>
  )
}

function ProjectOption({ favorite, selected }: { readonly favorite: Favorite; readonly selected: boolean }): React.JSX.Element {
  const t = useT().terminal
  return (
    <>
      <ProjectMark color={favorite.color} icon={favorite.icon} size="md" />
      <div className="min-w-0 flex-1">
        <p className={`flex items-center gap-1.5 truncate text-[0.8125rem] font-[560] ${selected ? 'text-ink' : 'text-ink-2'}`}>
          {favorite.name}
          {favorite.starred ? <Star className="size-3 shrink-0 fill-accent text-accent" aria-label={t.pinned} /> : null}
        </p>
        <p className="truncate font-mono text-2xs text-ink-3">{favorite.path}</p>
      </div>
      <HostBadge host={favorite.host} subtle={!selected} />
    </>
  )
}

interface ProjectPickerProps {
  readonly entries: readonly PickerEntry[]
  readonly index: number
  onIndex(index: number): void
  onConfirm(): void
  readonly query: string
  onQuery(query: string): void
}

function ProjectPicker({ entries, index, onIndex, onConfirm, query, onQuery }: ProjectPickerProps): React.JSX.Element {
  const t = useT().terminal.dialog
  const listId = useId()
  const list = useRef<HTMLUListElement>(null)

  useEffect(() => {
    list.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [index])

  const onKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      onIndex(Math.max(0, Math.min(entries.length - 1, index + step)))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      onConfirm()
    }
  }

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-canvas">
      <div className="relative border-b border-line">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
        <input
          data-autofocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={entries[index] ? `${listId}-${index}` : undefined}
          aria-label={t.searchProject}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder={t.searchPlaceholder}
          spellCheck={false}
          className="h-10 w-full bg-transparent pr-3 pl-9 text-[0.8125rem] text-ink outline-none"
        />
      </div>
      {entries.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-ink-3">{query ? t.noMatch(query) : t.noProjects}</p>
      ) : (
        <ul ref={list} id={listId} role="listbox" aria-label={t.projectsAria} className="min-h-0 flex-1 overflow-y-auto py-1">
          {entries.map((entry, i) => {
            const selected = i === index
            const isOrchestrator = entry.kind === 'orchestrator'
            const divided = isOrchestrator && i + 1 < entries.length
            return (
              <li
                key={isOrchestrator ? 'orchestrator' : entry.favorite.id}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={selected}
                onClick={() => onIndex(i)}
                onDoubleClick={onConfirm}
                className={`relative mx-1 flex cursor-default items-center gap-3 rounded-md px-2.5 py-2 transition-colors duration-100 ${selected ? 'bg-accent-soft' : 'hover:bg-raised'} ${divided ? 'mb-2 after:pointer-events-none after:absolute after:inset-x-2.5 after:-bottom-1 after:h-px after:bg-line' : ''}`}
              >
                {entry.kind === 'orchestrator' ? <OrchestratorOption open={entry.open} selected={selected} /> : <ProjectOption favorite={entry.favorite} selected={selected} />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

interface FolderPickerProps {
  readonly host: HostId
  onHost(host: HostId): void
  readonly localPath: string
  onLocalPath(path: string): void
  readonly miniPath: string | null
  onMiniPath(path: string): void
  onConfirm(): void
}

function FolderPicker({ host, onHost, localPath, onLocalPath, miniPath, onMiniPath, onConfirm }: FolderPickerProps): React.JSX.Element {
  const t = useT().terminal.dialog
  const pick = async (): Promise<void> => {
    const folder = await attempt(api.favorites.pickFolder())
    if (folder) onLocalPath(folder)
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Segmented label={t.computer} value={host} options={hostOptions()} onChange={onHost} />
      {host === 'local' ? (
        <Field label={t.folder} hint={t.folderHint}>
          {(id, describedBy) => (
            <div className="flex gap-2">
              <input
                id={id}
                data-autofocus
                aria-describedby={describedBy}
                value={localPath}
                spellCheck={false}
                onChange={(e) => onLocalPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  onConfirm()
                }}
                placeholder="C:\Users\…"
                className="field font-mono text-xs"
              />
              <Button icon={FolderOpen} onClick={() => void pick()}>
                {t.chooseFolder}
              </Button>
            </div>
          )}
        </Field>
      ) : (
        <FolderBrowser key={host} host={host} initialPath={findDevice(host)?.projectsDir || '~'} selectedPath={miniPath} onSelect={onMiniPath} />
      )}
    </div>
  )
}

/** Dialog „Neues Terminal“: Projekt oder freier Ordner, Startmodus, optionaler Titel. */
export function NewTerminalDialog(): React.JSX.Element {
  const { terminal: t, common } = useT()
  const open = useTerminals((s) => s.dialogOpen)
  const closeDialog = useTerminals((s) => s.closeDialog)
  const launch = useTerminals((s) => s.launch)
  const opening = useTerminals((s) => s.opening)
  const openOrchestrator = useTerminals((s) => s.openOrchestrator)
  const orchestratorOpen = useTerminals((s) => s.terminals.some((t) => t.orchestrator && t.running))
  const orchestratorEnabled = useSettings((s) => s.settings?.orchestrator.enabled !== false)
  const allFavorites = useFavorites((s) => s.favorites)

  const [source, setSource] = useState<Source>('project')
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const [host, setHost] = useState<HostId>('local')
  const [localPath, setLocalPath] = useState('')
  const [miniPath, setMiniPath] = useState<string | null>(null)
  const [mode, setMode] = useState<LaunchMode>('new')
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (!open) return
    setQuery('')
    setIndex(0)
    setTitle('')
    setMode('new')
  }, [open])

  const entries = useMemo<readonly PickerEntry[]>(() => {
    const projects = pinnedFirst(allFavorites.filter((f) => matches(f, query))).map((favorite): PickerEntry => ({ kind: 'project', favorite }))
    return orchestratorEnabled && orchestratorMatches(query) ? [{ kind: 'orchestrator', open: orchestratorOpen }, ...projects] : projects
  }, [allFavorites, query, orchestratorEnabled, orchestratorOpen])

  const entryIndex = Math.min(index, Math.max(0, entries.length - 1))
  const entry = source === 'project' ? entries[entryIndex] : undefined
  const orchestratorChosen = entry?.kind === 'orchestrator'

  useEffect(() => {
    if (orchestratorChosen && mode === 'shell') setMode('new')
  }, [orchestratorChosen, mode])

  const target = ((): LaunchTarget | null => {
    if (source === 'project') {
      if (entry?.kind !== 'project') return null
      const f = entry.favorite
      return { host: f.host, path: f.path, name: f.name }
    }
    const path = (host === 'local' ? localPath : (miniPath ?? '')).trim()
    return path ? { host, path, name: baseName(path) || path } : null
  })()

  const submit = (): void => {
    if (opening) return
    if (orchestratorChosen) void openOrchestrator(mode === 'continue' ? 'continue' : 'new')
    else if (target) void launch(target, mode, title)
  }

  return createPortal(
    <Modal
      open={open}
      label={t.newTerminalTitle}
      onClose={closeDialog}
      align="top"
      className="flex max-h-[76vh] w-full max-w-xl flex-col rounded-xl border border-line-strong/70 bg-raised p-5 shadow-[0_24px_60px_-12px_oklch(0_0_0/0.7)]"
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[0.9375rem] font-[640] text-ink">{t.newTerminalTitle}</h2>
          <Segmented<Source> label={t.dialog.startPoint} value={source} options={sourceOptions(t.dialog)} onChange={setSource} />
        </div>

        <div className="mt-4 flex h-[19rem] min-h-0 flex-col">
          {source === 'project' ? (
            <ProjectPicker
              entries={entries}
              index={entryIndex}
              onIndex={setIndex}
              onConfirm={submit}
              query={query}
              onQuery={(q) => {
                setQuery(q)
                setIndex(0)
              }}
            />
          ) : (
            <FolderPicker
              host={host}
              onHost={setHost}
              localPath={localPath}
              onLocalPath={setLocalPath}
              miniPath={miniPath}
              onMiniPath={setMiniPath}
              onConfirm={submit}
            />
          )}
        </div>

        <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-[560] text-ink-2">{t.dialog.start}</span>
            <Segmented<LaunchMode> label={t.dialog.modeLabel} value={mode} options={orchestratorChosen ? orchestratorModeOptions(t.dialog) : modeOptions(t.dialog)} onChange={setMode} />
          </div>
          <Field label={t.dialog.titleOptional}>
            {(id) => (
              <input
                id={id}
                value={orchestratorChosen ? ORCHESTRATOR_NAME : title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={orchestratorChosen}
                placeholder={target?.name ?? t.dialog.tabTitle}
                className="field disabled:cursor-not-allowed disabled:hover:border-line"
              />
            )}
          </Field>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
          {orchestratorChosen ? (
            <p className="min-w-0 truncate text-2xs text-ink-3">{t.orchestratorHint}</p>
          ) : (
            <p className="min-w-0 truncate font-mono text-2xs text-ink-3" title={target?.path}>
              {target ? target.path : t.dialog.noTarget}
            </p>
          )}
          <div className="flex shrink-0 items-center gap-2">
            <span className="mr-1 hidden items-center gap-1 text-2xs text-ink-3 sm:flex">
              <Kbd>Enter</Kbd> {t.dialog.enterOpens}
            </span>
            <Button variant="ghost" onClick={closeDialog}>
              {common.cancel}
            </Button>
            <Button type="submit" variant="primary" disabled={!target && !orchestratorChosen} loading={opening}>
              {t.dialog.open}
            </Button>
          </div>
        </div>
      </form>
    </Modal>,
    document.body
  )
}
