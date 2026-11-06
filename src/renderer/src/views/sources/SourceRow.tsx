import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight, ExternalLink, FolderInput, Pencil, Star, Trash2, UserCheck } from 'lucide-react'
import type { Source } from '@shared/types'
import { domainOf, type SourceBundle } from '@shared/sources'
import { IconButton } from '@renderer/components/Button'
import { formatDateTime, formatRelative } from '@renderer/lib/format'
import { useT } from '@renderer/i18n/useT'
import { displayTitle, siteInitial } from './folders'

const EXPAND_EASE = [0.16, 1, 0.3, 1] as const

/** Was man mit einer Quelle tun kann; die Ansicht entscheidet, wie (App oder Browser, Dialoge). */
export interface SourceActions {
  open(source: Source): void
  openExternal(source: Source): void
  toggleStar(source: Source): void
  adopt(source: Source): void
  edit(source: Source): void
  move(source: Source): void
  remove(source: Source): void
}

/** Kleines Kennzeichen der Webseite: Anfangsbuchstabe statt Favicon (externe Bilder lässt die CSP nicht zu). */
export function SiteMark({ domain }: { readonly domain: string }): React.JSX.Element {
  return (
    <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-md border border-line bg-raised text-[0.6875rem] font-[650] text-ink-2">
      {siteInitial(domain)}
    </span>
  )
}

function StarButton({ source, onToggle }: { readonly source: Source; onToggle(): void }): React.JSX.Element {
  const t = useT()
  return (
    <button
      type="button"
      aria-pressed={source.starred}
      aria-label={source.starred ? t.sources.starRemove : t.sources.starAdd}
      title={source.starred ? t.sources.starRemoveTitle : t.sources.starAddTitle(t.nav.groups.websites)}
      onClick={onToggle}
      className={`inline-grid size-7 shrink-0 place-items-center rounded-md transition-[color,background-color,opacity] duration-150 hover:bg-raised-2 ${source.starred ? 'text-accent' : 'text-ink-3 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 hover:text-ink'}`}
    >
      <Star className="size-3.5" aria-hidden strokeWidth={2} fill={source.starred ? 'currentColor' : 'none'} />
    </button>
  )
}

function RowActions({ source, actions }: { readonly source: Source; readonly actions: SourceActions }): React.JSX.Element {
  const t = useT()
  return (
    <div className="mr-1.5 flex shrink-0 gap-0.5 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
      {source.origin === 'ai' ? <IconButton size="sm" icon={UserCheck} label={t.sources.adopt(t.sources.originUser)} onClick={() => actions.adopt(source)} /> : null}
      <IconButton size="sm" icon={ExternalLink} label={t.sources.openBrowser} onClick={() => actions.openExternal(source)} />
      <IconButton size="sm" icon={Pencil} label={t.sources.edit} onClick={() => actions.edit(source)} />
      <IconButton size="sm" icon={FolderInput} label={t.sources.moveFolder} onClick={() => actions.move(source)} />
      <IconButton size="sm" icon={Trash2} tone="danger" label={t.common.delete} onClick={() => actions.remove(source)} />
    </div>
  )
}

interface SourceRowProps {
  readonly source: Source
  readonly actions: SourceActions
  /** In einem Bündel steht die Webseite schon im Kopf. */
  readonly inBundle?: boolean
}

export function SourceRow({ source, actions, inBundle = false }: SourceRowProps): React.JSX.Element {
  const domain = domainOf(source.url)
  return (
    <li className="group flex items-center gap-1 rounded-md pr-1.5 transition-colors duration-150 hover:bg-raised/60">
      <button
        type="button"
        onClick={() => actions.open(source)}
        title={source.url}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-2 pl-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
      >
        {inBundle ? null : <SiteMark domain={domain} />}
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="min-w-0 truncate text-[0.8125rem] font-[560] text-ink">{displayTitle(source)}</span>
            {inBundle ? null : <span className="max-w-[16rem] shrink-0 truncate text-2xs text-ink-3">{domain}</span>}
          </span>
          {source.note ? <span className="mt-0.5 block truncate text-xs text-ink-3">{source.note}</span> : null}
        </span>
      </button>
      <RowActions source={source} actions={actions} />
      <StarButton source={source} onToggle={() => actions.toggleStar(source)} />
      <time dateTime={new Date(source.createdAt).toISOString()} title={formatDateTime(source.createdAt)} className="num w-[5.5rem] shrink-0 text-right text-2xs text-ink-3">
        {formatRelative(source.createdAt)}
      </time>
    </li>
  )
}

interface BundleRowProps {
  readonly bundle: SourceBundle
  readonly open: boolean
  readonly actions: SourceActions
  onToggle(): void
}

/** Mehrere Quellen derselben Webseite, aufklappbar. */
export function BundleRow({ bundle, open, actions, onToggle }: BundleRowProps): React.JSX.Element {
  const listId = `source-bundle-${bundle.domain.replace(/[^a-z0-9]+/gi, '-')}-${bundle.sources[0]?.origin ?? ''}`
  const newest = Math.max(...bundle.sources.map((s) => s.createdAt))
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={listId}
        className="group flex w-full items-center gap-3 rounded-md py-2 pr-1.5 pl-2.5 text-left transition-colors duration-150 hover:bg-raised/60"
      >
        <SiteMark domain={bundle.domain} />
        <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-[560] text-ink-2 group-hover:text-ink">{bundle.domain}</span>
        <span className="num shrink-0 rounded-full bg-raised-2 px-1.5 text-2xs leading-[1.125rem] font-[600] text-ink-2">{bundle.sources.length}</span>
        <ChevronRight aria-hidden className={`size-3.5 shrink-0 text-ink-3 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
        <span className="num w-[5.5rem] shrink-0 text-right text-2xs text-ink-3">{formatRelative(newest)}</span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.ul
            id={listId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: EXPAND_EASE }}
            className="ml-[1.4375rem] space-y-px overflow-hidden border-l border-line pl-2"
          >
            {bundle.sources.map((s) => (
              <SourceRow key={s.id} source={s} actions={actions} inBundle />
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </li>
  )
}
