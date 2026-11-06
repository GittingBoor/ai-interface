import { useEffect, useId, useMemo, useState } from 'react'
import { ArrowLeft, FileCode2, ListTree, Save, Sparkles, WandSparkles } from 'lucide-react'
import { agentSlug, agentTemplates, effortOptions, isProactive, memoryOptions, modelOptions, permissionOptions, type AgentDefinition } from '@shared/agents'
import { lintAgent, lintScore } from '@shared/agentLint'
import { serializeAgentFile } from '@shared/agentFormat'
import { BrandSpinner } from '@renderer/components/BrandSpinner'
import { Button, IconButton } from '@renderer/components/Button'
import { Field, Segmented, Switch } from '@renderer/components/Controls'
import { hostLabel, useHostIds } from '@renderer/lib/hosts'
import { useT } from '@renderer/i18n/useT'
import { useAgents, useDraftDirty, type AgentDraft } from '@renderer/stores/agentsStore'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useSkills } from '@renderer/stores/skillsStore'
import { FindingList, ScoreBar } from './AgentDetail'
import { AgentSigil } from './agentMarks'
import { BuilderBlock, ChoiceList, ColorChoice, SkillPicker, ToolPicker } from './builderFields'

const PROACTIVE_SENTENCE = 'Use proactively.'
const PROACTIVE_STRIP = /\s*\buse proactively\b[^.]*\.?/gi

const SECTION_IDS = [
  { id: 'b-start', key: 'start' },
  { id: 'b-identity', key: 'identity' },
  { id: 'b-place', key: 'place' },
  { id: 'b-model', key: 'model' },
  { id: 'b-tools', key: 'tools' },
  { id: 'b-skills', key: 'skills' },
  { id: 'b-rights', key: 'rights' },
  { id: 'b-prompt', key: 'prompt' }
] as const

export function AgentBuilder(): React.JSX.Element | null {
  const t = useT().agents
  const b = t.builder
  const draft = useAgents((s) => s.draft)
  const saving = useAgents((s) => s.saving)
  const dirty = useDraftDirty()

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void useAgents.getState().save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!draft) return null
  const d = draft.definition
  const title = draft.origin === 'edit' ? b.editTitle(d.name) : draft.origin === 'copy' ? b.copyTitle(d.name) : b.newTitle
  const blocking = lintAgent(d, t.lint).filter((f) => f.level === 'error' && f.field !== 'prompt')

  return (
    <div className="flex h-full flex-col">
      <header className="flex min-h-[4.25rem] shrink-0 flex-wrap items-center gap-x-4 gap-y-3 px-8 pt-5 pb-4 max-lg:px-5">
        <IconButton icon={ArrowLeft} label={b.back} onClick={() => void useAgents.getState().closeBuilder()} />
        <AgentSigil color={d.color} />
        <div className="min-w-48 flex-1">
          <h1 className="text-[1.375rem] leading-tight font-[640] tracking-[-0.012em] text-ink [font-stretch:108%]">{title}</h1>
          <p className="mt-0.5 text-[0.8125rem] text-ink-3">
            {dirty ? b.unsaved : draft.origin === 'edit' ? b.saved : b.notSaved} · <TargetText draft={draft} />
          </p>
        </div>
        <Button variant="ghost" onClick={() => void useAgents.getState().closeBuilder()}>
          {b.cancel}
        </Button>
        <Button variant="primary" icon={Save} loading={saving} disabled={blocking.length > 0} title={blocking[0]?.message ?? b.saveTitle} onClick={() => void useAgents.getState().save()}>
          {b.save}
        </Button>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto px-8 pb-24 max-lg:px-5">
          <div className="mx-auto flex max-w-[54rem] flex-col gap-9">
            <StartBlock draft={draft} />
            <IdentityBlock definition={d} />
            <PlaceBlock draft={draft} />
            <ModelBlock definition={d} />
            <BuilderBlock id="b-tools" title={b.toolsTitle} explain={b.toolsExplain}>
              <ToolPicker tools={d.tools} onChange={(tools) => useAgents.getState().updateDraft({ tools })} />
            </BuilderBlock>
            <SkillsBlock definition={d} />
            <RightsBlock definition={d} />
            <PromptBlock definition={d} />
          </div>
        </div>
        <aside aria-label={b.sideAria} className="w-[25rem] shrink-0 overflow-y-auto border-l border-line/70 px-6 pb-10 max-[1280px]:w-[21rem] max-lg:hidden">
          <SidePanel draft={draft} />
        </aside>
      </div>
    </div>
  )
}

function TargetText({ draft }: { readonly draft: AgentDraft }): React.JSX.Element {
  const b = useT().agents.builder
  const favorites = useFavorites((s) => s.favorites)
  const project = favorites.find((f) => f.host === draft.host && f.path === draft.projectPath)
  const where = draft.scope === 'user' ? '~/.claude/agents' : project ? `${project.name}/.claude/agents` : b.chooseProject
  return (
    <span className="font-mono text-2xs">
      {hostLabel(draft.host)}: {where}/{draft.definition.name || b.nameFallback}.md
    </span>
  )
}

function StartBlock({ draft }: { readonly draft: AgentDraft }): React.JSX.Element {
  const t = useT().agents
  const b = t.builder
  const templates = useMemo(() => agentTemplates(t), [t])
  const assisting = useAgents((s) => s.assisting)
  const notes = useAgents((s) => s.assistNotes)
  const [idea, setIdea] = useState('')
  const ideaId = useId()
  const fresh = draft.origin === 'new'
  const mode = fresh ? 'create' : 'improve'
  return (
    <BuilderBlock
      id="b-start"
      title={fresh ? b.startNew : b.startImprove}
      explain={fresh ? b.startNewExplain : b.startImproveExplain}
    >
      <div className="rounded-xl border border-line bg-raised/60 p-4">
        <label htmlFor={ideaId} className="sr-only">
          {fresh ? b.ideaLabel : b.improveLabel}
        </label>
        <textarea
          id={ideaId}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          rows={fresh ? 3 : 2}
          placeholder={fresh ? b.ideaExample : b.improveExample}
          className="field h-auto resize-y py-2 leading-relaxed"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void useAgents.getState().assist(mode, idea)
          }}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant={fresh ? 'primary' : 'soft'} icon={WandSparkles} loading={assisting !== null} disabled={fresh && idea.trim().length < 10} onClick={() => void useAgents.getState().assist(mode, idea)}>
            {fresh ? b.createDraft : b.improve}
          </Button>
          {assisting ? (
            <span role="status" className="flex items-center gap-2 text-xs text-ink-3">
              <BrandSpinner /> {assisting === 'create' ? b.drafting : b.revising}
            </span>
          ) : (
            <span className="text-2xs text-ink-3">{b.shortcut}</span>
          )}
        </div>
        {notes.length ? (
          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-[600] text-ink-2">
              <Sparkles className="size-3.5 text-accent" aria-hidden strokeWidth={1.75} />
              {b.whyChosen}
            </p>
            <ul className="space-y-1 text-xs leading-relaxed text-ink-2">
              {notes.map((n) => (
                <li key={n} className="pl-3 [text-indent:-0.75rem] before:mr-1.5 before:text-ink-3 before:content-['–']">
                  {n}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {fresh ? (
        <div className="mt-4">
          <p className="mb-2 text-xs text-ink-3">{b.orTemplate}</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-1.5">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => useAgents.getState().updateDraft(tpl.definition)}
                className="flex items-start gap-2.5 rounded-lg border border-line px-3 py-2 text-left transition-colors hover:border-line-strong hover:bg-raised"
              >
                <AgentSigil color={tpl.definition.color} size="sm" />
                <span className="min-w-0">
                  <span className="block text-[0.8125rem] font-[600] text-ink">{tpl.label}</span>
                  <span className="block text-2xs leading-snug text-ink-3">{tpl.explain}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </BuilderBlock>
  )
}

function IdentityBlock({ definition: d }: { readonly definition: AgentDefinition }): React.JSX.Element {
  const t = useT().agents
  const b = t.builder
  const update = useAgents((s) => s.updateDraft)
  const proactive = isProactive(d.description)
  const findings = lintAgent(d, t.lint)
  const nameError = findings.find((f) => f.field === 'name' && f.level === 'error' && d.name !== '')?.message ?? null
  return (
    <BuilderBlock id="b-identity" title={b.identityTitle} explain={b.identityExplain}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-5 max-md:grid-cols-1">
        <Field label={b.nameLabel} error={nameError} hint={b.nameHint}>
          {(id, describedBy) => (
            <input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={nameError ? true : undefined}
              value={d.name}
              onChange={(e) => update({ name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              onBlur={() => update({ name: agentSlug(d.name) })}
              placeholder="code-reviewer"
              className="field font-mono"
            />
          )}
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-[560] text-ink-2">{b.colorLabel}</span>
          <ColorChoice value={d.color} onChange={(color) => update({ color })} />
        </div>
        <Field
          className="col-span-full"
          label={b.whenLabel}
          hint={b.whenHint(d.description.length)}
        >
          {(id, describedBy) => (
            <textarea
              id={id}
              aria-describedby={describedBy}
              rows={3}
              value={d.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder={b.whenPlaceholder}
              className="field h-auto resize-y py-2 leading-relaxed"
            />
          )}
        </Field>
        <div className="col-span-full">
          <Switch
            checked={proactive}
            label={b.proactiveLabel}
            description={b.proactiveDescription}
            onChange={(on) => update({ description: on ? `${d.description.trim()} ${PROACTIVE_SENTENCE}`.trim() : d.description.replace(PROACTIVE_STRIP, '').trim() })}
          />
        </div>
      </div>
    </BuilderBlock>
  )
}

function PlaceBlock({ draft }: { readonly draft: AgentDraft }): React.JSX.Element {
  const b = useT().agents.builder
  const hosts = useHostIds()
  const favorites = useFavorites((s) => s.favorites)
  const projects = favorites.filter((f) => f.host === draft.host)
  const setTarget = useAgents((s) => s.setTarget)
  return (
    <BuilderBlock id="b-place" title={b.placeTitle} explain={b.placeExplain}>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        {hosts.length > 1 ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-[560] text-ink-2">{b.host}</span>
            <Segmented label={b.host} value={draft.host} options={hosts.map((h) => ({ value: h, label: hostLabel(h) }))} onChange={(h) => setTarget(h, draft.scope, null)} />
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-[560] text-ink-2">{b.appliesTo}</span>
          <Segmented
            label={b.appliesTo}
            value={draft.scope}
            options={[
              { value: 'user', label: b.allProjects },
              { value: 'project', label: b.oneProject }
            ]}
            onChange={(scope) => setTarget(draft.host, scope, scope === 'project' ? (draft.projectPath ?? projects[0]?.path ?? null) : null)}
          />
        </div>
        {draft.scope === 'project' ? (
          <Field label={b.project} className="min-w-[16rem] flex-1">
            {(id) => (
              <select id={id} value={draft.projectPath ?? ''} onChange={(e) => setTarget(draft.host, 'project', e.target.value || null)} className="field">
                {projects.length === 0 ? <option value="">{b.noProjects(hostLabel(draft.host))}</option> : null}
                {projects.map((p) => (
                  <option key={p.id} value={p.path}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        ) : null}
      </div>
    </BuilderBlock>
  )
}

function ModelBlock({ definition: d }: { readonly definition: AgentDefinition }): React.JSX.Element {
  const t = useT().agents
  const b = t.builder
  const update = useAgents((s) => s.updateDraft)
  const models = modelOptions(t)
  const custom = d.model !== null && !models.some((m) => m.value === d.model)
  return (
    <BuilderBlock id="b-model" title={b.modelTitle} explain={b.modelExplain}>
      <ChoiceList
        label={b.modelLabel}
        value={custom ? null : d.model === 'inherit' ? null : d.model}
        options={models.filter((m) => m.value !== 'inherit')}
        inheritLabel={t.inheritModel}
        inheritExplain={b.modelInheritExplain}
        onChange={(model) => update({ model })}
      />
      {custom ? <p className="mt-2 text-xs text-ink-3">{b.customModel} <code className="font-mono text-2xs text-ink-2">{d.model}</code>. {b.customModelReplace}</p> : null}
      <h3 className="mt-6 mb-2 text-xs font-[600] text-ink-2">{b.effortLabel}</h3>
      <ChoiceList label={b.effortLabel} value={d.effort} options={effortOptions(t)} inheritLabel={b.sessionLabel} inheritExplain={b.effortInheritExplain} onChange={(effort) => update({ effort })} />
    </BuilderBlock>
  )
}

function SkillsBlock({ definition: d }: { readonly definition: AgentDefinition }): React.JSX.Element {
  const b = useT().agents.builder
  const entries = useSkills((s) => s.entries)
  const available = useMemo(() => [...new Set(entries.filter((e) => e.kind === 'skill').map((e) => e.name))].sort((a, b) => a.localeCompare(b, 'de-DE')), [entries])
  return (
    <BuilderBlock
      id="b-skills"
      title={b.skillsTitle}
      explain={b.skillsExplain}
      aside={d.skills.length ? <span className="num text-xs text-ink-3">{b.skillsChosen(d.skills.length)}</span> : undefined}
    >
      <SkillPicker available={available} selected={d.skills} onChange={(skills) => useAgents.getState().updateDraft({ skills })} />
    </BuilderBlock>
  )
}

function RightsBlock({ definition: d }: { readonly definition: AgentDefinition }): React.JSX.Element {
  const t = useT().agents
  const b = t.builder
  const update = useAgents((s) => s.updateDraft)
  const turnsId = useId()
  return (
    <BuilderBlock id="b-rights" title={b.rightsTitle} explain={b.rightsExplain}>
      <ChoiceList
        label={b.rightsLabel}
        value={d.permissionMode}
        options={permissionOptions(t)}
        inheritLabel={b.sessionLabel}
        inheritExplain={b.rightsInheritExplain}
        onChange={(permissionMode) => update({ permissionMode })}
        columns={2}
      />
      <h3 className="mt-6 mb-2 text-xs font-[600] text-ink-2">{b.memoryLabel}</h3>
      <ChoiceList label={b.memoryLabel} value={d.memory} options={memoryOptions(t)} inheritLabel={b.memoryOff} inheritExplain={b.memoryOffExplain} onChange={(memory) => update({ memory })} />
      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5 max-md:grid-cols-1">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={turnsId} className="text-xs font-[560] text-ink-2">
            {b.maxTurnsLabel}
          </label>
          <input
            id={turnsId}
            type="number"
            min={1}
            max={500}
            value={d.maxTurns ?? ''}
            placeholder={b.unlimitedPlaceholder}
            onChange={(e) => {
              const n = Number(e.target.value)
              update({ maxTurns: e.target.value === '' || !Number.isInteger(n) || n < 1 ? null : n })
            }}
            className="field num w-36"
          />
          <p className="text-2xs text-ink-3">{b.maxTurnsHint}</p>
        </div>
        <div className="space-y-4">
          <Switch checked={d.isolation === 'worktree'} label={b.worktreeLabel} description={b.worktreeDescription} onChange={(on) => update({ isolation: on ? 'worktree' : null })} />
          <Switch checked={d.background} label={b.backgroundLabel} description={b.backgroundDescription} onChange={(background) => update({ background })} />
        </div>
      </div>
    </BuilderBlock>
  )
}

function PromptBlock({ definition: d }: { readonly definition: AgentDefinition }): React.JSX.Element {
  const t = useT().agents
  const b = t.builder
  const update = useAgents((s) => s.updateDraft)
  const promptId = useId()
  const initialId = useId()
  return (
    <BuilderBlock
      id="b-prompt"
      title={b.promptTitle}
      explain={b.promptExplain}
      aside={
        <Button size="sm" icon={ListTree} onClick={() => update({ prompt: d.prompt.trim() ? `${d.prompt.trim()}\n\n${t.promptOutline}` : t.promptOutline })}>
          {b.insertOutline}
        </Button>
      }
    >
      <label htmlFor={promptId} className="sr-only">
        {b.promptTitle}
      </label>
      <textarea
        id={promptId}
        value={d.prompt}
        onChange={(e) => update({ prompt: e.target.value })}
        spellCheck={false}
        placeholder={t.promptOutline}
        className="field h-auto min-h-[24rem] resize-y py-3 font-mono text-xs leading-relaxed"
      />
      <p className="num mt-1.5 text-2xs text-ink-3">{b.promptChars(d.prompt.length)}</p>
      <div className="mt-5 flex flex-col gap-1.5">
        <label htmlFor={initialId} className="text-xs font-[560] text-ink-2">
          {b.initialLabel}
        </label>
        <input id={initialId} value={d.initialPrompt} onChange={(e) => update({ initialPrompt: e.target.value })} placeholder={b.initialPlaceholder} className="field" />
        <p className="text-2xs text-ink-3">{b.initialHint}</p>
      </div>
    </BuilderBlock>
  )
}

function SidePanel({ draft }: { readonly draft: AgentDraft }): React.JSX.Element {
  const t = useT().agents
  const b = t.builder
  const findings = useMemo(() => lintAgent(draft.definition, t.lint), [draft.definition, t])
  const file = useMemo(() => serializeAgentFile(draft.definition), [draft.definition])
  return (
    <div className="sticky top-0 flex flex-col gap-7 pt-1">
      <section aria-label={b.sideQuality}>
        <h2 className="mb-2.5 text-xs font-[620] text-ink-2">{b.sideQuality}</h2>
        <ScoreBar score={lintScore(findings)} />
        <div className="mt-3">{findings.length ? <FindingList findings={findings} /> : <p className="text-xs text-ink-3">{b.noFindings}</p>}</div>
      </section>
      <nav aria-label={b.sectionsNav}>
        <h2 className="mb-1.5 text-xs font-[620] text-ink-2">{b.sectionsNav}</h2>
        <ul className="space-y-px">
          {SECTION_IDS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="block rounded-md px-2 py-1 text-xs text-ink-3 hover:bg-raised hover:text-ink">
                {b.sections[s.key]}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <section aria-label={b.filePreviewAria}>
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-[620] text-ink-2">
          <FileCode2 className="size-3.5 text-ink-3" aria-hidden strokeWidth={1.75} />
          {b.filePreview}
        </h2>
        <pre className="max-h-[28rem] overflow-auto rounded-lg border border-line bg-canvas px-3 py-2.5 font-mono text-2xs leading-relaxed whitespace-pre-wrap text-ink-2">{file}</pre>
        {draft.preservedKeys.length ? <p className="mt-1.5 text-2xs text-ink-3">{b.alsoPreserved(draft.preservedKeys.join(', '))}</p> : null}
      </section>
    </div>
  )
}
