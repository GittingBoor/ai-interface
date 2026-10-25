import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight, NotebookText, RefreshCw, Search } from 'lucide-react'
import type { ProtocolDocument, ProtocolEntry, ProtocolGroup } from '@shared/types'
import { api } from '@renderer/api/client'
import { errorMessage, unwrap } from '@renderer/api/call'
import { IconButton } from '@renderer/components/Button'
import { ViewHeader } from '@renderer/components/Section'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { EmptyState, ErrorState, Skeleton, SkeletonRows } from '@renderer/components/States'
import { EmptyProtocolsIllustration } from '@renderer/components/EmptyIllustrations'
import { NoVault, useNoVault } from '@renderer/components/NoVault'
import { renderMarkdown } from '@renderer/lib/markdown'
import { formatBytes, formatDateTime, formatDayLong, formatRelative } from '@renderer/lib/format'
import { useNav } from '@renderer/stores/navStore'

const DATE_NAME = /^(\d{4}-\d{2}-\d{2})/
const EXPAND_EASE = [0.16, 1, 0.3, 1] as const
/** Ohne Projektfarbe übernimmt das Kennzeichen die Textfarbe der Kopfzeile. */
const FALLBACK_MARK_COLOR = 'currentColor'

function titleOf(name: string): { readonly title: string; readonly sub: string | null } {
  const base = name.replace(/\.md$/i, '')
  const date = DATE_NAME.exec(base)?.[1]
  if (!date) return { title: base, sub: null }
  const rest = base.slice(date.length).replace(/^[\s_-]+/, '')
  return { title: formatDayLong(date), sub: rest || null }
}

const byNameDesc = (a: ProtocolEntry, b: ProtocolEntry): number => b.name.localeCompare(a.name) || b.modifiedAt - a.modifiedAt

function sortGroups(groups: readonly ProtocolGroup[]): ProtocolGroup[] {
  return groups.map((g) => ({ ...g, entries: [...g.entries].sort(byNameDesc) }))
}

function newestPath(groups: readonly ProtocolGroup[]): string | null {
  return groups.flatMap((g) => g.entries).sort(byNameDesc)[0]?.path ?? null
}

function matches(entry: ProtocolEntry, query: string): boolean {
  const { title, sub } = titleOf(entry.name)
  return `${entry.name} ${title} ${sub ?? ''}`.toLocaleLowerCase('de-DE').includes(query)
}

function filterGroups(groups: readonly ProtocolGroup[], rawQuery: string): ProtocolGroup[] {
  const query = rawQuery.trim().toLocaleLowerCase('de-DE')
  if (!query) return [...groups]
  return groups.map((g) => ({ ...g, entries: g.entries.filter((e) => matches(e, query)) })).filter((g) => g.entries.length > 0)
}

interface EntryButtonProps {
  readonly entry: ProtocolEntry
  readonly active: boolean
  readonly onSelect: (path: string) => void
}

function EntryButton({ entry, active, onSelect }: EntryButtonProps): React.JSX.Element {
  const { title, sub } = titleOf(entry.name)
  return (
    <button
      type="button"
      onClick={() => onSelect(entry.path)}
      aria-current={active ? 'true' : undefined}
      className={`relative w-full rounded-md py-2 pr-3 pl-8 text-left transition-colors duration-150 ${active ? 'bg-raised' : 'hover:bg-raised/50'}`}
    >
      {active ? <motion.span layoutId="protocol-active" className="absolute top-2 bottom-2 left-0 w-px bg-accent" /> : null}
      <span className={`block truncate text-[0.8125rem] ${active ? 'font-[600] text-ink' : 'text-ink-2'}`}>{title}</span>
      <span className="num mt-0.5 block truncate text-2xs text-ink-3">
        {sub ?? entry.name} · {formatRelative(entry.modifiedAt)} · {formatBytes(entry.size)}
      </span>
    </button>
  )
}

interface GroupSectionProps {
  readonly group: ProtocolGroup
  readonly open: boolean
  readonly selected: string | null
  readonly onToggle: (id: string) => void
  readonly onSelect: (path: string) => void
}

function GroupSection({ group, open, selected, onToggle, onSelect }: GroupSectionProps): React.JSX.Element {
  const listId = `protocol-group-${group.id.replace(/\s+/g, '-')}`
  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(group.id)}
        aria-expanded={open}
        aria-controls={listId}
        className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-ink-3 transition-colors duration-150 hover:bg-raised/50 hover:text-ink-2"
      >
        <ChevronRight aria-hidden className={`size-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
        <ProjectMark color={group.color ?? FALLBACK_MARK_COLOR} icon={group.icon} size="sm" />
        <span className="min-w-0 flex-1 truncate text-xs font-[600] text-ink-2 group-hover:text-ink">{group.label}</span>
        <span className="num shrink-0 text-2xs">{group.entries.length}</span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.ul
            id={listId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: EXPAND_EASE }}
            className="space-y-px overflow-hidden pb-2"
          >
            {group.entries.map((e) => (
              <li key={e.path}>
                <EntryButton entry={e} active={e.path === selected} onSelect={onSelect} />
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </li>
  )
}

function DocumentView({ path }: { readonly path: string }): React.JSX.Element {
  const [doc, setDoc] = useState<ProtocolDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setDoc(null)
    setError(null)
    unwrap(api.vault.read(path))
      .then((d) => alive && setDoc(d))
      .catch((e: unknown) => alive && setError(errorMessage(e)))
    return () => {
      alive = false
    }
  }, [path])
  const html = useMemo(() => (doc ? renderMarkdown(doc.content) : ''), [doc])

  if (error) return <ErrorState message={error} />
  if (!doc) {
    return (
      <div className="max-w-[72ch] space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }
  return (
    <article>
      <p className="num mb-6 text-xs text-ink-3">
        {doc.name} · geändert {formatDateTime(doc.modifiedAt)}
      </p>
      <div className="prose-log" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  )
}

/** Übernimmt ein von außen gewünschtes Protokoll (z. B. Startseite): auswählen und seine Gruppe aufklappen. */
function useProtocolRequest(
  groups: readonly ProtocolGroup[] | null,
  select: (path: string) => void,
  setCollapsed: (update: (current: ReadonlySet<string>) => ReadonlySet<string>) => void
): void {
  const requested = useNav((s) => s.protocolPath)
  useEffect(() => {
    if (requested === null || groups === null) return
    select(requested)
    const owner = groups.find((g) => g.entries.some((e) => e.path === requested))
    if (owner) {
      setCollapsed((current) => {
        const next = new Set(current)
        next.delete(owner.id)
        return next
      })
    }
    useNav.getState().clearProtocolRequest()
  }, [requested, groups, select, setCollapsed])
}

export function ProtocolsView(): React.JSX.Element {
  const [groups, setGroups] = useState<ProtocolGroup[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())

  const load = (): void => {
    setError(null)
    unwrap(api.vault.list())
      .then((list) => {
        const sorted = sortGroups(list)
        setGroups(sorted)
        setSelected((current) => current ?? newestPath(sorted))
      })
      .catch((e: unknown) => setError(errorMessage(e)))
  }
  useEffect(load, [])
  useProtocolRequest(groups, setSelected, setCollapsed)

  const toggle = (id: string): void => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  const searching = query.trim() !== ''
  const filtered = filterGroups(groups ?? [], query)
  const projectCount = groups?.length ?? 0
  const noVault = useNoVault()

  if (noVault) {
    return (
      <div className="flex h-full flex-col">
        <ViewHeader title="Protokolle">Markdown-Protokolle aus deinem Obsidian-Vault</ViewHeader>
        <div className="px-8">
          <NoVault what="Protokolle" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ViewHeader title="Protokolle" actions={<IconButton icon={RefreshCw} label="Neu laden" onClick={load} />}>
        {projectCount ? `Protokollordner aus ${projectCount} ${projectCount === 1 ? 'Projekt' : 'Projekten'} im Vault, nur lesen` : 'Protokollordner der Projekte im Vault, nur lesen'}
      </ViewHeader>
      <div className="flex min-h-0 flex-1 border-t border-line/70">
        <nav aria-label="Protokolle" className="flex w-[18rem] shrink-0 flex-col border-r border-line/70">
          <label className="relative mx-4 mt-4 mb-2 block">
            <span className="sr-only">Protokolle durchsuchen</span>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Datum oder Titel" className="field pl-8" />
          </label>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {error ? <div className="px-2"><ErrorState message={error} onRetry={load} /></div> : null}
            {!groups && !error ? <div className="px-2 pt-2"><SkeletonRows rows={5} /></div> : null}
            {groups && filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-ink-3">
                {groups.length ? 'Keine Treffer.' : 'Keine Protokollordner gefunden. Angezeigt werden Ordner namens „Protokoll“ in Projekten, die im Obsidian-Vault liegen.'}
              </p>
            ) : null}
            <ul className="space-y-1">
              {filtered.map((g) => (
                <GroupSection key={g.id} group={g} open={searching || !collapsed.has(g.id)} selected={selected} onToggle={toggle} onSelect={setSelected} />
              ))}
            </ul>
          </div>
        </nav>
        <div className="min-w-0 flex-1 overflow-y-auto px-12 pt-8 pb-16">
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              <motion.div key={selected} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
                <DocumentView path={selected} />
              </motion.div>
            ) : groups ? (
              <EmptyState icon={NotebookText} illustration={<EmptyProtocolsIllustration />} title="Kein Protokoll ausgewählt">
                Protokolle liegen als Markdown im Vault und werden hier nur gelesen. Bearbeitet werden sie in Obsidian.
              </EmptyState>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
