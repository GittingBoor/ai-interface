import { useEffect, useState } from 'react'
import { CircleCheck, CircleX, FolderOpen } from 'lucide-react'
import type { FavoriteInput, HostId } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt } from '@renderer/api/call'
import { Button } from '@renderer/components/Button'
import { BrandSpinner } from '@renderer/components/BrandSpinner'
import { ColorPicker } from '@renderer/components/ColorPicker'
import { Field, Segmented } from '@renderer/components/Controls'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useCategories } from '@renderer/stores/categoriesStore'
import { notify } from '@renderer/stores/toastStore'
import { FAVORITE_COLORS, findDevice, hostLabel, hostOptions } from '@renderer/lib/hosts'
import { baseName } from '@renderer/lib/format'
import { CategorySelect, IconField, StarGlyph } from './ProjectFields'

type PathCheck = 'idle' | 'checking' | 'ok' | 'missing'

export interface FavoriteDraft {
  readonly host: HostId
  readonly path: string
  readonly name: string
}

interface AddFavoriteFormProps {
  readonly initial?: FavoriteDraft | null
  /** Vorbelegte Art, z. B. aus dem aktiven Filter. */
  readonly initialCategoryId?: number | null
  onDone(id: number | null): void
}

export function AddFavoriteForm({ initial, initialCategoryId = null, onDone }: AddFavoriteFormProps): React.JSX.Element {
  const add = useFavorites((s) => s.add)
  const count = useFavorites((s) => s.favorites.length)
  const categories = useCategories((s) => s.categories)
  const [host, setHost] = useState<HostId>(initial?.host ?? 'local')
  const [path, setPath] = useState(initial?.path ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [nameTouched, setNameTouched] = useState(Boolean(initial?.name))
  const [color, setColor] = useState(FAVORITE_COLORS[count % FAVORITE_COLORS.length] ?? '#e08a4f')
  const [categoryId, setCategoryId] = useState<number | null>(initialCategoryId)
  const [icon, setIcon] = useState<string | null>(null)
  const [starred, setStarred] = useState(false)
  const [check, setCheck] = useState<PathCheck>(initial ? 'ok' : 'idle')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!nameTouched) setName(path ? baseName(path) : '')
  }, [path, nameTouched])

  const switchHost = (next: HostId): void => {
    setHost(next)
    setPath('')
    setCheck('idle')
    setError(null)
  }

  const pick = async (): Promise<void> => {
    const folder = await attempt(api.favorites.pickFolder())
    if (folder) {
      setPath(folder)
      setCheck('ok')
      setError(null)
    }
  }

  const verify = async (): Promise<boolean> => {
    if (!path.trim()) return false
    setCheck('checking')
    const exists = await attempt(api.favorites.checkPath(host, path.trim()))
    setCheck(exists ? 'ok' : 'missing')
    return exists === true
  }

  const submit = async (): Promise<void> => {
    setError(null)
    if (!path.trim()) {
      setError(host === 'local' ? 'Bitte einen Ordner wählen.' : `Bitte einen Pfad auf ${hostLabel(host)} eingeben.`)
      return
    }
    if (!name.trim()) {
      setError('Bitte einen Namen vergeben.')
      return
    }
    setSaving(true)
    try {
      if (check !== 'ok' && !(await verify())) {
        setError(`Der Ordner existiert auf ${hostLabel(host)} nicht oder ist nicht erreichbar.`)
        return
      }
      const input: FavoriteInput = { host, path: path.trim(), name: name.trim(), color, categoryId, icon, starred }
      const fav = await add(input)
      if (fav) {
        notify.success(`„${fav.name}“ ist jetzt ein Projekt.`)
        onDone(fav.id)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="rounded-xl border border-line-strong/60 bg-raised p-5"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onDone(null)
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[0.875rem] font-[620] text-ink">Projekt hinzufügen</h2>
        <Segmented
          label="Rechner"
          value={host}
          onChange={switchHost}
          options={hostOptions()}
        />
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4">
        <Field
          label="Ordner"
          error={error}
          hint={host === 'local' ? 'Ordner auf diesem Rechner' : `Absoluter Pfad auf ${hostLabel(host)}, z. B. ${findDevice(host)?.projectsDir ?? '~'}/…`}
        >
          {(id, describedBy) =>
            host === 'local' ? (
              <div className="flex gap-2">
                <input id={id} aria-describedby={describedBy} readOnly value={path} placeholder="Noch kein Ordner gewählt" className="field font-mono text-xs" onClick={() => void pick()} />
                <Button icon={FolderOpen} onClick={() => void pick()}>
                  Wählen
                </Button>
              </div>
            ) : (
              <div className="relative">
                <input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={check === 'missing'}
                  value={path}
                  autoFocus
                  spellCheck={false}
                  onChange={(e) => {
                    setPath(e.target.value)
                    setCheck('idle')
                  }}
                  onBlur={() => void verify()}
                  placeholder={`${findDevice(host)?.projectsDir ?? '~'}/…`}
                  className="field pr-9 font-mono text-xs"
                />
                <span className="absolute top-1/2 right-2.5 -translate-y-1/2" aria-live="polite">
                  {check === 'checking' ? <BrandSpinner className="size-4 text-ink-3" label="Wird geprüft" /> : null}
                  {check === 'ok' ? <CircleCheck className="size-4 text-mini-ink" aria-label="Ordner gefunden" /> : null}
                  {check === 'missing' ? <CircleX className="size-4 text-danger-ink" aria-label="Ordner nicht gefunden" /> : null}
                </span>
              </div>
            )
          }
        </Field>
        <Field label="Name">
          {(id) => (
            <input
              id={id}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setNameTouched(true)
              }}
              placeholder="Anzeigename"
              className="field"
            />
          )}
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-4">
        <Field label="Art">{(id) => <CategorySelect id={id} value={categoryId} categories={categories} onChange={setCategoryId} />}</Field>
        <Field label="Symbol">{(id) => <IconField id={id} value={icon} color={color} subject={name.trim() || 'Neues Projekt'} onChange={setIcon} />}</Field>
        <button
          type="button"
          aria-pressed={starred}
          onClick={() => setStarred(!starred)}
          className="group/star inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-xs font-[540] text-ink-2 transition-colors hover:bg-raised-2 hover:text-ink"
        >
          <StarGlyph starred={starred} />
          {starred ? 'Angepinnt' : 'Anpinnen'}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-[560] text-ink-2">Farbe</span>
          <ColorPicker label="Farbe des Projekts" value={color} onChange={setColor} />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => onDone(null)}>
            Abbrechen
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            Hinzufügen
          </Button>
        </div>
      </div>
    </form>
  )
}
