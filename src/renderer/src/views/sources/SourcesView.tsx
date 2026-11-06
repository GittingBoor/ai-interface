import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bookmark, Inbox, Info, type LucideIcon, Plus, Search, Settings2, Sparkles, User, X } from 'lucide-react'
import type { Source, SourceOrigin } from '@shared/types'
import { splitByOrigin, type SourceSection } from '@shared/sources'
import { Button, IconButton } from '@renderer/components/Button'
import { ProjectMark, type ProjectMarkSize } from '@renderer/components/ProjectMark'
import { ViewHeader } from '@renderer/components/Section'
import { EmptyState, ErrorState, SkeletonRows } from '@renderer/components/States'
import { hostLabel } from '@renderer/lib/hosts'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useNav } from '@renderer/stores/navStore'
import { useSettings } from '@renderer/stores/settingsStore'
import { useSources } from '@renderer/stores/sourcesStore'
import { allFolders, matchesQuery, visibleFolders, type SourceFolder } from './folders'
import { BundleRow, SourceRow, type SourceActions } from './SourceRow'
import { SourceDialog, type SourceDialogRequest } from './SourceDialog'
import { useT } from '@renderer/i18n/useT'
import type { Messages } from '@shared/i18n/messages'
import { useOpenMode, useSourceActions } from './useSourceActions'

/** Abschnitt der Einstellungen mit dem Umschalter App/Browser. */
export const SOURCES_SETTINGS_ANCHOR = 'sources'
/** Ohne Projektfarbe übernimmt das Kennzeichen die Textfarbe. */
const FALLBACK_MARK_COLOR = 'currentColor'
const CONTENT_EASE = [0.16, 1, 0.3, 1] as const

interface OriginStyle {
  readonly label: string
  readonly icon: LucideIcon
  readonly hint: string
}

function originStyles(t: Messages): Readonly<Record<SourceOrigin, OriginStyle>> {
  return {
    user: { label: t.sources.originUser, icon: User, hint: t.sources.originUserHint },
    ai: { label: t.sources.originAi, icon: Sparkles, hint: t.sources.originAiHint }
  }
}

function FolderMark({ folder, size = 'sm' }: { readonly folder: SourceFolder; readonly size?: ProjectMarkSize }): React.JSX.Element {
  if (folder.project === null) {
    return (
      <span aria-hidden className={`inline-grid shrink-0 place-items-center text-ink-3 ${size === 'lg' ? 'size-8 rounded-lg bg-raised-2' : 'size-4'}`}>
        <Inbox className={size === 'lg' ? 'size-4' : 'size-3.5'} strokeWidth={1.9} />
      </span>
    )
  }
  return <ProjectMark color={folder.color ?? FALLBACK_MARK_COLOR} icon={folder.icon} size={size} />
}

interface FolderNavProps {
  readonly folders: readonly SourceFolder[]
  readonly activeKey: string | null
  readonly query: string
  onQuery(query: string): void
  onSelect(key: string): void
}

function FolderNav({ folders, activeKey, query, onQuery, onSelect }: FolderNavProps): React.JSX.Element {
  const t = useT()
  return (
    <nav aria-label={t.sources.folderNav} className="flex w-[16rem] shrink-0 flex-col border-r border-line/70">
      <label className="relative mx-4 mt-4 mb-2 block">
        <span className="sr-only">{t.sources.searchLabel}</span>
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && query) {
              e.stopPropagation()
              onQuery('')
            }
          }}
          placeholder={t.sources.searchPlaceholder}
          className="field pl-8"
        />
      </label>
      <ul className="flex-1 space-y-px overflow-y-auto px-2 pb-4">
        {folders.map((f) => {
          const active = f.key === activeKey
          return (
            <li key={f.key}>
              <button
                type="button"
                onClick={() => onSelect(f.key)}
                aria-current={active ? 'true' : undefined}
                className={`relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors duration-150 ${active ? 'bg-raised' : 'hover:bg-raised/50'}`}
              >
                {active ? <motion.span layoutId="source-folder-active" className="absolute top-2 bottom-2 left-0 w-px bg-accent" /> : null}
                <FolderMark folder={f} />
                <span className={`min-w-0 flex-1 truncate text-[0.8125rem] ${active ? 'font-[600] text-ink' : 'text-ink-2'}`}>{f.label}</span>
                <span className="num shrink-0 text-2xs text-ink-3">{f.sources.length}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Einmaliger Hinweis, wo sich Quellen öffnen und wo man das umstellt. */
function OpenHint(): React.JSX.Element | null {
  const t = useT()
  const settings = useSettings((s) => s.settings)
  const update = useSettings((s) => s.update)
  const openSettings = useNav((s) => s.openSettings)
  if (!settings || settings.sources.hintSeen) return null
  const inApp = settings.sources.openIn === 'app'
  const dismiss = (): void => void update({ sources: { ...settings.sources, hintSeen: true } })
  return (
    <motion.div
      role="note"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: CONTENT_EASE }}
      className="mb-8 flex items-start gap-3 rounded-lg border border-line bg-raised px-4 py-3"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-[600] text-ink">{inApp ? t.sources.hintAppTitle : t.sources.hintBrowserTitle}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-3">
          {inApp ? t.sources.hintApp(t.frame.views.settings, t.frame.views.sources) : t.sources.hintBrowser(t.frame.views.settings, t.frame.views.sources)}
        </p>
        <Button size="sm" variant="ghost" icon={Settings2} className="mt-2 -ml-2.5" onClick={() => openSettings(SOURCES_SETTINGS_ANCHOR)}>
          {t.sources.toSettings}
        </Button>
      </div>
      <IconButton size="sm" icon={X} label={t.sources.hintClose} onClick={dismiss} />
    </motion.div>
  )
}

interface OriginListProps {
  readonly origin: SourceOrigin
  readonly section: SourceSection
  readonly folderKey: string
  readonly actions: SourceActions
  /** Bei einer Suche sind alle Bündel offen. */
  readonly expandAll: boolean
  readonly openBundles: ReadonlySet<string>
  onToggleBundle(key: string): void
}

function OriginList({ origin, section, folderKey, actions, expandAll, openBundles, onToggleBundle }: OriginListProps): React.JSX.Element | null {
  const t = useT()
  if (section.count === 0) return null
  const style = originStyles(t)[origin]
  const Icon = style.icon
  const headingId = `sources-${folderKey}-${origin}`.replace(/[^a-z0-9-]+/gi, '-')
  return (
    <section aria-labelledby={headingId} className="mt-7 first:mt-0">
      <h3 id={headingId} className="flex items-baseline gap-2 px-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-[620] text-ink-2">
          <Icon className="size-3.5 self-center text-ink-3" aria-hidden strokeWidth={2} />
          {style.label}
        </span>
        <span className="num text-2xs text-ink-3">{section.count}</span>
        <span className="text-2xs text-ink-3">· {style.hint}</span>
      </h3>
      <ul className="mt-2 space-y-px">
        {section.bundles.map((b) => {
          const key = `${folderKey}:${origin}:${b.domain}`
          return <BundleRow key={key} bundle={b} open={expandAll || openBundles.has(key)} actions={actions} onToggle={() => onToggleBundle(key)} />
        })}
        {section.singles.map((s) => (
          <SourceRow key={s.id} source={s} actions={actions} />
        ))}
      </ul>
    </section>
  )
}

interface FolderBlockProps extends Omit<OriginListProps, 'origin' | 'section' | 'folderKey'> {
  readonly folder: SourceFolder
  readonly sources: readonly Source[]
  /** Noch gar keine Quellen: Leerzustand erklärt den ganzen Bereich. */
  readonly firstRun: boolean
  onAdd(): void
}

function FolderBlock({ folder, sources, firstRun, onAdd, ...list }: FolderBlockProps): React.JSX.Element {
  const t = useT()
  const { mine, ai } = useMemo(() => splitByOrigin(sources), [sources])
  const count = sources.length
  return (
    <div className="mb-12 last:mb-0">
      <header className="mb-5 flex items-center gap-3 px-2.5">
        <FolderMark folder={folder} size="lg" />
        <div className="min-w-0">
          <h2 className="truncate text-[0.9375rem] font-[640] text-ink">{folder.label}</h2>
          <p className="num text-xs text-ink-3">
            {folder.host ? `${hostLabel(folder.host)} · ` : ''}
            {t.sources.count(count)}
          </p>
        </div>
      </header>
      {count === 0 ? (
        <div className="px-2.5">
          <EmptyState
            icon={Bookmark}
            compact
            title={firstRun ? t.sources.emptyFirstTitle : t.sources.emptyInTitle(folder.label)}
            action={
              <Button size="sm" icon={Plus} onClick={onAdd}>
                {t.sources.addSource}
              </Button>
            }
          >
            {firstRun ? t.sources.emptyFirstBody(t.sources.originAi) : t.sources.emptyGeneralBody}
          </EmptyState>
        </div>
      ) : null}
      <OriginList origin="user" section={mine} folderKey={folder.key} {...list} />
      <OriginList origin="ai" section={ai} folderKey={folder.key} {...list} />
    </div>
  )
}

/** Gewählter Ordner, sonst der erste mit Quellen, sonst „Allgemein“. */
function resolveFolder(folders: readonly SourceFolder[], wanted: string | null): SourceFolder | undefined {
  return folders.find((f) => f.key === wanted) ?? folders.find((f) => f.sources.length > 0) ?? folders[folders.length - 1]
}

export function SourcesView(): React.JSX.Element {
  const t = useT()
  const sources = useSources((s) => s.sources)
  const loaded = useSources((s) => s.loaded)
  const error = useSources((s) => s.error)
  const load = useSources((s) => s.load)
  const favorites = useFavorites((s) => s.favorites)
  const openIn = useOpenMode()
  const [wanted, setWanted] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<SourceDialogRequest | null>(null)
  const [openBundles, setOpenBundles] = useState<ReadonlySet<string>>(new Set())
  const actions = useSourceActions(setDialog)

  const folders = useMemo(() => allFolders(favorites, sources, t.sources.general), [favorites, sources, t])
  const navFolders = visibleFolders(folders)
  const current = resolveFolder(navFolders, wanted)
  const searching = query.trim() !== ''
  const blocks = searching
    ? folders.map((f) => ({ folder: f, sources: f.sources.filter((s) => matchesQuery(s, query)) })).filter((b) => b.sources.length > 0)
    : current
      ? [{ folder: current, sources: current.sources }]
      : []

  const toggleBundle = (key: string): void => {
    setOpenBundles((open) => {
      const next = new Set(open)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }
  const select = (key: string): void => {
    setQuery('')
    setWanted(key)
  }
  const addHere = (): void => setDialog({ kind: 'add', folderKey: current?.key ?? 'general' })

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={t.frame.views.sources}
        actions={
          <Button icon={Plus} variant="primary" onClick={addHere}>
            {t.sources.addSource}
          </Button>
        }
      >
        {openIn === 'app' ? t.sources.subtitleApp : t.sources.subtitleBrowser}
      </ViewHeader>
      <div className="flex min-h-0 flex-1 border-t border-line/70">
        <FolderNav folders={navFolders} activeKey={searching ? null : (current?.key ?? null)} query={query} onQuery={setQuery} onSelect={select} />
        <div className="min-w-0 flex-1 overflow-y-auto px-10 pt-7 pb-16">
          <div className="max-w-[58rem]">
            <OpenHint />
            {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
            {!loaded && !error ? <SkeletonRows rows={6} /> : null}
            {loaded && searching && blocks.length === 0 ? <p className="px-2.5 text-xs text-ink-3">{t.sources.nothingFound(query.trim())}</p> : null}
            <AnimatePresence mode="wait" initial={false}>
              {loaded ? (
                <motion.div key={searching ? 'search' : (current?.key ?? 'none')} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: CONTENT_EASE }}>
                  {blocks.map((b) => (
                    <FolderBlock key={b.folder.key} folder={b.folder} sources={b.sources} firstRun={sources.length === 0} onAdd={addHere} actions={actions} expandAll={searching} openBundles={openBundles} onToggleBundle={toggleBundle} />
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <SourceDialog request={dialog} folders={folders} onClose={() => setDialog(null)} onSaved={select} />
    </div>
  )
}
