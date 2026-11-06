import { useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bot, CalendarClock, CircleCheck, CircleSlash, CircleX, MousePointerClick, Pencil, Play, Plus, SquareTerminal, Trash2, Workflow } from 'lucide-react'
import { describeSchedule, permissionChoices, type Automation, type AutomationRun, type AutomationRunStatus, type AutomationsText } from '@shared/automations'
import { Button, IconButton } from '@renderer/components/Button'
import { HostBadge } from '@renderer/components/Host'
import { ViewHeader } from '@renderer/components/Section'
import { EmptyState, SkeletonRows } from '@renderer/components/States'
import { BrandSpinner } from '@renderer/components/BrandSpinner'
import { baseName, formatDateTime, formatDuration, formatRelative, formatUsd } from '@renderer/lib/format'
import { renderMarkdown } from '@renderer/lib/markdown'
import { useInterval } from '@renderer/lib/hooks'
import { useT } from '@renderer/i18n/useT'
import { useAutomations } from '@renderer/stores/automationsStore'
import { useAgents } from '@renderer/stores/agentsStore'
import { useNav } from '@renderer/stores/navStore'
import { useSkills } from '@renderer/stores/skillsStore'
import { useTerminals } from '@renderer/stores/terminalStore'
import { AutomationEditor } from './AutomationEditor'

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const
/** Relative Zeiten („in 12 Min.“) frisch halten. */
const CLOCK_MS = 30_000
const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

/** Zeit bis zu einem künftigen Zeitpunkt: „in 12 Min.“, „in 3 Std.“, sonst Datum. */
function formatIn(timestamp: number, t: AutomationsText, now: number = Date.now()): string {
  const diff = timestamp - now
  if (diff < MINUTE_MS) return t.formatIn.underMinute
  if (diff < HOUR_MS) return t.formatIn.minutes(Math.round(diff / MINUTE_MS))
  if (diff < DAY_MS) return t.formatIn.hours(Math.round(diff / HOUR_MS))
  return formatDateTime(timestamp)
}

const STATUS_CLASS: Readonly<Record<AutomationRunStatus, string>> = {
  running: 'text-accent-text',
  success: 'text-[var(--color-status-idle)]',
  error: 'text-danger-ink',
  skipped: 'text-ink-3'
}

function StatusIcon({ status }: { readonly status: AutomationRunStatus }): React.JSX.Element {
  const label = useT().automations.status[status]
  const cls = `size-3.5 shrink-0 ${STATUS_CLASS[status]}`
  if (status === 'running') return <BrandSpinner />
  if (status === 'success') return <CircleCheck className={cls} aria-label={label} strokeWidth={2} />
  if (status === 'error') return <CircleX className={cls} aria-label={label} strokeWidth={2} />
  return <CircleSlash className={cls} aria-label={label} strokeWidth={2} />
}

export function AutomationsView(): React.JSX.Element {
  const t = useT().automations
  const items = useAutomations((s) => s.items)
  const loaded = useAutomations((s) => s.loaded)
  const selectedId = useAutomations((s) => s.selectedId)
  const selected = items.find((a) => a.id === selectedId) ?? null
  const running = items.filter((a) => a.running).length

  useEffect(() => {
    void useAutomations.getState().load()
    if (!useSkills.getState().loaded) void useSkills.getState().load()
  }, [])
  // Läufe bringen Ereignisse mit; dieser Takt hält nur die relativen Zeiten aktuell.
  useInterval(() => useAutomations.setState((s) => ({ items: [...s.items] })), CLOCK_MS)

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={t.title}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => useAutomations.getState().openEditor(null)}>
            {t.newAutomation}
          </Button>
        }
      >
        {loaded && items.length ? t.subtitle(items.filter((a) => a.enabled && a.schedule.kind !== 'manual').length, running) : t.subtitleIdle}
      </ViewHeader>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto px-8 pb-10 max-lg:px-5">
          {!loaded ? <SkeletonRows rows={4} /> : null}
          {loaded && items.length === 0 ? <Empty /> : null}
          {items.length > 0 ? <AutomationList items={items} selectedId={selectedId} /> : null}
        </div>
        <aside aria-label={t.detailsAria} className="w-[29rem] shrink-0 overflow-y-auto border-l border-line/70 px-6 pb-10 max-[1280px]:w-[24rem] max-lg:w-[20rem] max-lg:px-5">
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: EASE_OUT_EXPO }} className="pt-1">
                <AutomationDetail automation={selected} />
              </motion.div>
            ) : (
              <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState icon={MousePointerClick} title={t.pickTitle} compact>
                  {t.pickBody}
                </EmptyState>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
      <AutomationEditor />
    </div>
  )
}

function Empty(): React.JSX.Element {
  const t = useT().automations
  return (
    <div className="mx-auto max-w-2xl pt-6">
      <EmptyState
        icon={Workflow}
        title={t.emptyTitle}
        action={
          <Button variant="primary" icon={Plus} onClick={() => useAutomations.getState().openEditor(null)}>
            {t.emptyAction}
          </Button>
        }
      >
        {t.emptyBody}
      </EmptyState>
    </div>
  )
}

function AutomationList({ items, selectedId }: { readonly items: readonly Automation[]; readonly selectedId: number | null }): React.JSX.Element {
  const sorted = useMemo(() => [...items].sort((a, b) => Number(b.enabled) - Number(a.enabled) || (a.nextRunAt ?? Infinity) - (b.nextRunAt ?? Infinity) || a.name.localeCompare(b.name, 'de-DE')), [items])
  return (
    <ul className="divide-y divide-line border-y border-line">
      {sorted.map((a) => (
        <li key={a.id}>
          <Row automation={a} active={a.id === selectedId} />
        </li>
      ))}
    </ul>
  )
}

function Row({ automation: a, active }: { readonly automation: Automation; readonly active: boolean }): React.JSX.Element {
  const t = useT().automations
  const store = useAutomations.getState()
  return (
    <div className={`group flex items-center gap-3 px-2 py-3 transition-colors ${active ? 'bg-accent-soft/50' : 'hover:bg-raised/60'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={a.enabled}
        aria-label={a.enabled ? t.switchOff(a.name) : t.switchOn(a.name)}
        onClick={() => void store.toggle(a)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${a.enabled ? 'bg-accent' : 'bg-line-strong'}`}
      >
        <span className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-ink shadow-[0_1px_2px_oklch(0_0_0/0.4)] transition-transform duration-200 ${a.enabled ? 'translate-x-4' : ''}`} />
      </button>
      <button type="button" aria-pressed={active} onClick={() => store.select(a.id)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[0.8125rem] font-[620] ${a.enabled ? 'text-ink' : 'text-ink-3'}`}>{a.name}</span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-3">
            <Bot className="size-3.5 shrink-0" aria-hidden strokeWidth={1.75} />
            <span className="truncate">{a.agent ?? t.noAgent}</span>
            <span aria-hidden>·</span>
            <span className="truncate font-mono text-2xs">{baseName(a.cwd)}</span>
            <HostBadge host={a.host} subtle />
          </span>
        </span>
        <span className="w-44 shrink-0 text-right max-xl:w-32">
          <span className="flex items-center justify-end gap-1.5 text-xs text-ink-2">
            <CalendarClock className="size-3.5 text-ink-3" aria-hidden strokeWidth={1.75} />
            {describeSchedule(a.schedule, t)}
          </span>
          <span className="num mt-0.5 block text-2xs text-ink-3">{nextText(a, t)}</span>
        </span>
        <span className="flex w-28 shrink-0 items-center justify-end gap-1.5 text-xs max-xl:hidden">
          {a.lastRun ? (
            <>
              <StatusIcon status={a.lastRun.status} />
              <span className={STATUS_CLASS[a.lastRun.status]}>{a.running ? t.status.running : formatRelative(a.lastRun.startedAt)}</span>
            </>
          ) : (
            <span className="text-ink-3">{t.never}</span>
          )}
        </span>
      </button>
      <IconButton size="sm" icon={Play} label={t.runNowFor(a.name)} disabled={a.running} onClick={() => void store.runNow(a.id)} />
    </div>
  )
}

function nextText(a: Automation, t: AutomationsText): string {
  if (a.running) return t.next.running
  if (!a.enabled) return t.next.off
  if (a.nextRunAt === null) return t.next.manual
  const diff = a.nextRunAt - Date.now()
  return diff <= 0 ? t.next.soon : t.next.at(formatIn(a.nextRunAt, t))
}

function AutomationDetail({ automation: a }: { readonly automation: Automation }): React.JSX.Element {
  const t = useT().automations
  const d = t.detail
  const runs = useAutomations((s) => s.runs)
  const selectedRunId = useAutomations((s) => s.selectedRunId)
  const agents = useSkills((s) => s.entries)
  const agentEntry = agents.find((e) => e.kind === 'agent' && e.name === a.agent && e.host === a.host)
  const permission = permissionChoices(t).find((p) => p.value === a.permission)
  const run = runs.find((r) => r.id === selectedRunId) ?? runs[0] ?? null
  const store = useAutomations.getState()
  const openAgent = (): void => {
    if (!agentEntry) return
    useAgents.getState().select(agentEntry.id)
    useNav.getState().go('agents')
  }
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[1.125rem] font-[650] tracking-[-0.012em] text-ink">{a.name}</h2>
        <p className="mt-0.5 text-xs text-ink-3">
          {a.enabled ? describeSchedule(a.schedule, t) : d.off} · {nextText(a, t)}
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Button size="sm" variant="primary" icon={Play} loading={a.running} onClick={() => void store.runNow(a.id)}>
            {a.running ? d.running : d.runNow}
          </Button>
          <Button size="sm" icon={Pencil} onClick={() => store.openEditor(a.id)}>
            {d.edit}
          </Button>
          <IconButton size="sm" tone="danger" icon={Trash2} label={d.delete} className="ml-auto" onClick={() => void store.remove(a)} />
        </div>
      </div>

      <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-2.5 border-y border-line py-3.5 text-xs">
        <dt className="text-ink-3">{d.agent}</dt>
        <dd className="min-w-0">
          {a.agent ? (
            agentEntry ? (
              <button type="button" onClick={openAgent} className="font-[580] text-ink hover:text-accent-text hover:underline hover:underline-offset-4">
                {a.agent}
              </button>
            ) : (
              <span className="text-warn">{d.agentNotFound(a.agent)}</span>
            )
          ) : (
            <span className="text-ink-2">{t.noAgent}</span>
          )}
        </dd>
        <dt className="text-ink-3">{d.host}</dt>
        <dd>
          <HostBadge host={a.host} />
        </dd>
        <dt className="text-ink-3">{d.folder}</dt>
        <dd className="truncate font-mono text-2xs text-ink-2" title={a.cwd}>
          {a.cwd}
        </dd>
        <dt className="text-ink-3">{d.rights}</dt>
        <dd className="text-ink-2">{permission ? `${permission.label}: ${permission.explain}` : a.permission}</dd>
        <dt className="text-ink-3">{d.model}</dt>
        <dd className="text-ink-2">{a.model ?? d.modelAsAgent}</dd>
        <dt className="text-ink-3">{d.timeout}</dt>
        <dd className="num text-ink-2">{d.minutes(a.timeoutMinutes)}</dd>
      </dl>

      <section aria-label={d.job}>
        <h3 className="mb-2 text-xs font-[620] text-ink-2">{d.job}</h3>
        <p className="text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-ink">{a.prompt}</p>
      </section>

      <section aria-label={d.history}>
        <h3 className="mb-2 flex items-baseline gap-1.5 text-xs font-[620] text-ink-2">
          {d.history} {runs.length ? <span className="num font-[500] text-ink-3">{runs.length}</span> : null}
        </h3>
        {runs.length === 0 ? (
          <p className="text-xs text-ink-3">{d.noRuns}</p>
        ) : (
          <ul className="max-h-56 space-y-px overflow-y-auto">
            {runs.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  aria-pressed={r.id === run?.id}
                  onClick={() => store.selectRun(r.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${r.id === run?.id ? 'bg-raised-2' : 'hover:bg-raised'}`}
                >
                  <StatusIcon status={r.status} />
                  <span className="num flex-1 text-ink-2">{formatDateTime(r.startedAt)}</span>
                  <span className="text-2xs text-ink-3">{r.trigger === 'manual' ? d.triggerManual : d.triggerSchedule}</span>
                  <span className="num w-14 text-right text-2xs text-ink-3">{r.finishedAt ? formatDuration(r.finishedAt - r.startedAt) : '…'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {run ? <RunResult run={run} automation={a} /> : null}
    </div>
  )
}

function RunResult({ run, automation }: { readonly run: AutomationRun; readonly automation: Automation }): React.JSX.Element {
  const t = useT().automations
  const d = t.detail
  const html = useMemo(() => (run.result ? renderMarkdown(run.result) : ''), [run.result])
  const resume = (): void => {
    if (run.sessionId) void useTerminals.getState().launch({ host: automation.host, path: automation.cwd, name: automation.name }, 'resume', automation.name, run.sessionId)
  }
  return (
    <section aria-label={d.result} className="border-t border-line pt-4">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="flex-1 text-xs font-[620] text-ink-2">
          {d.result} <span className={`font-[500] ${STATUS_CLASS[run.status]}`}>· {t.status[run.status]}</span>
        </h3>
        {run.sessionId ? (
          <Button size="sm" variant="ghost" icon={SquareTerminal} onClick={resume}>
            {d.resume}
          </Button>
        ) : null}
      </div>
      <p className="num mb-3 flex flex-wrap gap-x-3 text-2xs text-ink-3">
        <span>{formatDateTime(run.startedAt)}</span>
        {run.finishedAt ? <span>{formatDuration(run.finishedAt - run.startedAt)}</span> : null}
        {run.turns !== null ? <span>{d.turns(run.turns)}</span> : null}
        {run.costUsd !== null ? <span title={d.costTitle}>≈ {formatUsd(run.costUsd)}</span> : null}
      </p>
      {run.status === 'running' ? (
        <p className="flex items-center gap-2 text-xs text-ink-3">
          <BrandSpinner /> {d.working}
        </p>
      ) : null}
      {run.error ? <p className="mb-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs leading-relaxed text-danger-ink">{run.error}</p> : null}
      {run.status === 'skipped' ? <p className="text-xs text-ink-3">{run.result}</p> : null}
      {html && run.status !== 'skipped' ? <div className="prose-log agent-prompt rounded-lg border border-line bg-canvas px-4 py-3" dangerouslySetInnerHTML={{ __html: html }} /> : null}
    </section>
  )
}
