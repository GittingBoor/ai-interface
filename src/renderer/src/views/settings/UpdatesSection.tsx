import { ArrowDownToLine, RefreshCw } from 'lucide-react'
import type { Settings, UpdateMode, UpdatePhase, UpdateState } from '@shared/types'
import { Button } from '@renderer/components/Button'
import { BrandSpinner } from '@renderer/components/BrandSpinner'
import { Field, Segmented } from '@renderer/components/Controls'
import { useSettings } from '@renderer/stores/settingsStore'
import { useUpdate } from '@renderer/stores/updateStore'
import { notify } from '@renderer/stores/toastStore'
import { localized } from '@renderer/i18n/activeLocale'
import { currentT, useT } from '@renderer/i18n/useT'

const PHASE_TONE: Readonly<Partial<Record<UpdatePhase, string>>> = {
  'up-to-date': 'text-status-idle',
  available: 'text-accent-text',
  failed: 'text-danger-ink',
  skipped: 'text-warn'
}

const BUSY_PHASES: ReadonlySet<UpdatePhase> = new Set<UpdatePhase>(['checking', 'building', 'installing'])

const CHECKED_AT_FORMAT = localized((tag) => new Intl.DateTimeFormat(tag, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }))

function StatusList({ state }: { readonly state: UpdateState }): React.JSX.Element {
  const u = useT().settings.updates
  const busy = BUSY_PHASES.has(state.phase)
  const showDetail = state.detail !== null && (state.phase === 'skipped' || state.phase === 'failed')
  return (
    <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-y-2 text-xs" aria-live="polite">
      <dt className="text-ink-3">{u.status}</dt>
      <dd className={`flex items-center gap-1.5 font-[560] ${PHASE_TONE[state.phase] ?? 'text-ink-2'}`}>
        {busy ? <BrandSpinner className="size-3.5 text-accent" /> : null}
        {u.phases[state.phase]}
      </dd>
      {showDetail ? (
        <>
          <dt className="text-ink-3">{state.phase === 'failed' ? u.error : u.reason}</dt>
          <dd className="leading-relaxed break-words text-ink-2">{state.detail}</dd>
        </>
      ) : null}
      <dt className="text-ink-3">{u.lastChecked}</dt>
      <dd className="num text-ink-2">{state.checkedAt ? CHECKED_AT_FORMAT().format(state.checkedAt) : u.never}</dd>
    </dl>
  )
}

export function UpdatesSection({ settings }: { readonly settings: Settings }): React.JSX.Element {
  const t = useT()
  const u = t.settings.updates
  const modeOptions: readonly { readonly value: UpdateMode; readonly label: string }[] = [
    { value: 'manual', label: u.modeManual },
    { value: 'auto', label: u.modeAuto }
  ]
  const update = useSettings((s) => s.update)
  const state = useUpdate((s) => s.state)
  const checking = useUpdate((s) => s.checking)
  const check = useUpdate((s) => s.check)
  const install = useUpdate((s) => s.install)
  const unsupported = state?.phase === 'unsupported'
  const busy = state !== null && BUSY_PHASES.has(state.phase)

  const setMode = async (updateMode: UpdateMode): Promise<void> => {
    if (await update({ updateMode })) notify.success(updateMode === 'manual' ? currentT().settings.updates.savedManual : currentT().settings.updates.savedAuto)
  }

  return (
    <div>
      <Field label={u.modeLabel} hint={settings.updateMode === 'manual' ? u.hintManual(t.frame.update.available) : u.hintAuto}>
        {() => <Segmented<UpdateMode> label={u.modeLabel} value={settings.updateMode} onChange={(v) => void setMode(v)} options={modeOptions} />}
      </Field>
      <div className="mt-5 border-t border-line pt-4">
        {unsupported ? <p className="mb-4 text-xs leading-relaxed text-ink-3">{u.unsupportedNote}</p> : null}
        {state && !unsupported ? <StatusList state={state} /> : null}
        <div className={`flex gap-2 ${unsupported ? '' : 'mt-5'}`}>
          <Button size="sm" icon={RefreshCw} loading={checking} disabled={unsupported || busy || state === null} onClick={() => void check()}>
            {u.checkNow}
          </Button>
          {state?.phase === 'available' ? (
            <Button size="sm" variant="primary" icon={ArrowDownToLine} onClick={() => void install()}>
              {u.install}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
