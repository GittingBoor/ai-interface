import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ArrowUp, ChevronRight, File, Folder, FolderOpen, SquareTerminal, WifiOff } from 'lucide-react'
import type { FolderEntry, HostId } from '@shared/types'
import { api } from '@renderer/api/client'
import { ApiError, unwrap } from '@renderer/api/call'
import { hostLabel } from '@renderer/lib/hosts'
import { Button, IconButton } from './Button'
import { Switch } from './Controls'
import { SkeletonRows } from './States'

interface FolderBrowserProps {
  readonly host: HostId
  /** Startordner; `~` steht für das Home-Verzeichnis des Hosts. */
  readonly initialPath: string
  readonly selectedPath: string | null
  onSelect(path: string): void
  /** Blendet je Ordner „Terminal hier öffnen“ ein. */
  onOpenTerminal?(path: string): void
}

interface Crumb {
  readonly label: string
  readonly path: string
}

interface LoadError {
  readonly title: string
  readonly message: string
}

type Status = 'loading' | 'ready' | 'error'

const HOME_PREFIX = /^~(?=$|[\\/])/
const WINDOWS_PATH = /^[A-Za-z]:|\\/

const isWindowsPath = (path: string): boolean => WINDOWS_PATH.test(path)

function trimTrailing(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, '')
  if (trimmed === '') return '/'
  return /^[A-Za-z]:$/.test(trimmed) ? `${trimmed}\\` : trimmed
}

/** Zerlegt einen absoluten Pfad in Brotkrumen (Windows- und POSIX-Pfade). */
export function pathCrumbs(path: string): Crumb[] {
  if (isWindowsPath(path)) {
    const parts = path.split(/[\\/]+/).filter(Boolean)
    return parts.map((label, i) => ({ label, path: i === 0 ? `${label}\\` : parts.slice(0, i + 1).join('\\') }))
  }
  const parts = path.split('/').filter(Boolean)
  return [{ label: '/', path: '/' }, ...parts.map((label, i) => ({ label, path: `/${parts.slice(0, i + 1).join('/')}` }))]
}

/** Übergeordneter Ordner oder `null` an der Wurzel. */
export function parentPath(path: string): string | null {
  const crumbs = pathCrumbs(path)
  return crumbs.length > 1 ? (crumbs[crumbs.length - 2]?.path ?? null) : null
}

function describeError(error: unknown, host: HostId): LoadError {
  const message = error instanceof Error ? error.message : String(error)
  if (error instanceof ApiError && error.code === 'HOST_UNREACHABLE') return { title: `${hostLabel(host)} nicht erreichbar`, message }
  if (error instanceof ApiError && error.code === 'NOT_FOUND') return { title: 'Ordner nicht gefunden', message }
  return { title: 'Ordner konnte nicht geladen werden', message }
}

/** Ordnerauswahl auf einem Host: Pfadzeile, Brotkrumen, Liste, versteckte Einträge. */
export function FolderBrowser({ host, initialPath, selectedPath, onSelect, onOpenTerminal }: FolderBrowserProps): React.JSX.Element {
  const listId = useId()
  const [dir, setDir] = useState<string | null>(null)
  const [draft, setDraft] = useState(initialPath)
  const [entries, setEntries] = useState<readonly FolderEntry[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<LoadError | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const [cursor, setCursor] = useState(0)
  const request = useRef(0)
  const target = useRef(initialPath)
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect

  const load = useCallback(
    async (path: string, hidden: boolean): Promise<void> => {
      const ticket = ++request.current
      target.current = path
      setStatus('loading')
      try {
        const resolved = HOME_PREFIX.test(path) ? path.replace(HOME_PREFIX, await unwrap(api.fs.home(host))) : path
        const list = await unwrap(api.fs.list(host, resolved, hidden))
        if (ticket !== request.current) return
        const next = trimTrailing(resolved)
        setDir(next)
        setDraft(next)
        setEntries(list)
        setCursor(0)
        setError(null)
        setStatus('ready')
        selectRef.current(next)
      } catch (cause) {
        if (ticket !== request.current) return
        setError(describeError(cause, host))
        setStatus('error')
      }
    },
    [host]
  )

  useEffect(() => {
    void load(initialPath, false)
  }, [load, initialPath])

  const open = (path: string): void => void load(path, showHidden)
  const up = dir ? parentPath(dir) : null
  const folders = entries.filter((e) => e.isDirectory)
  const crumbs = dir ? pathCrumbs(dir) : []

  const onListKey = (e: React.KeyboardEvent): void => {
    const current = folders[cursor]
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.max(0, Math.min(folders.length - 1, cursor + (e.key === 'ArrowDown' ? 1 : -1)))
      setCursor(next)
      const entry = folders[next]
      if (entry) onSelect(entry.path)
    } else if (e.key === 'Enter' && current) {
      e.preventDefault()
      open(current.path)
    } else if (e.key === 'Backspace' && up) {
      e.preventDefault()
      open(up)
    }
  }

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-canvas">
      <div className="flex items-center gap-1.5 border-b border-line p-1.5">
        <IconButton size="sm" icon={ArrowUp} label="Übergeordneter Ordner" disabled={!up || status === 'loading'} onClick={() => up && open(up)} />
        <input
          aria-label={`Pfad auf ${hostLabel(host)}`}
          value={draft}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            e.stopPropagation()
            if (draft.trim()) open(draft.trim())
          }}
          className="field h-7 flex-1 border-transparent bg-transparent font-mono text-xs hover:border-line"
        />
      </div>

      <nav aria-label="Pfad" className="flex min-h-8 items-center gap-0.5 overflow-x-auto border-b border-line px-2 py-1">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1
          return (
            <span key={c.path} className="flex shrink-0 items-center gap-0.5">
              {i > 0 ? <ChevronRight className="size-3 text-ink-3/60" aria-hidden /> : null}
              <button
                type="button"
                onClick={() => open(c.path)}
                aria-current={last ? 'location' : undefined}
                className={`rounded px-1.5 py-0.5 text-2xs transition-colors duration-150 hover:bg-raised-2 ${last ? 'font-[600] text-ink' : 'text-ink-3 hover:text-ink'}`}
              >
                {c.label}
              </button>
            </span>
          )
        })}
      </nav>

      <div className="relative min-h-0 flex-1 overflow-y-auto" aria-busy={status === 'loading'}>
        {status === 'loading' ? (
          <div className="p-2">
            <SkeletonRows rows={5} />
          </div>
        ) : null}
        {status === 'error' && error ? (
          <div role="alert" className="flex flex-col items-start gap-2 px-4 py-6">
            <span className="grid size-8 place-items-center rounded-lg border border-danger/30 bg-danger-soft text-danger-ink">
              <WifiOff className="size-4" aria-hidden strokeWidth={1.75} />
            </span>
            <p className="text-[0.8125rem] font-[600] text-ink">{error.title}</p>
            <p className="max-w-prose text-xs leading-relaxed text-ink-3">{error.message}</p>
            <Button size="sm" onClick={() => void load(target.current, showHidden)}>
              Erneut
            </Button>
          </div>
        ) : null}
        {status === 'ready' ? (
          entries.length === 0 ? (
            <p className="px-4 py-6 text-xs text-ink-3">Dieser Ordner ist leer.</p>
          ) : (
            <ul
              id={listId}
              role="listbox"
              aria-label="Ordner"
              tabIndex={0}
              aria-activedescendant={folders[cursor] ? `${listId}-${cursor}` : undefined}
              onKeyDown={onListKey}
              className="group/list py-1 outline-none"
            >
              {entries.map((entry) => {
                if (!entry.isDirectory) {
                  return (
                    <li key={entry.path} role="presentation" className="flex h-8 items-center gap-2.5 px-3 text-xs text-ink-3/60">
                      <File className="size-3.5 shrink-0" aria-hidden strokeWidth={1.75} />
                      <span className="truncate">{entry.name}</span>
                    </li>
                  )
                }
                const index = folders.indexOf(entry)
                const selected = entry.path === selectedPath
                const focused = index === cursor
                const Icon = selected ? FolderOpen : Folder
                return (
                  <li
                    key={entry.path}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setCursor(index)
                      onSelect(entry.path)
                    }}
                    onDoubleClick={() => open(entry.path)}
                    className={`group/row mx-1 flex h-8 cursor-default items-center gap-2.5 rounded-md px-2 text-xs transition-colors duration-100 ${selected ? 'bg-accent-soft text-ink' : 'text-ink-2 hover:bg-raised hover:text-ink'} ${focused ? 'group-focus-visible/list:shadow-[inset_0_0_0_1px_var(--color-accent)]' : ''} ${entry.hidden ? 'opacity-70' : ''}`}
                  >
                    <Icon className={`size-3.5 shrink-0 ${selected ? 'text-accent-text' : 'text-ink-3'}`} aria-hidden strokeWidth={1.75} />
                    <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                    {onOpenTerminal ? (
                      <IconButton
                        size="sm"
                        icon={SquareTerminal}
                        label={`Terminal in ${entry.name} öffnen`}
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenTerminal(entry.path)
                        }}
                        className="size-6 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
                      />
                    ) : null}
                    <ChevronRight className="size-3.5 shrink-0 text-ink-3 opacity-0 group-hover/row:opacity-60" aria-hidden />
                  </li>
                )
              })}
            </ul>
          )
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-line px-3 py-2">
        <p className="num text-2xs text-ink-3" aria-live="polite">
          {status === 'ready' ? `${folders.length} Ordner · Doppelklick öffnet` : ' '}
        </p>
        <Switch
          checked={showHidden}
          label="Versteckte zeigen"
          onChange={(checked) => {
            setShowHidden(checked)
            if (dir) void load(dir, checked)
          }}
        />
      </div>
    </div>
  )
}
