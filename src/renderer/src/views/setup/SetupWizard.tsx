import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from 'lucide-react'
import type { SetupDetection } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt, errorMessage, unwrap } from '@renderer/api/call'
import { AppMark } from '@renderer/components/AppMark'
import { Button } from '@renderer/components/Button'
import { ErrorState } from '@renderer/components/States'
import { useSettings } from '@renderer/stores/settingsStore'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useCategories } from '@renderer/stores/categoriesStore'
import { notify } from '@renderer/stores/toastStore'
import { draftFromDetection, toSetupInput, type SetupDraft } from '@renderer/lib/setupDraft'
import { DevicesStep, FinishStep, NotesStep, ProjectsStep, WelcomeStep } from './steps'

interface StepDef {
  readonly id: string
  readonly label: string
  readonly hint: string
}

const STEPS: readonly StepDef[] = [
  { id: 'welcome', label: 'Willkommen', hint: 'Worum es geht' },
  { id: 'projects', label: 'Projekte', hint: 'Ordner mit deinem Code' },
  { id: 'notes', label: 'Notizen', hint: 'Obsidian, optional' },
  { id: 'devices', label: 'Geräte', hint: 'Weitere Rechner, optional' },
  { id: 'finish', label: 'Fertig', hint: 'Prüfen und starten' }
]
const LAST = STEPS.length - 1

function StepRail({ current, onJump }: { readonly current: number; onJump(index: number): void }): React.JSX.Element {
  return (
    <ol className="space-y-1">
      {STEPS.map((step, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={step.id}>
            <button
              type="button"
              disabled={i > current}
              onClick={() => onJump(i)}
              aria-current={active ? 'step' : undefined}
              className={`group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors disabled:cursor-default ${active ? 'bg-raised' : 'enabled:hover:bg-base'}`}
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full border text-2xs font-[640] transition-colors ${active ? 'border-accent bg-accent text-accent-ink' : done ? 'border-accent/50 text-accent-text' : 'border-line-strong text-ink-3'}`}
                aria-hidden
              >
                {done ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={`block text-[0.8125rem] ${active ? 'font-[600] text-ink' : done ? 'text-ink-2' : 'text-ink-3'}`}>{step.label}</span>
                <span className="block truncate text-2xs text-ink-3">{step.hint}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/** Erste Einrichtung: Projektordner, Notizen, Geräte. Läuft bei neuer Installation oder auf Wunsch erneut. */
export function SetupWizard(): React.JSX.Element {
  const settings = useSettings((s) => s.settings)
  const [detection, setDetection] = useState<SetupDetection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<SetupDraft | null>(null)
  const [step, setStep] = useState(0)
  const [finishing, setFinishing] = useState(false)
  const heading = useRef<HTMLDivElement>(null)

  const detect = async (): Promise<void> => {
    setError(null)
    try {
      setDetection(await unwrap(api.setup.detect()))
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  useEffect(() => {
    void detect()
  }, [])
  useEffect(() => {
    if (detection && settings && !draft) setDraft(draftFromDetection(detection, settings))
  }, [detection, settings, draft])
  // Fokus an den Anfang des neuen Schritts, damit Tastatur und Screenreader mitkommen.
  useEffect(() => {
    heading.current?.querySelector('h1')?.focus()
  }, [step])

  const finish = async (): Promise<void> => {
    if (!draft) return
    setFinishing(true)
    const saved = await attempt(api.setup.finish(toSetupInput(draft)))
    setFinishing(false)
    if (!saved) return
    useSettings.setState({ settings: saved })
    void useFavorites.getState().load()
    void useCategories.getState().load()
    notify.success('Eingerichtet. Alles lässt sich später unter Einstellungen ändern.')
  }

  const canContinue = step !== 1 || (draft?.projectsRoot.trim() ?? '') !== ''
  const next = (): void => (step === LAST ? void finish() : setStep((s) => Math.min(LAST, s + 1)))

  return (
    <div className="flex h-full bg-base">
      <aside className="flex w-64 shrink-0 flex-col border-r border-line/70 bg-canvas px-4 py-5 max-md:hidden">
        <div className="mb-8 flex items-center gap-2.5 px-2.5">
          <AppMark className="size-7" />
          <span className="text-[0.875rem] font-[660] tracking-[-0.01em] text-ink [font-stretch:110%]">AI Interface</span>
        </div>
        <StepRail current={step} onJump={setStep} />
        <p className="mt-auto px-2.5 text-2xs leading-relaxed text-ink-3">Jede Angabe lässt sich später unter Einstellungen ändern.</p>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-10 pt-12 pb-10 max-md:px-6">
          <div className="mx-auto max-w-[44rem]" ref={heading}>
            {error ? <ErrorState message={error} onRetry={() => void detect()} /> : null}
            {!error && (!draft || !detection) ? (
              <p className="flex items-center gap-2 text-[0.8125rem] text-ink-3" role="status">
                <LoaderCircle className="size-4 animate-spin" aria-hidden /> Suche Projektordner, Vault und SSH-Schlüssel …
              </p>
            ) : null}
            {draft && detection ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8, transition: { duration: 0.08 } }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                >
                  {step === 0 ? <WelcomeStep detection={detection} draft={draft} /> : null}
                  {step === 1 ? <ProjectsStep detection={detection} draft={draft} onChange={setDraft} /> : null}
                  {step === 2 ? <NotesStep detection={detection} draft={draft} onChange={setDraft} /> : null}
                  {step === 3 ? <DevicesStep detection={detection} draft={draft} onChange={setDraft} /> : null}
                  {step === 4 ? <FinishStep draft={draft} onChange={setDraft} onJump={setStep} /> : null}
                </motion.div>
              </AnimatePresence>
            ) : null}
          </div>
        </div>

        <footer className="flex shrink-0 items-center gap-3 border-t border-line/70 bg-canvas/60 px-10 py-4 max-md:px-6">
          <p className="num text-xs text-ink-3 md:hidden">
            Schritt {step + 1} von {STEPS.length}
          </p>
          <div className="flex-1" />
          {step > 0 ? (
            <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              Zurück
            </Button>
          ) : null}
          {step === 2 || step === 3 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s + 1)}>
              Überspringen
            </Button>
          ) : null}
          <Button variant="primary" icon={step === LAST ? Check : ArrowRight} loading={finishing} disabled={!draft || !canContinue} onClick={next}>
            {step === 0 ? 'Einrichten' : step === LAST ? 'Einrichtung abschließen' : 'Weiter'}
          </Button>
        </footer>
      </main>
    </div>
  )
}
