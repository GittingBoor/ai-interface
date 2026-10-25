import { ArrowDownToLine, RefreshCw } from 'lucide-react'
import type { Settings, UpdateMode, UpdatePhase, UpdateState } from '@shared/types'
import { Button } from '@renderer/components/Button'
import { BrandSpinner } from '@renderer/components/BrandSpinner'
import { Field, Segmented } from '@renderer/components/Controls'
import { useSettings } from '@renderer/stores/settingsStore'
import { useUpdate } from '@renderer/stores/updateStore'
import { notify } from '@renderer/stores/toastStore'

const MODE_OPTIONS: readonly { readonly value: UpdateMode; readonly label: string }[] = [
  { value: 'manual', label: 'Manuell – Hinweis mit Knopf' },
  { value: 'auto', label: 'Automatisch beim Anmelden' }
]

const MODE_HINT: Readonly<Record<UpdateMode, string>> = {
  manual: 'Gibt es einen neuen Stand, erscheint in der Seitenleiste „Update verfügbar“. Installiert wird erst nach deinem Klick.',
  auto: 'Beim Anmelden wird ein neuer Stand ohne Nachfrage gebaut und installiert; die App startet danach neu.'
}

const MODE_SAVED: Readonly<Record<UpdateMode, string>> = {
  manual: 'Updates kommen als Hinweis mit Knopf.',
  auto: 'Updates werden beim Anmelden automatisch installiert.'
}

const PHASE_LABEL: Readonly<Record<UpdatePhase, string>> = {
  unsupported: 'Nicht verfügbar',
  idle: 'Noch nicht geprüft',
  checking: 'Wird geprüft …',
  'up-to-date': 'Aktuell',
  available: 'Neuer Stand verfügbar',
  skipped: 'Übersprungen',
  building: 'Wird gebaut …',
  installing: 'Wird installiert, App startet neu',
  failed: 'Fehlgeschlagen'
}

const PHASE_TONE: Readonly<Partial<Record<UpdatePhase, string>>> = {
  'up-to-date': 'text-status-idle',
  available: 'text-accent-text',
  failed: 'text-danger-ink',
  skipped: 'text-warn'
}

const BUSY_PHASES: ReadonlySet<UpdatePhase> = new Set<UpdatePhase>(['checking', 'building', 'installing'])

const CHECKED_AT_FORMAT = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

function StatusList({ state }: { readonly state: UpdateState }): React.JSX.Element {
  const busy = BUSY_PHASES.has(state.phase)
  const showDetail = state.detail !== null && (state.phase === 'skipped' || state.phase === 'failed')
  return (
    <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-y-2 text-xs" aria-live="polite">
      <dt className="text-ink-3">Status</dt>
      <dd className={`flex items-center gap-1.5 font-[560] ${PHASE_TONE[state.phase] ?? 'text-ink-2'}`}>
        {busy ? <BrandSpinner className="size-3.5 text-accent" /> : null}
        {PHASE_LABEL[state.phase]}
      </dd>
      {showDetail ? (
        <>
          <dt className="text-ink-3">{state.phase === 'failed' ? 'Fehler' : 'Grund'}</dt>
          <dd className="leading-relaxed break-words text-ink-2">{state.detail}</dd>
        </>
      ) : null}
      <dt className="text-ink-3">Zuletzt geprüft</dt>
      <dd className="num text-ink-2">{state.checkedAt ? CHECKED_AT_FORMAT.format(state.checkedAt) : 'noch nie'}</dd>
    </dl>
  )
}

export function UpdatesSection({ settings }: { readonly settings: Settings }): React.JSX.Element {
  const update = useSettings((s) => s.update)
  const state = useUpdate((s) => s.state)
  const checking = useUpdate((s) => s.checking)
  const check = useUpdate((s) => s.check)
  const install = useUpdate((s) => s.install)
  const unsupported = state?.phase === 'unsupported'
  const busy = state !== null && BUSY_PHASES.has(state.phase)

  const setMode = async (updateMode: UpdateMode): Promise<void> => {
    if (await update({ updateMode })) notify.success(MODE_SAVED[updateMode])
  }

  return (
    <div>
      <Field label="Updates einspielen" hint={MODE_HINT[settings.updateMode]}>
        {() => <Segmented<UpdateMode> label="Updates einspielen" value={settings.updateMode} onChange={(v) => void setMode(v)} options={MODE_OPTIONS} />}
      </Field>
      <div className="mt-5 border-t border-line pt-4">
        {unsupported ? <p className="mb-4 text-xs leading-relaxed text-ink-3">Nur in der installierten Windows-App verfügbar.</p> : null}
        {state && !unsupported ? <StatusList state={state} /> : null}
        <div className={`flex gap-2 ${unsupported ? '' : 'mt-5'}`}>
          <Button size="sm" icon={RefreshCw} loading={checking} disabled={unsupported || busy || state === null} onClick={() => void check()}>
            Jetzt prüfen
          </Button>
          {state?.phase === 'available' ? (
            <Button size="sm" variant="primary" icon={ArrowDownToLine} onClick={() => void install()}>
              Aktualisieren
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
