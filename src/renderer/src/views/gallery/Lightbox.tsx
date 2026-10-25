import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react'
import type { Favorite, ImageMeta } from '@shared/types'
import { Button, IconButton } from '@renderer/components/Button'
import { Field } from '@renderer/components/Controls'
import { galleryImageUrl } from '@renderer/lib/imageUrl'
import { formatBytes, formatDateTime } from '@renderer/lib/format'
import { Modal } from '@renderer/components/Modal'

interface LightboxProps {
  readonly images: readonly ImageMeta[]
  readonly index: number | null
  readonly favorites: readonly Favorite[]
  onIndex(index: number | null): void
  onUpdate(id: number, patch: Partial<Pick<ImageMeta, 'title' | 'project' | 'tags'>>): Promise<void>
  onDelete(image: ImageMeta): Promise<void>
}

const parseTags = (text: string): string[] => [...new Set(text.split(',').map((t) => t.trim()).filter(Boolean))]

function MetaEditor({ image, favorites, onUpdate }: { readonly image: ImageMeta; readonly favorites: readonly Favorite[]; onUpdate: LightboxProps['onUpdate'] }): React.JSX.Element {
  const [title, setTitle] = useState(image.title)
  const [tags, setTags] = useState(image.tags.join(', '))
  useEffect(() => {
    setTitle(image.title)
    setTags(image.tags.join(', '))
  }, [image])

  const saveTitle = (): void => {
    if (title.trim() && title.trim() !== image.title) void onUpdate(image.id, { title: title.trim() })
  }
  const saveTags = (): void => {
    const next = parseTags(tags)
    if (next.join() !== image.tags.join()) void onUpdate(image.id, { tags: next })
  }

  return (
    <div className="space-y-4">
      <Field label="Titel">
        {(id) => (
          <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} onKeyDown={(e) => e.key === 'Enter' && saveTitle()} className="field" />
        )}
      </Field>
      <Field label="Tags" hint="Mit Komma trennen">
        {(id, d) => (
          <input id={id} aria-describedby={d} value={tags} onChange={(e) => setTags(e.target.value)} onBlur={saveTags} onKeyDown={(e) => e.key === 'Enter' && saveTags()} className="field" placeholder="entwurf, ui" />
        )}
      </Field>
      <Field label="Projekt">
        {(id) => (
          <select id={id} value={image.project ?? ''} onChange={(e) => void onUpdate(image.id, { project: e.target.value || null })} className="field">
            <option value="">Ohne Projekt</option>
            {favorites.map((f) => (
              <option key={f.id} value={f.path}>
                {f.name}
              </option>
            ))}
          </select>
        )}
      </Field>
    </div>
  )
}

export function Lightbox({ images, index, favorites, onIndex, onUpdate, onDelete }: LightboxProps): React.JSX.Element {
  const image = index !== null ? images[index] : undefined
  const [direction, setDirection] = useState(0)

  const step = (dir: 1 | -1): void => {
    if (index === null || !images.length) return
    setDirection(dir)
    onIndex((index + dir + images.length) % images.length)
  }

  useEffect(() => {
    if (index === null) return
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <Modal
      open={image !== undefined}
      label={image ? `Bild: ${image.title}` : 'Bild'}
      onClose={() => onIndex(null)}
      backdrop="bg-[oklch(0.1_0.004_70/0.92)]"
      className="flex h-[min(88vh,56rem)] w-[min(92vw,90rem)] overflow-hidden rounded-xl border border-line bg-canvas shadow-[0_30px_80px_-20px_oklch(0_0_0/0.8)]"
    >
      {image ? (
        <>
          <div className="relative flex min-w-0 flex-1 items-center justify-center bg-[oklch(0.13_0.004_70)] p-8">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.img
                key={image.id}
                src={galleryImageUrl(image.id)}
                alt={image.title}
                className="max-h-full max-w-full rounded-md object-contain shadow-[0_12px_40px_-12px_oklch(0_0_0/0.8)]"
                initial={{ opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -24 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              />
            </AnimatePresence>
            {images.length > 1 ? (
              <>
                <IconButton icon={ChevronLeft} label="Vorheriges Bild (Pfeil links)" onClick={() => step(-1)} className="absolute top-1/2 left-3 size-10 -translate-y-1/2 rounded-full bg-canvas/70 text-ink-2" />
                <IconButton icon={ChevronRight} label="Nächstes Bild (Pfeil rechts)" onClick={() => step(1)} className="absolute top-1/2 right-3 size-10 -translate-y-1/2 rounded-full bg-canvas/70 text-ink-2" />
              </>
            ) : null}
            <p className="num absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-canvas/70 px-2.5 py-1 text-2xs text-ink-2">
              {(index ?? 0) + 1} / {images.length}
            </p>
          </div>
          <aside className="flex w-[20rem] shrink-0 flex-col border-l border-line bg-base p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[0.875rem] font-[620] text-ink">Details</h2>
              <IconButton icon={X} label="Schließen (Esc)" onClick={() => onIndex(null)} data-autofocus />
            </div>
            <MetaEditor image={image} favorites={favorites} onUpdate={onUpdate} />
            <dl className="num mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-line pt-4 text-xs">
              <dt className="text-ink-3">Datei</dt>
              <dd className="truncate text-right font-mono text-2xs text-ink-2">{image.fileName}</dd>
              <dt className="text-ink-3">Größe</dt>
              <dd className="text-right text-ink-2">{formatBytes(image.bytes)}</dd>
              <dt className="text-ink-3">Hinzugefügt</dt>
              <dd className="text-right text-ink-2">{formatDateTime(image.createdAt)}</dd>
            </dl>
            <div className="mt-auto pt-5">
              <Button variant="ghost" icon={Trash2} onClick={() => void onDelete(image)} className="-ml-3 text-danger-ink hover:bg-danger-soft hover:text-danger-ink">
                Bild löschen
              </Button>
            </div>
          </aside>
        </>
      ) : null}
    </Modal>
  )
}
