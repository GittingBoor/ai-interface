import { useEffect, useId, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { PIN_PATTERN } from '@shared/privacy'
import { errorMessage } from '@renderer/api/call'
import { useT } from '@renderer/i18n/useT'
import { Button } from './Button'
import { Modal } from './Modal'

/** entsperren: PIN eingeben · festlegen: neue PIN zweimal · ändern: alte + neue PIN. */
export type PinDialogMode = 'unlock' | 'create' | 'change'

interface PinDialogProps {
  readonly mode: PinDialogMode | null
  onClose(): void
  /** Wirft bei falscher PIN; die Meldung erscheint im Dialog. */
  onSubmit(pin: string, next: string | null): Promise<void>
}

interface PinFieldProps {
  readonly label: string
  readonly value: string
  onChange(v: string): void
  readonly autoFocus?: boolean
  /** id der Fehlermeldung, solange eine angezeigt wird. */
  readonly errorId?: string
}

function PinField({ label, value, onChange, autoFocus, errorId }: PinFieldProps): React.JSX.Element {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-[560] text-ink-2">
      {label}
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={errorId ? true : undefined}
        aria-describedby={errorId}
        maxLength={12}
        value={value}
        autoFocus={autoFocus}
        data-autofocus={autoFocus ? true : undefined}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        className="field num tracking-[0.3em]"
      />
    </label>
  )
}

export function PinDialog({ mode, onClose, onSubmit }: PinDialogProps): React.JSX.Element {
  const t = useT()
  const [pin, setPin] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const errorId = useId()
  const describedBy = error ? errorId : undefined

  useEffect(() => {
    setPin('')
    setNext('')
    setRepeat('')
    setError(null)
  }, [mode])

  const needsCurrent = mode === 'unlock' || mode === 'change'
  const needsNew = mode === 'create' || mode === 'change'

  const submit = async (): Promise<void> => {
    if (!mode || busy) return
    if (needsNew && !PIN_PATTERN.test(next)) return setError(t.errors.invalidPin.message)
    if (needsNew && next !== repeat) return setError(t.frame.pin.mismatch)
    setBusy(true)
    try {
      await onSubmit(needsCurrent ? pin : '', needsNew ? next : null)
      onClose()
    } catch (e) {
      setError(errorMessage(e))
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={mode !== null}
      label={mode ? t.frame.pin.titles[mode] : t.frame.pin.dialog}
      onClose={onClose}
      className="w-full max-w-sm rounded-xl border border-line-strong/70 bg-raised p-5 shadow-[0_24px_60px_-12px_oklch(0_0_0/0.7)]"
    >
      {mode ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className="flex items-center gap-2.5">
            <KeyRound className="size-4 text-accent" aria-hidden />
            <h2 className="text-[0.9375rem] font-[640] text-ink">{t.frame.pin.titles[mode]}</h2>
          </div>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-2">{t.frame.pin.texts[mode]}</p>
          <div className="mt-4 grid gap-3">
            {needsCurrent ? <PinField label={mode === 'change' ? t.frame.pin.current : t.frame.pin.dialog} value={pin} onChange={setPin} autoFocus errorId={describedBy} /> : null}
            {needsNew ? <PinField label={t.frame.pin.newPin} value={next} onChange={setNext} autoFocus={!needsCurrent} errorId={describedBy} /> : null}
            {needsNew ? <PinField label={t.frame.pin.repeat} value={repeat} onChange={setRepeat} errorId={describedBy} /> : null}
          </div>
          {error ? (
            <p id={errorId} role="alert" className="mt-3 text-xs text-danger-ink">
              {error}
            </p>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              {mode === 'unlock' ? t.frame.pin.unlock : t.common.save}
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  )
}
