import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { motion } from 'motion/react'
import { Check, ChevronDown, Mic, Square } from 'lucide-react'
import { BrandSpinner } from '@renderer/components/BrandSpinner'
import { SPEECH_HOTKEY_KEYS, SPEECH_MODELS } from '@shared/speech'
import { useSpeech } from '@renderer/stores/speechStore'
import { useSettings } from '@renderer/stores/settingsStore'
import { sameTarget, type SpeechTarget } from '@renderer/lib/speechText'

const BYTES_PER_MB = 1_000_000
/** Kurzer Versatz, aus dem das Menü einblendet (px, Richtung zum Knopf). */
const MENU_OFFSET_PX = 4
const MENU_ITEM = '[role="menuitemradio"]'

interface MicButtonProps {
  readonly target: SpeechTarget
  readonly disabled?: boolean
  /** Modellmenü nach unten öffnen (Werkzeugleiste oben im Fenster). */
  readonly menuBelow?: boolean
}

/** Diktat: Klick startet, Klick stoppt; der Pfeil daneben wechselt das Modell. */
export function MicButton({ target, disabled = false, menuBelow = false }: MicButtonProps): React.JSX.Element {
  const phase = useSpeech((s) => (sameTarget(s.target, target) ? s.phase : 'idle'))
  const busyElsewhere = useSpeech((s) => s.phase !== 'idle' && !sameTarget(s.target, target))
  const status = useSpeech((s) => s.status)
  const toggle = useSpeech((s) => s.toggle)
  const hotkey = useSettings((s) => s.settings?.speech.hotkeyEnabled ?? false)
  const unsupported = status?.supported === false
  const recording = phase === 'recording'
  const transcribing = phase === 'transcribing'
  const shortcut = hotkey ? ` (${SPEECH_HOTKEY_KEYS.join('+')})` : ''
  const label = unsupported ? 'Spracheingabe nur unter Windows eingerichtet' : recording ? `Aufnahme beenden${shortcut} · Esc verwirft` : transcribing ? 'Wird erkannt …' : `Diktieren${shortcut}`

  return (
    <div className="flex shrink-0 items-center">
      <button
        type="button"
        onClick={() => void toggle(target)}
        disabled={disabled || unsupported || transcribing || busyElsewhere}
        aria-pressed={recording}
        aria-label={label}
        title={label}
        className={`grid size-7 place-items-center rounded-md transition-[background-color,color,transform] duration-150 active:translate-y-px disabled:opacity-40 disabled:active:translate-y-0 ${
          recording ? 'animate-pulse-dot bg-danger/25 text-danger-ink hover:bg-danger/35' : transcribing ? 'text-accent-text' : 'text-ink-3 hover:bg-raised-2 hover:text-ink'
        }`}
      >
        {transcribing ? (
          <BrandSpinner className="size-4" />
        ) : recording ? (
          <Square className="size-3" aria-hidden fill="currentColor" strokeWidth={0} />
        ) : (
          <Mic className="size-4" aria-hidden strokeWidth={1.75} />
        )}
      </button>
      {unsupported ? null : <ModelMenu below={menuBelow} />}
    </div>
  )
}

function ModelMenu({ below }: { readonly below: boolean }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const status = useSpeech((s) => s.status)
  const selectModel = useSpeech((s) => s.selectModel)
  const loadStatus = useSpeech((s) => s.loadStatus)

  useEffect(() => {
    if (!open) return
    void loadStatus()
    const onDown = (e: MouseEvent): void => {
      if (root.current && e.target instanceof Node && !root.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      setOpen(false)
      trigger.current?.focus()
    }
    const items = list.current?.querySelectorAll<HTMLButtonElement>(MENU_ITEM)
    const checked = list.current?.querySelector<HTMLButtonElement>(`${MENU_ITEM}[aria-checked="true"]`)
    const initial = checked ?? items?.[0]
    initial?.focus()
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, loadStatus])

  /** Pfeiltasten, Pos1 und Ende wandern durch die Einträge. */
  const onMenuKey = (e: ReactKeyboardEvent<HTMLUListElement>): void => {
    const items = [...(list.current?.querySelectorAll<HTMLButtonElement>(MENU_ITEM) ?? [])]
    const current = items.findIndex((item) => item === document.activeElement)
    const next = e.key === 'ArrowDown' ? current + 1 : e.key === 'ArrowUp' ? current - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : null
    if (next === null || !items.length) return
    e.preventDefault()
    items[(next + items.length) % items.length]?.focus()
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Sprachmodell wählen"
        title="Sprachmodell wählen"
        onClick={() => setOpen(!open)}
        className={`grid h-7 w-4 place-items-center rounded-md transition-colors duration-150 hover:bg-raised-2 hover:text-ink ${open ? 'bg-raised-2 text-ink' : 'text-ink-3'}`}
      >
        <ChevronDown className={`size-3 transition-transform duration-200 ease-out ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open ? (
        <motion.ul
          ref={list}
          role="menu"
          aria-label="Sprachmodell"
          onKeyDown={onMenuKey}
          initial={{ opacity: 0, y: below ? -MENU_OFFSET_PX : MENU_OFFSET_PX }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className={`absolute right-0 z-30 w-60 rounded-lg border border-line-strong/70 bg-raised-2 p-1 shadow-[0_12px_32px_-8px_oklch(0_0_0/0.6)] ${below ? 'top-full mt-1.5' : 'bottom-full mb-1.5'}`}
        >
          {SPEECH_MODELS.map((m) => {
            const installed = status?.installedModels.includes(m.id) ?? false
            const active = status?.model === m.id
            return (
              <li key={m.id} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setOpen(false)
                    trigger.current?.focus()
                    void selectModel(m.id)
                  }}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-100 hover:bg-line-strong/50 focus-visible:bg-line-strong/50 focus-visible:outline-none"
                >
                  <Check className={`mt-0.5 size-3.5 shrink-0 ${active ? 'text-accent' : 'opacity-0'}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-[560] text-ink">{m.label}</span>
                    <span className="block text-2xs text-ink-3">{installed ? m.description : `Nicht geladen · ${Math.round(m.bytes / BYTES_PER_MB)} MB`}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </motion.ul>
      ) : null}
    </div>
  )
}
