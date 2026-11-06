import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ImagePlus, Images, type LucideIcon, Sparkles, Upload, User } from 'lucide-react'
import type { ImageMeta, ImageSource } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt, errorMessage, unwrap } from '@renderer/api/call'
import { Button } from '@renderer/components/Button'
import { Kbd, Segmented } from '@renderer/components/Controls'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { ViewHeader } from '@renderer/components/Section'
import { EmptyState, ErrorState, Skeleton } from '@renderer/components/States'
import { EmptyGalleryIllustration } from '@renderer/components/EmptyIllustrations'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useLiveData } from '@renderer/lib/liveData'
import { useNav } from '@renderer/stores/navStore'
import { confirmAction } from '@renderer/stores/confirmStore'
import { notify } from '@renderer/stores/toastStore'
import { galleryImageUrl } from '@renderer/lib/imageUrl'
import { formatRelative } from '@renderer/lib/format'
import { pinnedFirst } from '@renderer/lib/projectOrganize'
import { Lightbox } from './Lightbox'
import { activeTag } from '@renderer/i18n/activeLocale'
import { currentT, useT } from '@renderer/i18n/useT'
import type { Messages } from '@shared/i18n/messages'

const NO_PROJECT = '__none__'

type SourceFilter = 'all' | 'auto' | 'user'

function sourceOptions(t: Messages): readonly { readonly value: SourceFilter; readonly label: string }[] {
  return [
    { value: 'all', label: t.gallery.sourceAll },
    { value: 'auto', label: t.gallery.sourceAuto },
    { value: 'user', label: t.gallery.sourceUser }
  ]
}

interface BadgeStyle {
  readonly icon: LucideIcon
  readonly label: string
  readonly hint: string
  readonly tone: string
}

/** Kennzeichen je Herkunft aus einer Claude-Session; von Hand hinzugefügte Bilder bleiben ohne. */
function sourceBadges(t: Messages): Readonly<Partial<Record<ImageSource, BadgeStyle>>> {
  return {
    auto: { icon: Sparkles, label: t.gallery.badgeAuto, hint: t.gallery.badgeAutoHint, tone: 'text-accent-text' },
    user: { icon: User, label: t.gallery.badgeUser, hint: t.gallery.badgeUserHint, tone: 'text-ink-2' }
  }
}

/** Dezentes Kennzeichen, woher ein Bild aus einer Claude-Session stammt. */
function SourceBadge({ image }: { readonly image: ImageMeta }): React.JSX.Element | null {
  const t = useT()
  const badge = sourceBadges(t)[image.source]
  if (!badge) return null
  const Icon = badge.icon
  return (
    <span
      title={`${badge.hint}
${image.title}`}
      className={`absolute top-2 left-2 inline-flex h-5 items-center gap-1 rounded-full border border-line-strong/60 bg-canvas/80 px-1.5 text-2xs font-[600] backdrop-blur-sm ${badge.tone}`}
    >
      <Icon className="size-3" aria-hidden strokeWidth={2} />
      {badge.label}
    </span>
  )
}
const IMAGE_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp'
}

function extensionOf(file: File): string | null {
  const fromName = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase()
  if (fromName && Object.values(IMAGE_EXTENSIONS).concat('jpeg').includes(fromName)) return fromName === 'jpeg' ? 'jpg' : fromName
  return IMAGE_EXTENSIONS[file.type] ?? null
}

function assignedText(t: Messages, name: string | undefined): string {
  return name === undefined ? t.gallery.dropAssignedFallback : t.gallery.dropAssigned(name)
}

function pastedTitle(): string {
  const now = new Date()
  return currentT().gallery.pasted(now.toLocaleDateString(activeTag()), now.toLocaleTimeString(activeTag(), { hour: '2-digit', minute: '2-digit' }))
}

export function GalleryView(): React.JSX.Element {
  const t = useT()
  const favorites = useFavorites((s) => s.favorites)
  const filter = useNav((s) => s.galleryProject)
  const setFilter = useNav((s) => s.setGalleryProject)
  const [images, setImages] = useState<ImageMeta[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(0)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const fileInput = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  const liveVersion = useLiveData((s) => s.version)
  const load = (): void => {
    setError(null)
    unwrap(api.images.list())
      .then(setImages)
      .catch((e: unknown) => setError(errorMessage(e)))
  }
  useEffect(load, [liveVersion])

  const visible = useMemo(
    () =>
      (images ?? []).filter(
        (i) => (filter === null || (filter === NO_PROJECT ? i.project === null : i.project === filter)) && (sourceFilter === 'all' || i.source === sourceFilter)
      ),
    [images, filter, sourceFilter]
  )

  const upload = useCallback(
    async (files: readonly File[], pasted = false): Promise<void> => {
      const valid = files.filter((f) => extensionOf(f) !== null)
      const messages = currentT()
      if (valid.length < files.length) notify.error(messages.gallery.notAllImages, messages.gallery.supported)
      const project = filter && filter !== NO_PROJECT ? filter : null
      for (const file of valid) {
        setUploading((n) => n + 1)
        const data = new Uint8Array(await file.arrayBuffer())
        const title = pasted ? pastedTitle() : file.name.replace(/\.[^.]+$/, '')
        const meta = await attempt(api.images.add(data, { title, project, tags: [], extension: extensionOf(file) ?? 'png' }))
        setUploading((n) => n - 1)
        if (meta) setImages((list) => [meta, ...(list ?? [])])
      }
      if (valid.length) notify.success(messages.gallery.added(valid.length))
    },
    [filter]
  )

  useEffect(() => {
    const onPaste = (e: ClipboardEvent): void => {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
      const files = [...(e.clipboardData?.items ?? [])].filter((i) => i.kind === 'file' && i.type.startsWith('image/')).map((i) => i.getAsFile()).filter((f): f is File => f !== null)
      if (files.length) {
        e.preventDefault()
        void upload(files, true)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [upload])

  const update = async (id: number, patch: Partial<Pick<ImageMeta, 'title' | 'project' | 'tags'>>): Promise<void> => {
    const meta = await attempt(api.images.update(id, patch))
    if (meta) setImages((list) => (list ?? []).map((i) => (i.id === id ? meta : i)))
  }

  const remove = async (image: ImageMeta): Promise<void> => {
    const messages = currentT()
    const ok = await confirmAction({ title: messages.gallery.deleteTitle, message: messages.gallery.deleteMessage(image.title), confirmLabel: messages.common.delete, danger: true })
    if (!ok || (await attempt(api.images.remove(image.id))) === null) return
    const position = visible.findIndex((i) => i.id === image.id)
    setImages((list) => (list ?? []).filter((i) => i.id !== image.id))
    setLightbox(visible.length > 1 ? Math.min(position, visible.length - 2) : null)
  }

  const countOf = (source: SourceFilter): number => (images ?? []).filter((i) => i.source === source).length
  const chips: { readonly id: string | null; readonly label: string; readonly mark?: { readonly color: string; readonly icon: string | null } }[] = [
    { id: null, label: t.gallery.chipAll },
    ...pinnedFirst(favorites).map((f) => ({ id: f.path, label: f.name, mark: { color: f.color, icon: f.icon } })),
    { id: NO_PROJECT, label: t.gallery.chipNone }
  ]

  return (
    <div
      className="relative flex h-full flex-col"
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        dragDepth.current++
        setDragging(true)
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragging(false)
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault()
      }}
      onDrop={(e) => {
        e.preventDefault()
        dragDepth.current = 0
        setDragging(false)
        void upload([...e.dataTransfer.files])
      }}
    >
      <ViewHeader
        title={t.frame.views.gallery}
        actions={
          <Button icon={ImagePlus} onClick={() => fileInput.current?.click()} loading={uploading > 0}>
            {t.gallery.addImages}
          </Button>
        }
      >
        <span className="flex items-center gap-1.5">
          {t.gallery.hintBefore}
          <Kbd>{t.frame.ctrl}</Kbd>
          <Kbd>V</Kbd>
          {t.gallery.hintAfter}
        </span>
      </ViewHeader>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          void upload([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />

      <div className="flex flex-wrap items-start justify-between gap-4 px-8 pb-5">
      <div className="flex min-w-0 flex-1 basis-64 flex-wrap gap-1.5" role="radiogroup" aria-label={t.gallery.filterAria}>
        {chips.map((c) => {
          const active = c.id === filter
          return (
            <button
              key={c.id ?? 'all'}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setFilter(c.id)}
              className={`inline-flex h-7 items-center gap-2 rounded-full border px-3 text-xs font-[540] transition-colors duration-150 ${active ? 'border-line-strong bg-raised-2 text-ink' : 'border-line text-ink-3 hover:border-line-strong hover:text-ink-2'}`}
            >
              {c.mark ? <ProjectMark color={c.mark.color} icon={c.mark.icon} size="sm" className="-ml-1" /> : null}
              {c.label}
            </button>
          )
        })}
      </div>
        <Segmented
          label={t.gallery.sourceAria}
          value={sourceFilter}
          onChange={(next: SourceFilter) => setSourceFilter(next)}
          options={sourceOptions(t).map((o) => (o.value === 'all' ? o : { ...o, count: countOf(o.value) }))}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-10">
        {error ? <ErrorState message={error} onRetry={load} /> : null}
        {!images && !error ? (
          <div className="columns-[15rem] gap-4">
            {['h-44', 'h-60', 'h-36', 'h-64', 'h-48', 'h-40'].map((h) => (
              <Skeleton key={h} className={`mb-4 break-inside-avoid ${h}`} />
            ))}
          </div>
        ) : null}
        {images && visible.length === 0 ? (
          <EmptyState
            icon={Images}
            illustration={<EmptyGalleryIllustration />}
            title={sourceFilter === 'auto' && images.length ? t.gallery.emptyAuto : sourceFilter === 'user' && images.length ? t.gallery.emptyUser : images.length ? t.gallery.emptyProject : t.gallery.emptyAll}
            action={
              <Button icon={Upload} onClick={() => fileInput.current?.click()}>
                {t.gallery.pickImages}
              </Button>
            }
          >
            {[
              sourceFilter === 'auto' ? t.gallery.emptyAutoNote : '',
              sourceFilter === 'user' ? t.gallery.emptyUserNote : '',
              t.gallery.emptyDrop(t.frame.shortcut('V')),
              filter && filter !== NO_PROJECT ? t.gallery.emptyAssign : ''
            ]
              .filter(Boolean)
              .join(' ')}
          </EmptyState>
        ) : null}
        <ul className="columns-[15rem] gap-4">
          <AnimatePresence initial={false}>
            {visible.map((img, i) => (
              <motion.li
                key={img.id}
                layout="position"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25, delay: Math.min(i, 12) * 0.025, ease: [0.16, 1, 0.3, 1] }}
                className="mb-4 break-inside-avoid"
              >
                <button type="button" onClick={() => setLightbox(i)} className="group block w-full text-left" aria-label={t.gallery.openImage(img.title)}>
                  <span className="relative block overflow-hidden rounded-lg border border-line bg-raised transition-[border-color,box-shadow] duration-200 group-hover:border-line-strong group-hover:shadow-[0_10px_30px_-12px_oklch(0_0_0/0.7)]">
                    <img src={galleryImageUrl(img.id)} alt="" loading="lazy" className="block w-full transition-transform duration-500 ease-out group-hover:scale-[1.02]" />
                    <SourceBadge image={img} />
                  </span>
                  <span className="mt-2 flex items-baseline gap-2 px-0.5">
                    <span title={img.title} className="min-w-0 flex-1 truncate text-[0.8125rem] font-[540] text-ink-2 group-hover:text-ink">{img.title}</span>
                    <span className="num shrink-0 text-2xs text-ink-3">{formatRelative(img.createdAt)}</span>
                  </span>
                  {img.tags.length ? <span className="mt-0.5 block truncate px-0.5 text-2xs text-ink-3">{img.tags.map((t) => `#${t}`).join('  ')}</span> : null}
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>

      <AnimatePresence>
        {dragging ? (
          <motion.div
            className="pointer-events-none absolute inset-3 z-20 grid place-items-center rounded-2xl border-2 border-dashed border-accent/70 bg-canvas/85"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="text-center">
              <Upload className="mx-auto size-6 text-accent" aria-hidden />
              <p className="mt-3 text-[0.9375rem] font-[600] text-ink">{t.gallery.dropTitle}</p>
              <p className="mt-1 text-xs text-ink-3">{filter && filter !== NO_PROJECT ? assignedText(t, favorites.find((f) => f.path === filter)?.name) : t.gallery.dropNone}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Lightbox images={visible} index={lightbox} favorites={favorites} onIndex={setLightbox} onUpdate={update} onDelete={remove} />
    </div>
  )
}
