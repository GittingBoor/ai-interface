import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, Copy, FolderOpen, Info, Lightbulb, Pencil, Play, Sparkles, Trash2, WandSparkles, Workflow } from 'lucide-react'
import { isProactive, toolInfo, type AgentDefinition, type AgentsText, type LintFinding } from '@shared/agents'
import { lintAgent, lintScore } from '@shared/agentLint'
import { describeSchedule } from '@shared/automations'
import type { SkillEntry } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt } from '@renderer/api/call'
import { Button, IconButton } from '@renderer/components/Button'
import { HostBadge } from '@renderer/components/Host'
import { ErrorState, Skeleton } from '@renderer/components/States'
import { settingRows } from '@renderer/lib/agents'
import { renderMarkdown } from '@renderer/lib/markdown'
import { useT } from '@renderer/i18n/useT'
import { useAgents } from '@renderer/stores/agentsStore'
import { useAutomations } from '@renderer/stores/automationsStore'
import { useNav } from '@renderer/stores/navStore'
import { useSkills } from '@renderer/stores/skillsStore'
import { AgentSigil, Chip, DetailHeading } from './agentMarks'
import { Rich } from './Rich'

const PROMPT_PREVIEW_CHARS = 1_400

function originText(entry: SkillEntry, t: AgentsText): string {
  if (entry.scope === 'plugin' && entry.plugin) return t.detail.pluginOrigin(entry.plugin)
  if (entry.scope === 'project' && entry.project) return t.detail.projectOrigin(entry.project)
  return t.detail.origin[entry.scope] ?? entry.scope
}

export function AgentDetail({ entry }: { readonly entry: SkillEntry }): React.JSX.Element {
  const doc = useAgents((s) => s.doc)
  const docLoading = useAgents((s) => s.docLoading)
  const docError = useAgents((s) => s.docError)
  const definition = doc && doc.path === entry.path ? doc.definition : null
  return (
    <div className="flex flex-col gap-7">
      <Head entry={entry} readOnly={doc?.readOnly ?? entry.scope === 'plugin'} />
      <Summary entry={entry} />
      {docError ? <ErrorState message={docError} onRetry={() => useAgents.getState().select(entry.id)} /> : null}
      {!definition && docLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-40" />
        </div>
      ) : null}
      {definition ? (
        <>
          <WhenUsed entry={entry} definition={definition} />
          <Settings definition={definition} />
          <Tools definition={definition} />
          <Skills entry={entry} />
          <Automations entry={entry} />
          <Quality definition={definition} />
          <Instructions definition={definition} />
          <FileInfo entry={entry} preserved={doc?.preservedKeys ?? []} />
        </>
      ) : null}
    </div>
  )
}

function Head({ entry, readOnly }: { readonly entry: SkillEntry; readonly readOnly: boolean }): React.JSX.Element {
  const t = useT().agents
  const automate = (): void => {
    useAutomations.getState().openEditor(null, { name: entry.name, agent: entry.name, host: entry.host })
    useNav.getState().go('automations')
  }
  return (
    <div>
      <div className="flex items-start gap-3">
        <AgentSigil color={entry.color} size="lg" />
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="truncate text-[1.125rem] font-[650] tracking-[-0.012em] text-ink" title={entry.name}>
            {entry.name}
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-3">
            {originText(entry, t)}
            <HostBadge host={entry.host} subtle />
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Button size="sm" variant="soft" icon={readOnly ? Copy : Pencil} onClick={() => void useAgents.getState().openBuilder(entry)}>
          {readOnly ? t.detail.editCopy : t.detail.edit}
        </Button>
        <Button size="sm" icon={Workflow} onClick={automate}>
          {t.detail.automate}
        </Button>
        {!readOnly ? <IconButton size="sm" tone="danger" icon={Trash2} label={t.detail.delete} className="ml-auto" onClick={() => void useAgents.getState().remove(entry)} /> : null}
      </div>
    </div>
  )
}

function Summary({ entry }: { readonly entry: SkillEntry }): React.JSX.Element {
  const t = useT().agents
  const summary = useSkills((s) => s.summaries[entry.hash])
  const busy = useSkills((s) => s.progress !== null)
  return (
    <section aria-label={t.detail.whatItDoes}>
      <DetailHeading>{t.detail.whatItDoes}</DetailHeading>
      {summary ? (
        <p className="text-[0.875rem] leading-relaxed text-ink">{summary}</p>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-line-strong px-3.5 py-3">
          <p className="flex-1 text-xs leading-relaxed text-ink-3">{t.detail.noSummary}</p>
          <Button size="sm" variant="soft" icon={WandSparkles} disabled={busy} onClick={() => void useSkills.getState().summarize([entry.id])}>
            {t.detail.explain}
          </Button>
        </div>
      )}
    </section>
  )
}

function WhenUsed({ entry, definition }: { readonly entry: SkillEntry; readonly definition: AgentDefinition }): React.JSX.Element {
  const t = useT().agents
  const proactive = isProactive(definition.description)
  return (
    <section aria-label={t.detail.whenUsed}>
      <DetailHeading>{t.detail.whenUsed}</DetailHeading>
      <blockquote className="border-l border-line-strong pl-3 text-[0.8125rem] leading-relaxed text-ink-2">{definition.description || t.detail.noDescription}</blockquote>
      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-3">
        <Info className="mt-0.5 size-3.5 shrink-0 text-ink-3" aria-hidden strokeWidth={1.75} />
        <span>
          {proactive ? t.detail.proactiveYes : t.detail.proactiveNo} <Rich text={t.detail.callText(entry.name)} />
        </span>
      </p>
    </section>
  )
}

function Settings({ definition }: { readonly definition: AgentDefinition }): React.JSX.Element {
  const t = useT().agents
  const rows = settingRows(definition, t)
  return (
    <section aria-label={t.detail.settings}>
      <DetailHeading>{t.detail.settings}</DetailHeading>
      <dl className="divide-y divide-line border-y border-line">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 py-2">
            <dt className="pt-px text-xs text-ink-3">{r.label}</dt>
            <dd className="min-w-0">
              <span className={`text-[0.8125rem] font-[580] ${r.inherited ? 'text-ink-2' : 'text-ink'}`}>{r.value}</span>
              <span className="mt-0.5 block text-2xs leading-relaxed text-ink-3">{r.explain}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Tools({ definition }: { readonly definition: AgentDefinition }): React.JSX.Element {
  const t = useT().agents
  return (
    <section aria-label={t.detail.tools}>
      <DetailHeading count={definition.tools.length || undefined}>{t.detail.tools}</DetailHeading>
      {definition.tools.length === 0 ? (
        <p className="text-xs leading-relaxed text-ink-3">{t.detail.toolsInheritAll}</p>
      ) : (
        <ul className="space-y-1.5">
          {definition.tools.map((name) => {
            const info = toolInfo(name, t)
            return (
              <li key={name} className="flex items-baseline gap-2.5">
                <code className="w-[6.5rem] shrink-0 truncate font-mono text-2xs text-ink-2" title={name}>
                  {name}
                </code>
                <span className="text-xs leading-relaxed text-ink-3">{info ? `${info.label}: ${info.explain}` : name.startsWith('mcp__') ? t.detail.toolMcp : t.detail.toolCustom}</span>
              </li>
            )
          })}
        </ul>
      )}
      {definition.disallowedTools.length ? (
        <p className="mt-2.5 text-xs text-ink-3">
          {t.detail.blocked} <span className="font-mono text-2xs text-ink-2">{definition.disallowedTools.join(', ')}</span>
        </p>
      ) : null}
    </section>
  )
}

function Skills({ entry }: { readonly entry: SkillEntry }): React.JSX.Element | null {
  const t = useT().agents
  const relations = useSkills((s) => s.relations)
  const entries = useSkills((s) => s.entries)
  const linked = useMemo(() => {
    const byId = new Map(entries.map((e) => [e.id, e]))
    return relations
      .filter((r) => r.from === entry.id && (r.kind === 'uses-skill' || r.kind === 'mentions'))
      .flatMap((r) => {
        const target = byId.get(r.to)
        return target ? [{ entry: target, preloaded: r.kind === 'uses-skill' }] : []
      })
  }, [relations, entries, entry.id])
  const missing = entry.skills.filter((name) => !linked.some((l) => l.entry.name === name))
  const open = (id: string): void => {
    useSkills.getState().select(id)
    useNav.getState().go('skills')
  }
  return (
    <section aria-label={t.detail.skills}>
      <DetailHeading count={linked.length + missing.length || undefined}>{t.detail.skills}</DetailHeading>
      {linked.length + missing.length === 0 ? <p className="text-xs text-ink-3">{t.detail.noSkills}</p> : null}
      <ul className="flex flex-wrap gap-1.5">
        {linked.map((l) => (
          <li key={l.entry.id}>
            <button
              type="button"
              onClick={() => open(l.entry.id)}
              title={l.preloaded ? t.detail.skillPreloadedTitle : t.detail.skillMentionedTitle}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-canvas px-2 text-xs text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              <Sparkles className="size-3.5 text-accent" aria-hidden strokeWidth={1.75} />
              {l.entry.name}
              <span className="text-2xs text-ink-3">{l.preloaded ? t.detail.preloaded : t.detail.mentioned}</span>
            </button>
          </li>
        ))}
        {missing.map((name) => (
          <li key={name}>
            <Chip tone="muted" title={t.detail.skillMissingTitle}>
              {t.detail.skillMissing(name)}
            </Chip>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Automations({ entry }: { readonly entry: SkillEntry }): React.JSX.Element {
  const t = useT()
  const text = t.agents.detail
  const items = useAutomations((s) => s.items).filter((a) => a.agent === entry.name && a.host === entry.host)
  const go = (id: number | null): void => {
    if (id === null) useAutomations.getState().openEditor(null, { name: entry.name, agent: entry.name, host: entry.host })
    else useAutomations.getState().select(id)
    useNav.getState().go('automations')
  }
  return (
    <section aria-label={text.automations}>
      <DetailHeading count={items.length || undefined}>{text.automations}</DetailHeading>
      {items.length === 0 ? (
        <p className="text-xs leading-relaxed text-ink-3">
          {text.onlyWhenCalled}{' '}
          <button type="button" className="font-[560] text-accent-text underline decoration-accent/40 underline-offset-4 hover:decoration-accent" onClick={() => go(null)}>
            {text.runBySchedule}
          </button>
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => go(a.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-raised">
                {a.running ? <Play className="size-3.5 text-accent" aria-hidden /> : <CalendarClock className="size-3.5 text-ink-3" aria-hidden strokeWidth={1.75} />}
                <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-ink">{a.name}</span>
                <span className="text-2xs text-ink-3">{a.enabled ? describeSchedule(a.schedule, t.automations) : text.scheduleOff}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const FINDING_ICON = { error: AlertTriangle, warn: AlertTriangle, tip: Lightbulb } as const
const FINDING_COLOR = { error: 'text-danger-ink', warn: 'text-warn', tip: 'text-ink-3' } as const

export function FindingList({ findings }: { readonly findings: readonly LintFinding[] }): React.JSX.Element {
  const t = useT().agents
  return (
    <ul className="space-y-2">
      {findings.map((f) => {
        const Icon = FINDING_ICON[f.level]
        return (
          <li key={`${f.field}-${f.message}`} className="flex items-start gap-2 text-xs leading-relaxed text-ink-2">
            <Icon className={`mt-0.5 size-3.5 shrink-0 ${FINDING_COLOR[f.level]}`} aria-label={t.finding[f.level]} strokeWidth={1.75} />
            {f.message}
          </li>
        )
      })}
    </ul>
  )
}

/** Wert 0–100 als schmale Leiste mit Urteil. */
export function ScoreBar({ score }: { readonly score: number }): React.JSX.Element {
  const t = useT().agents.score
  const verdict = score >= 85 ? t.great : score >= 65 ? t.fair : score >= 40 ? t.gaps : t.incomplete
  const color = score >= 85 ? 'var(--color-status-idle)' : score >= 65 ? 'var(--color-accent)' : score >= 40 ? 'var(--color-warn)' : 'var(--color-danger)'
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-[580] text-ink">{verdict}</span>
        <span className="num text-ink-3">{score}/100</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-raised-2" role="meter" aria-label={t.meter} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
        <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${Math.max(3, score)}%`, background: color }} />
      </div>
    </div>
  )
}

function Quality({ definition }: { readonly definition: AgentDefinition }): React.JSX.Element {
  const t = useT().agents
  const findings = useMemo(() => lintAgent(definition, t.lint), [definition, t])
  return (
    <section aria-label={t.detail.quality}>
      <DetailHeading>{t.detail.quality}</DetailHeading>
      <ScoreBar score={lintScore(findings)} />
      {findings.length ? (
        <div className="mt-3">
          <FindingList findings={findings} />
        </div>
      ) : (
        <p className="mt-2 text-xs text-ink-3">{t.detail.qualityClean}</p>
      )}
    </section>
  )
}

function Instructions({ definition }: { readonly definition: AgentDefinition }): React.JSX.Element {
  const t = useT().agents.detail
  const [expanded, setExpanded] = useState(false)
  const long = definition.prompt.length > PROMPT_PREVIEW_CHARS
  const shown = expanded || !long ? definition.prompt : `${definition.prompt.slice(0, PROMPT_PREVIEW_CHARS)}\n\n…`
  const html = useMemo(() => renderMarkdown(shown), [shown])
  return (
    <section aria-label={t.instructions}>
      <DetailHeading>{t.instructions}</DetailHeading>
      {definition.prompt ? (
        <>
          <div className="prose-log agent-prompt rounded-lg border border-line bg-canvas px-4 py-3" dangerouslySetInnerHTML={{ __html: html }} />
          {long ? (
            <Button size="sm" variant="ghost" className="mt-1.5" onClick={() => setExpanded((v) => !v)}>
              {expanded ? t.showLess : t.showAll}
            </Button>
          ) : null}
        </>
      ) : (
        <p className="text-xs text-ink-3">{t.instructionsEmpty}</p>
      )}
    </section>
  )
}

function FileInfo({ entry, preserved }: { readonly entry: SkillEntry; readonly preserved: readonly string[] }): React.JSX.Element {
  const t = useT().agents.detail
  return (
    <section aria-label={t.fileAria} className="border-t border-line pt-4">
      <div className="flex items-center gap-1.5">
        <p className="min-w-0 flex-1 truncate font-mono text-2xs text-ink-3" title={entry.path}>
          {entry.path}
        </p>
        {entry.host === 'local' ? <IconButton size="sm" icon={FolderOpen} label={t.showInFolder} onClick={() => void attempt(api.app.showInFolder(entry.path))} /> : null}
      </div>
      {preserved.length ? <p className="mt-1.5 text-2xs text-ink-3">{t.preservedKeys(preserved.join(', '))}</p> : null}
    </section>
  )
}
