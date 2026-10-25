import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@renderer/components/Button'

interface GroupProps {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly children: ReactNode
}

/** Einstellungsgruppe: Titel links, Formular rechts. */
export function Group({ id, title, description, children }: GroupProps): React.JSX.Element {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid break-inside-avoid grid-cols-[14rem_minmax(0,1fr)] gap-10 border-t border-line py-7 max-[1180px]:grid-cols-1 max-[1180px]:gap-4">
      <div>
        <h2 id={`${id}-title`} className="text-[0.875rem] font-[620] text-ink">
          {title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-3">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

export function SaveBar({ dirty, saving, onSave, onReset }: { readonly dirty: boolean; readonly saving: boolean; onSave(): void; onReset(): void }): React.JSX.Element {
  return (
    <div className="mt-5 flex justify-end gap-2">
      {dirty ? (
        <Button size="sm" variant="ghost" onClick={onReset}>
          Verwerfen
        </Button>
      ) : null}
      <Button size="sm" variant="primary" disabled={!dirty} loading={saving} onClick={onSave}>
        Speichern
      </Button>
    </div>
  )
}

/** Lokaler Entwurf eines Teils der Einstellungen mit Speichern/Verwerfen. */
export function useDraft<T>(source: T): { draft: T; setDraft(next: T): void; dirty: boolean; reset(): void } {
  const [draft, setDraftState] = useState(source)
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    if (!dirty) setDraftState(source)
  }, [source, dirty])
  return {
    draft,
    setDraft: (next) => {
      setDraftState(next)
      setDirty(true)
    },
    dirty,
    reset: () => {
      setDraftState(source)
      setDirty(false)
    }
  }
}

