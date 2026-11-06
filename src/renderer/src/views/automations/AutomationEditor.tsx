import { useId, useMemo } from 'react'
import { modelOptions } from '@shared/agents'
import { MIN_INTERVAL_MINUTES, permissionChoices, validateAutomation, WEEKDAY_ORDER, type AutomationInput, type AutomationSchedule } from '@shared/automations'
import { Button } from '@renderer/components/Button'
import { Field, Segmented, Switch } from '@renderer/components/Controls'
import { Modal } from '@renderer/components/Modal'
import { hostLabel, useHostIds } from '@renderer/lib/hosts'
import { useT } from '@renderer/i18n/useT'
import { useAutomations } from '@renderer/stores/automationsStore'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useSkills } from '@renderer/stores/skillsStore'

type ScheduleKind = AutomationSchedule['kind']
type IntervalUnit = 'min' | 'h'
const HOUR_MINUTES = 60
const OTHER_FOLDER = '__other__'
const WORKDAYS = [1, 2, 3, 4, 5]
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

function defaultSchedule(kind: ScheduleKind): AutomationSchedule {
  if (kind === 'manual') return { kind }
  if (kind === 'interval') return { kind, minutes: HOUR_MINUTES }
  return { kind, time: '08:00', weekdays: WORKDAYS }
}

export function AutomationEditor(): React.JSX.Element {
  const t = useT().automations.editor
  const editor = useAutomations((s) => s.editor)
  const close = useAutomations((s) => s.closeEditor)
  return (
    <Modal open={editor !== null} label={editor?.id === null ? t.newTitle : t.editTitle} onClose={close} className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-line-strong/70 bg-base shadow-[0_24px_64px_-12px_oklch(0_0_0/0.6)]">
      {editor ? <EditorBody isNew={editor.id === null} input={editor.input} /> : null}
    </Modal>
  )
}

function EditorBody({ isNew, input }: { readonly isNew: boolean; readonly input: AutomationInput }): React.JSX.Element {
  const text = useT().automations
  const t = text.editor
  const patch = useAutomations((s) => s.patchEditor)
  const saving = useAutomations((s) => s.saving)
  const problem = validateAutomation(input, text)
  return (
    <>
      <header className="border-b border-line px-6 pt-5 pb-4">
        <h2 className="text-[1.0625rem] font-[640] text-ink">{isNew ? t.newTitle : t.editTitle}</h2>
        <p className="mt-0.5 text-xs text-ink-3">{t.subtitle}</p>
      </header>
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <Field label={t.name}>{(id) => <input id={id} data-autofocus value={input.name} onChange={(e) => patch({ name: e.target.value })} placeholder={t.namePlaceholder} className="field" />}</Field>
        <WhoWhere input={input} />
        <Field label={t.job} hint={t.jobHint}>
          {(id, describedBy) => (
            <textarea
              id={id}
              aria-describedby={describedBy}
              rows={4}
              value={input.prompt}
              onChange={(e) => patch({ prompt: e.target.value })}
              placeholder={t.jobPlaceholder}
              className="field h-auto resize-y py-2 leading-relaxed"
            />
          )}
        </Field>
        <ScheduleFields schedule={input.schedule} />
        <Rights input={input} />
        <div className="space-y-4 border-t border-line pt-5">
          <Switch checked={input.notify} label={t.notify} description={t.notifyDescription} onChange={(notify) => patch({ notify })} />
          <Switch checked={input.enabled} label={t.enabled} description={t.enabledDescription} onChange={(enabled) => patch({ enabled })} />
        </div>
      </div>
      <footer className="flex items-center gap-3 border-t border-line px-6 py-3.5">
        <p className="min-w-0 flex-1 truncate text-xs text-ink-3" role="status">
          {problem ?? t.ready}
        </p>
        <Button variant="ghost" onClick={() => useAutomations.getState().closeEditor()}>
          {t.cancel}
        </Button>
        <Button variant="primary" loading={saving} disabled={problem !== null} onClick={() => void useAutomations.getState().save()}>
          {isNew ? t.create : t.save}
        </Button>
      </footer>
    </>
  )
}

function WhoWhere({ input }: { readonly input: AutomationInput }): React.JSX.Element {
  const t = useT().automations.editor
  const patch = useAutomations((s) => s.patchEditor)
  const hosts = useHostIds()
  const entries = useSkills((s) => s.entries)
  const favorites = useFavorites((s) => s.favorites)
  const agents = useMemo(() => entries.filter((e) => e.kind === 'agent' && e.host === input.host).sort((a, b) => a.name.localeCompare(b.name, 'de-DE')), [entries, input.host])
  const projects = favorites.filter((f) => f.host === input.host)
  const knownFolder = projects.some((p) => p.path === input.cwd)
  const folderValue = input.cwd === '' ? '' : knownFolder ? input.cwd : OTHER_FOLDER
  const agentMissing = input.agent !== null && !agents.some((a) => a.name === input.agent)
  return (
    <div className="space-y-5">
      {hosts.length > 1 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-[560] text-ink-2">{t.host}</span>
          <Segmented label={t.host} value={input.host} options={hosts.map((h) => ({ value: h, label: hostLabel(h) }))} onChange={(host) => patch({ host, cwd: '' })} />
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <Field label={t.agent} error={agentMissing && input.agent ? t.agentMissingError(input.agent, hostLabel(input.host)) : null} hint={t.agentHint}>
          {(id, describedBy) => (
            <select id={id} aria-describedby={describedBy} value={input.agent ?? ''} onChange={(e) => patch({ agent: e.target.value || null })} className="field">
              <option value="">{t.noAgentOption}</option>
              {agentMissing && input.agent ? <option value={input.agent}>{input.agent} {t.missingSuffix}</option> : null}
              {agents.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                  {a.project ? ` · ${a.project}` : ''}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={t.project}>
          {(id) => (
            <select id={id} value={folderValue} onChange={(e) => patch({ cwd: e.target.value === OTHER_FOLDER ? ' ' : e.target.value })} className="field">
              <option value="">{t.chooseProject}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.path}>
                  {p.name}
                </option>
              ))}
              <option value={OTHER_FOLDER}>{t.otherFolder}</option>
            </select>
          )}
        </Field>
      </div>
      {folderValue === OTHER_FOLDER ? (
        <Field label={t.folder}>{(id) => <input id={id} value={input.cwd.trim()} onChange={(e) => patch({ cwd: e.target.value || ' ' })} placeholder={input.host === 'local' ? 'D:\\Projekte\\demo' : '/home/user/projects/demo'} className="field font-mono text-xs" />}</Field>
      ) : null}
    </div>
  )
}

function ScheduleFields({ schedule }: { readonly schedule: AutomationSchedule }): React.JSX.Element {
  const text = useT().automations
  const t = text.editor
  const kindOptions: readonly { readonly value: ScheduleKind; readonly label: string }[] = [
    { value: 'daily', label: t.kindDaily },
    { value: 'interval', label: t.kindInterval },
    { value: 'manual', label: t.kindManual }
  ]
  const patch = useAutomations((s) => s.patchEditor)
  const set = (next: AutomationSchedule): void => patch({ schedule: next })
  const timeId = useId()
  const everyId = useId()
  return (
    <div className="border-t border-line pt-5">
      <fieldset className="space-y-3">
        <legend className="mb-2 text-xs font-[560] text-ink-2">{t.when}</legend>
        <Segmented label={t.scheduleKind} value={schedule.kind} options={kindOptions} onChange={(kind) => set(defaultSchedule(kind))} />
        {schedule.kind === 'daily' ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <label htmlFor={timeId} className="flex items-center gap-2 text-xs text-ink-2">
              {t.at}
              <input id={timeId} type="time" value={schedule.time} onChange={(e) => set({ ...schedule, time: e.target.value })} className="field num w-28" />
            </label>
            <div className="flex items-center gap-1" role="group" aria-label={t.weekdaysAria}>
              {WEEKDAY_ORDER.map((day) => {
                const on = schedule.weekdays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set({ ...schedule, weekdays: on ? schedule.weekdays.filter((d) => d !== day) : [...schedule.weekdays, day] })}
                    className={`size-8 rounded-md border text-xs font-[600] transition-colors ${on ? 'border-accent/50 bg-accent-soft text-accent-text' : 'border-line text-ink-3 hover:text-ink-2'}`}
                  >
                    {text.weekdaysShort[day]}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => set({ ...schedule, weekdays: WORKDAYS })}>
                {t.workdays}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => set({ ...schedule, weekdays: ALL_DAYS })}>
                {t.everyDay}
              </Button>
            </div>
          </div>
        ) : null}
        {schedule.kind === 'interval' ? <IntervalFields minutes={schedule.minutes} id={everyId} onChange={(minutes) => set({ kind: 'interval', minutes })} /> : null}
        {schedule.kind === 'manual' ? <p className="text-xs text-ink-3">{t.manualNote}</p> : null}
      </fieldset>
    </div>
  )
}

function IntervalFields({ minutes, id, onChange }: { readonly minutes: number; readonly id: string; readonly onChange: (minutes: number) => void }): React.JSX.Element {
  const t = useT().automations.editor
  const unit: IntervalUnit = minutes % HOUR_MINUTES === 0 ? 'h' : 'min'
  const amount = unit === 'h' ? minutes / HOUR_MINUTES : minutes
  return (
    <div className="flex items-center gap-2 text-xs text-ink-2">
      <label htmlFor={id}>{t.every}</label>
      <input id={id} type="number" min={1} value={amount} onChange={(e) => onChange(Math.max(1, Math.round(Number(e.target.value) || 1)) * (unit === 'h' ? HOUR_MINUTES : 1))} className="field num w-20" />
      <select aria-label={t.unit} value={unit} onChange={(e) => onChange(e.target.value === 'h' ? Math.max(1, Math.round(minutes / HOUR_MINUTES)) * HOUR_MINUTES : minutes)} className="field w-28">
        <option value="min">{t.unitMinutes}</option>
        <option value="h">{t.unitHours}</option>
      </select>
      <span className="text-2xs text-ink-3">{t.atLeast(MIN_INTERVAL_MINUTES)}</span>
    </div>
  )
}

function Rights({ input }: { readonly input: AutomationInput }): React.JSX.Element {
  const text = useT()
  const t = text.automations.editor
  const agents = text.agents
  const patch = useAutomations((s) => s.patchEditor)
  const timeoutId = useId()
  return (
    <div className="border-t border-line pt-5">
      <fieldset className="space-y-4">
        <legend className="mb-2 text-xs font-[560] text-ink-2">{t.rightsLegend}</legend>
        <div role="radiogroup" aria-label={t.rightsAria} className="grid grid-cols-2 gap-1.5 max-md:grid-cols-1">
          {permissionChoices(text.automations).map((p) => {
            const active = p.value === input.permission
            return (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => patch({ permission: p.value })}
                className={`flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors ${active ? (p.value === 'bypassPermissions' ? 'border-danger/50 bg-danger-soft' : 'border-accent/50 bg-accent-soft/70') : 'border-line bg-canvas hover:border-line-strong'}`}
              >
                <span className={`text-[0.8125rem] font-[600] ${active ? (p.value === 'bypassPermissions' ? 'text-danger-ink' : 'text-accent-text') : 'text-ink'}`}>{p.label}</span>
                <span className="text-2xs leading-snug text-ink-3">{p.explain}</span>
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          <Field label={t.model} hint={t.modelHint}>
            {(id, describedBy) => (
              <select id={id} aria-describedby={describedBy} value={input.model ?? ''} onChange={(e) => patch({ model: e.target.value || null })} className="field">
                <option value="">{t.modelAsAgent}</option>
                {modelOptions(agents).filter((m) => m.value !== 'inherit').map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={timeoutId} className="text-xs font-[560] text-ink-2">
              {t.timeout}
            </label>
            <input id={timeoutId} type="number" min={1} max={240} value={input.timeoutMinutes} onChange={(e) => patch({ timeoutMinutes: Math.round(Number(e.target.value) || 0) })} className="field num" />
            <p className="text-2xs text-ink-3">{t.timeoutHint}</p>
          </div>
        </div>
      </fieldset>
    </div>
  )
}
