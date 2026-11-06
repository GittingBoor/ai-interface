import { useEffect, useState } from 'react'
import { Check, FolderOpen, Images, Pencil, Play, RotateCcw, SquareTerminal, Trash2, X } from 'lucide-react'
import type { Favorite, ImageMeta, SessionSummary } from '@shared/types'
import { api } from '@renderer/api/client'
import { errorMessage, unwrap, attempt } from '@renderer/api/call'
import { Button, IconButton } from '@renderer/components/Button'
import { HostBadge } from '@renderer/components/Host'
import { ColorPicker } from '@renderer/components/ColorPicker'
import { Field, Switch } from '@renderer/components/Controls'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { SkeletonRows } from '@renderer/components/States'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useCategories } from '@renderer/stores/categoriesStore'
import { useSettings } from '@renderer/stores/settingsStore'
import { useKnowledge } from '@renderer/stores/knowledgeStore'
import { useTerminals } from '@renderer/stores/terminalStore'
import { useNav } from '@renderer/stores/navStore'
import { confirmAction } from '@renderer/stores/confirmStore'
import { galleryImageUrl } from '@renderer/lib/imageUrl'
import type { FavoriteStats } from '@renderer/lib/projects'
import { formatDuration, formatRelative, formatTokens, formatUsd } from '@renderer/lib/format'
import { currentT, useT } from '@renderer/i18n/useT'
import { CategorySelect, IconField, StarToggle } from './ProjectFields'

const SESSION_LIMIT = 12
const IMAGE_PREVIEW = 6

function useProjectData(fav: Favorite): { sessions: SessionSummary[] | null; images: ImageMeta[] | null; error: string | null } {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null)
  const [images, setImages] = useState<ImageMeta[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setSessions(null)
    setImages(null)
    setError(null)
    Promise.all([unwrap(api.usage.sessions(SESSION_LIMIT, fav.path)), unwrap(api.images.list(fav.path))])
      .then(([s, i]) => {
        if (!alive) return
        setSessions(s.filter((x) => x.host === fav.host))
        setImages(i)
      })
      .catch((e: unknown) => alive && setError(errorMessage(e)))
    return () => {
      alive = false
    }
  }, [fav.path, fav.host])
  return { sessions, images, error }
}

function NameEditor({ fav }: { readonly fav: Favorite }): React.JSX.Element {
  const { projects, common } = useT()
  const t = projects.detail
  const update = useFavorites((s) => s.update)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(fav.name)
  useEffect(() => setName(fav.name), [fav.name])

  const save = async (): Promise<void> => {
    if (name.trim() && name.trim() !== fav.name) await update(fav.id, { name: name.trim() })
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="flex min-w-0 items-center gap-1.5">
        <h2 className="truncate text-[1.0625rem] font-[640] tracking-[-0.01em] text-ink">{fav.name}</h2>
        <IconButton size="sm" icon={Pencil} label={t.rename} onClick={() => setEditing(true)} />
      </div>
    )
  }
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <input
        autoFocus
        aria-label={t.nameAria}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setName(fav.name)
            setEditing(false)
          }
        }}
        className="field h-8 text-[0.9375rem] font-[600]"
      />
      <IconButton size="sm" type="submit" icon={Check} label={common.save} />
      <IconButton size="sm" icon={X} label={common.cancel} onClick={() => setEditing(false)} />
    </form>
  )
}

interface ProjectDetailProps {
  readonly fav: Favorite
  readonly stats: FavoriteStats
  readonly openTodos: number
  readonly now: number
  onRemoved(): void
}

/** Projektwissen je Projekt: kostet Kontingent, deshalb bewusst einzeln einzuschalten. */
function KnowledgeSwitch({ favoriteId }: { readonly favoriteId: number }): React.JSX.Element {
  const t = useT().knowledge
  const enabled = useSettings((s) => s.settings?.knowledge.projects.includes(favoriteId) ?? false)
  const setEnabled = useKnowledge((s) => s.setEnabled)
  return <Switch checked={enabled} label={t.enabledLabel} description={t.enabledHint} onChange={(on) => void setEnabled(favoriteId, on)} />
}

export function ProjectDetail({ fav, stats, openTodos, now, onRemoved }: ProjectDetailProps): React.JSX.Element {
  const t = useT().projects.detail
  const update = useFavorites((s) => s.update)
  const remove = useFavorites((s) => s.remove)
  const categories = useCategories((s) => s.categories)
  const launch = useTerminals((s) => s.launch)
  const opening = useTerminals((s) => s.opening)
  const openGallery = useNav((s) => s.openGallery)
  const requestTodo = useNav((s) => s.go)
  const { sessions, images, error } = useProjectData(fav)

  const onDelete = async (): Promise<void> => {
    const texts = currentT().projects.detail
    const ok = await confirmAction({
      title: texts.removeTitle(fav.name),
      message: texts.removeMessage,
      confirmLabel: texts.removeConfirm,
      danger: true
    })
    if (ok && (await remove(fav.id))) onRemoved()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2.5">
          <ProjectMark color={fav.color} icon={fav.icon} size="lg" />
          <div className="min-w-0 flex-1">
            <NameEditor fav={fav} />
          </div>
          <StarToggle starred={fav.starred} name={fav.name} size="md" onToggle={() => void update(fav.id, { starred: !fav.starred })} />
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <HostBadge host={fav.host} />
          <p className="min-w-0 flex-1 truncate font-mono text-2xs text-ink-3" title={fav.path}>
            {fav.path}
          </p>
          {fav.host === 'local' ? <IconButton size="sm" icon={FolderOpen} label={t.showInExplorer} onClick={() => void attempt(api.app.showInFolder(fav.path))} /> : null}
        </div>
      </div>

      <KnowledgeSwitch favoriteId={fav.id} />

      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" icon={Play} disabled={opening} onClick={() => void launch(fav, 'new')} className="col-span-2 h-9">
          {t.startClaude}
        </Button>
        <Button icon={RotateCcw} disabled={opening} onClick={() => void launch(fav, 'continue')}>
          {t.resume}
        </Button>
        <Button icon={SquareTerminal} disabled={opening} onClick={() => void launch(fav, 'shell')}>
          {t.shell}
        </Button>
      </div>

      <dl className="num grid grid-cols-3 border-y border-line py-3.5 text-xs">
        <div>
          <dt className="text-ink-3">{t.tokens7d}</dt>
          <dd className="mt-1 text-[0.9375rem] font-[600] text-ink">{formatTokens(stats.tokens7d)}</dd>
        </div>
        <div>
          <dt className="text-ink-3">{t.cost7d}</dt>
          <dd className="mt-1 text-[0.9375rem] font-[600] text-ink">{formatUsd(stats.cost7d)}</dd>
        </div>
        <div>
          <dt className="text-ink-3">{t.openTodos}</dt>
          <dd className="mt-1 text-[0.9375rem] font-[600] text-ink">
            <button type="button" className="hover:text-accent-text hover:underline hover:underline-offset-4" onClick={() => requestTodo('todos')}>
              {openTodos}
            </button>
          </dd>
        </div>
      </dl>

      <section aria-label={t.sessions}>
        <h3 className="mb-2 text-xs font-[600] text-ink-2">{t.sessions}</h3>
        {error ? <p className="text-xs text-danger-ink">{error}</p> : null}
        {!sessions && !error ? <SkeletonRows rows={3} /> : null}
        {sessions && sessions.length === 0 ? <p className="text-xs text-ink-3">{t.noSessions}</p> : null}
        {sessions && sessions.length > 0 ? (
          <ul className="divide-y divide-line">
            {sessions.map((s) => (
              <li key={s.sessionId} className="num grid grid-cols-[minmax(0,1fr)_auto_4.5rem_3.75rem] items-center gap-x-3 py-2 text-xs whitespace-nowrap" title={t.models(s.models.join(', '))}>
                <span className="truncate text-ink-2">{formatRelative(s.startedAt, now)}</span>
                <span className="text-right text-ink-3" title={t.activeTime}>
                  {formatDuration(s.activeMs)}
                </span>
                <span className="text-right text-ink">{formatTokens(s.totalTokens)}</span>
                <span className="text-right text-ink-3">{s.costUsd === null ? '–' : formatUsd(s.costUsd)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-label={t.images}>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-[600] text-ink-2">{t.images}</h3>
          <Button size="sm" variant="ghost" icon={Images} onClick={() => openGallery(fav.path)}>
            {t.inGallery}
          </Button>
        </div>
        {images && images.length === 0 ? <p className="text-xs text-ink-3">{t.noImages}</p> : null}
        {images && images.length > 0 ? (
          <ul className="grid grid-cols-3 gap-1.5">
            {images.slice(0, IMAGE_PREVIEW).map((img) => (
              <li key={img.id}>
                <button type="button" onClick={() => openGallery(fav.path)} className="block aspect-[4/3] w-full overflow-hidden rounded-md border border-line" title={img.title}>
                  <img src={galleryImageUrl(img.id)} alt={img.title} loading="lazy" className="size-full object-cover transition-transform duration-300 hover:scale-105" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-label={t.setup} className="flex flex-col gap-4 border-t border-line pt-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.category}>{(id) => <CategorySelect id={id} value={fav.categoryId} categories={categories} onChange={(categoryId) => void update(fav.id, { categoryId })} />}</Field>
          <Field label={t.icon}>{(id) => <IconField id={id} value={fav.icon} color={fav.color} subject={fav.name} onChange={(icon) => void update(fav.id, { icon })} />}</Field>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-[560] text-ink-2">{t.color}</span>
          <ColorPicker label={t.colorLabel} value={fav.color} onChange={(color) => void update(fav.id, { color })} />
        </div>
        <Button variant="ghost" size="sm" icon={Trash2} onClick={() => void onDelete()} className="mt-1 -ml-2.5 self-start text-danger-ink hover:bg-danger-soft hover:text-danger-ink">
          {t.remove}
        </Button>
      </section>
    </div>
  )
}
