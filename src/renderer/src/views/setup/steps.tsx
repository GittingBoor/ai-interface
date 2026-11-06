import { useEffect, useState, type ReactNode } from 'react'
import { BookOpen, FileJson, FolderGit2, FolderOpen, GitBranch, Pencil, Plus, RefreshCw, Server, Sparkles, Trash2, TriangleAlert } from 'lucide-react'
import type { DeviceSettings, SetupDetection, VaultScan } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt } from '@renderer/api/call'
import { Button, IconButton } from '@renderer/components/Button'
import { Field, Switch } from '@renderer/components/Controls'
import { DeviceForm, deviceError, newDevice, withId } from '@renderer/components/DeviceForm'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { choiceKey, mergeScan, type ProjectChoice, type SetupDraft } from '@renderer/lib/setupDraft'
import { PrerequisiteCheck } from './Prerequisites'
import { useT } from '@renderer/i18n/useT'

interface StepProps {
  readonly detection: SetupDetection
  readonly draft: SetupDraft
  onChange(next: SetupDraft): void
}

function StepHeading({ title, children }: { readonly title: string; readonly children: ReactNode }): React.JSX.Element {
  return (
    <header className="mb-8">
      <h1 tabIndex={-1} className="text-[1.75rem] leading-tight font-[660] tracking-[-0.018em] text-balance text-ink outline-none [font-stretch:110%]">
        {title}
      </h1>
      <div className="mt-2.5 max-w-[60ch] text-[0.875rem] leading-relaxed text-ink-2">{children}</div>
    </header>
  )
}

/** Vorschläge als anklickbare Pfade unter einem Feld. */
function Suggestions({ items, current, onPick, label }: { readonly items: readonly string[]; readonly current: string; readonly label: string; onPick(value: string): void }): React.JSX.Element | null {
  const rest = items.filter((i) => i !== current)
  if (!rest.length) return null
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-2xs text-ink-3">{label}</span>
      {rest.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPick(item)}
          className="max-w-full truncate rounded-md border border-line bg-canvas px-2 py-0.5 font-mono text-2xs text-ink-2 transition-colors hover:border-accent/50 hover:text-ink"
        >
          {item}
        </button>
      ))}
    </div>
  )
}

function PathInput({ id, describedBy, value, onChange, placeholder }: { readonly id: string; readonly describedBy: string | undefined; readonly value: string; readonly placeholder?: string; onChange(v: string): void }): React.JSX.Element {
  const t = useT()
  const pick = async (): Promise<void> => {
    const folder = await attempt(api.favorites.pickFolder())
    if (folder) onChange(folder)
  }
  return (
    <div className="flex gap-2">
      <input id={id} aria-describedby={describedBy} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field font-mono text-xs" spellCheck={false} />
      <Button icon={FolderOpen} onClick={() => void pick()}>
        {t.setup.choose}
      </Button>
    </div>
  )
}

export function WelcomeStep({ detection, draft }: { readonly detection: SetupDetection; readonly draft: SetupDraft }): React.JSX.Element {
  const t = useT()
  const w = t.setup.welcome
  const features = [
    { icon: FolderGit2, ...w.features.projects },
    { icon: BookOpen, ...w.features.notes },
    { icon: Server, ...w.features.devices }
  ]
  const proposal = detection.proposal
  return (
    <>
      <StepHeading title={detection.existingInstall ? w.titleExisting : w.titleNew}>
        {w.intro}
      </StepHeading>
      <ul className="divide-y divide-line border-y border-line">
        {features.map((f) => (
          <li key={f.title} className="flex gap-4 py-4">
            <f.icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden strokeWidth={1.75} />
            <div>
              <p className="text-[0.875rem] font-[600] text-ink">{f.title}</p>
              <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-3">{f.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <PrerequisiteCheck />
      {proposal ? (
        <div className="mt-8 flex gap-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3.5">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0 text-[0.8125rem] leading-relaxed text-ink-2">
            <p className="font-[600] text-ink">{w.proposalFound}</p>
            <p className="break-all">{w.proposalSummary(detection.proposalPath, draft.projects.length, draft.devices.length, draft.useVault)}</p>
          </div>
        </div>
      ) : detection.proposalError ? (
        <div role="alert" className="mt-8 flex gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3.5 text-[0.8125rem] leading-relaxed text-danger-ink">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <span className="font-[600]">{w.proposalUnreadable}</span> {detection.proposalError} {w.proposalUnreadableHint}
          </p>
        </div>
      ) : (
        <p className="mt-8 flex gap-2.5 text-xs leading-relaxed text-ink-3">
          <FileJson className="mt-px size-4 shrink-0" aria-hidden />
          <span className="break-all">{w.tip(t.setup.docsTemplate, detection.proposalPath)}</span>
        </p>
      )}
    </>
  )
}

function ProjectRow({ project, onToggle }: { readonly project: ProjectChoice; onToggle(): void }): React.JSX.Element {
  const p = useT().setup.projects
  return (
    <li>
      <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-raised">
        <input type="checkbox" checked={project.selected} onChange={onToggle} className="size-4 shrink-0 accent-[var(--color-accent)]" />
        <ProjectMark color={project.color} icon={project.icon} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.8125rem] text-ink">{project.name}</span>
          <span className="block truncate font-mono text-2xs text-ink-3">
            {project.host === 'local' ? '' : `${project.host}: `}
            {project.path}
          </span>
        </span>
        {project.fromProposal ? <span className="rounded-full bg-accent-soft px-2 text-2xs font-[560] text-accent-text">{p.proposal}</span> : null}
        {/* Feste Spalten, damit Git-Symbol und CLAUDE.md über alle Zeilen untereinander stehen. */}
        <span className="flex w-3.5 shrink-0 justify-center">{project.isGit ? <GitBranch className="size-3.5 text-ink-3" aria-label={p.gitRepo} /> : null}</span>
        <span className="w-[4.5rem] shrink-0 text-right font-mono text-2xs text-ink-3">{project.hasClaudeMd ? 'CLAUDE.md' : null}</span>
      </label>
    </li>
  )
}

export function ProjectsStep({ detection, draft, onChange }: StepProps): React.JSX.Element {
  const t = useT()
  const p = t.setup.projects
  const favorites = useFavorites((s) => s.favorites)
  const [scanning, setScanning] = useState(false)
  const [scannedRoot, setScannedRoot] = useState<string | null>(null)
  const known = new Set(favorites.map((f) => choiceKey(f)))

  const scan = async (root: string): Promise<void> => {
    if (!root.trim()) return
    setScanning(true)
    const found = await attempt(api.setup.scanProjects(root.trim()))
    setScanning(false)
    setScannedRoot(root.trim())
    if (found) onChange({ ...draft, projectsRoot: root, projects: mergeScan(draft.projects, found, known) })
  }

  // Beim ersten Öffnen den vorgeschlagenen Ordner gleich einlesen.
  useEffect(() => {
    if (scannedRoot === null && draft.projectsRoot) void scan(draft.projectsRoot)
  }, [])

  const setAll = (selected: boolean): void => onChange({ ...draft, projects: draft.projects.map((p) => ({ ...p, selected })) })
  const toggle = (key: string): void => onChange({ ...draft, projects: draft.projects.map((p) => (choiceKey(p) === key ? { ...p, selected: !p.selected } : p)) })
  const selected = draft.projects.filter((p) => p.selected).length

  return (
    <>
      <StepHeading title={p.title}>{p.intro}</StepHeading>
      <Field label={p.rootLabel} hint={p.rootHint}>
        {(id, d) => <PathInput id={id} describedBy={d} value={draft.projectsRoot} onChange={(v) => onChange({ ...draft, projectsRoot: v })} />}
      </Field>
      <Suggestions items={detection.projectRootCandidates} current={draft.projectsRoot} label={t.setup.found} onPick={(v) => void scan(v)} />

      <div className="mt-8 flex items-end justify-between gap-4 border-b border-line pb-2">
        <div>
          <h2 className="text-[0.875rem] font-[620] text-ink">{p.adopt}</h2>
          <p className="num mt-0.5 text-xs text-ink-3">
            {draft.projects.length ? p.selectedOf(selected, draft.projects.length) : scanning ? p.reading : p.nothingRead}
          </p>
        </div>
        <div className="flex gap-1">
          {draft.projects.length ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setAll(true)}>
                {p.all}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAll(false)}>
                {p.none}
              </Button>
            </>
          ) : null}
          <Button size="sm" icon={RefreshCw} loading={scanning} disabled={!draft.projectsRoot.trim()} onClick={() => void scan(draft.projectsRoot)}>
            {p.scan}
          </Button>
        </div>
      </div>
      {draft.projects.length ? (
        <ul className="max-h-[22rem] overflow-y-auto py-1">
          {draft.projects.map((project) => (
            <ProjectRow key={choiceKey(project)} project={project} onToggle={() => toggle(choiceKey(project))} />
          ))}
        </ul>
      ) : (
        <p className="py-5 text-[0.8125rem] leading-relaxed text-ink-3">
          {scannedRoot ? p.emptyScanned(scannedRoot, t.frame.views.projects) : p.emptyNotScanned(t.frame.views.projects)}
        </p>
      )}
    </>
  )
}

export function NotesStep({ detection, draft, onChange }: StepProps): React.JSX.Element {
  const t = useT()
  const n = t.setup.notes
  const [scan, setScan] = useState<VaultScan | null>(null)
  const vault = draft.vault
  const setVault = (patch: Partial<SetupDraft['vault']>): void => onChange({ ...draft, vault: { ...vault, ...patch } })

  useEffect(() => {
    setScan(null)
    if (!draft.useVault || !vault.path.trim()) return
    let alive = true
    // Kleine Pause, damit beim Tippen nicht jeder Buchstabe den Vault durchsucht.
    const timer = setTimeout(() => {
      void attempt(api.setup.scanVault(vault.path.trim())).then((result) => alive && setScan(result))
    }, 400)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [draft.useVault, vault.path])

  return (
    <>
      <StepHeading title={n.title}>{n.intro}</StepHeading>
      <Switch checked={draft.useVault} onChange={(v) => onChange({ ...draft, useVault: v })} label={n.connect} description={n.connectDescription} />
      {draft.useVault ? (
        <div className="mt-8 space-y-6">
          <div>
            <Field label={n.vaultFolder}>{(id, d) => <PathInput id={id} describedBy={d} value={vault.path} onChange={(v) => setVault({ path: v })} placeholder={n.vaultPlaceholder} />}</Field>
            <Suggestions items={detection.vaultCandidates} current={vault.path} label={t.setup.found} onPick={(v) => setVault({ path: v })} />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 max-md:grid-cols-1">
            <div>
              <Field label={n.todoFile} hint={n.todoFileHint}>
                {(id, d) => <input id={id} aria-describedby={d} list="setup-todo-files" value={vault.todoFile} onChange={(e) => setVault({ todoFile: e.target.value })} className="field font-mono text-xs" spellCheck={false} />}
              </Field>
              <datalist id="setup-todo-files">{scan?.todoFiles.map((f) => <option key={f} value={f} />)}</datalist>
              <Suggestions items={scan?.todoFiles ?? []} current={vault.todoFile} label={t.setup.inVault} onPick={(v) => setVault({ todoFile: v })} />
            </div>
            <div>
              <Field label={n.protocolDir} hint={n.protocolDirHint}>
                {(id, d) => <input id={id} aria-describedby={d} value={vault.protocolDir} onChange={(e) => setVault({ protocolDir: e.target.value })} className="field font-mono text-xs" spellCheck={false} />}
              </Field>
              <Suggestions items={scan?.protocolDirs ?? []} current={vault.protocolDir} label={t.setup.inVault} onPick={(v) => setVault({ protocolDir: v })} />
            </div>
            <div className="col-span-2 max-md:col-span-1">
              <Field label={n.notesDir} hint={n.notesDirHint}>
                {(id, d) => <input id={id} aria-describedby={d} value={vault.notesDir} onChange={(e) => setVault({ notesDir: e.target.value })} className="field font-mono text-xs" spellCheck={false} placeholder={n.notesDirPlaceholder} />}
              </Field>
              <Suggestions items={scan?.topDirs ?? []} current={vault.notesDir} label={t.setup.folders} onPick={(v) => setVault({ notesDir: v })} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export function DevicesStep({ detection, draft, onChange }: StepProps): React.JSX.Element {
  const t = useT()
  const dv = t.setup.devices
  const [editing, setEditing] = useState<{ readonly device: DeviceSettings; readonly index: number | null } | null>(null)
  const keyPath = detection.sshKeyCandidates[0] ?? ''
  const save = (): void => {
    if (!editing) return
    const others = draft.devices.filter((_, i) => i !== editing.index)
    const device = withId(editing.device, others)
    const devices = editing.index === null ? [...draft.devices, device] : draft.devices.map((d, i) => (i === editing.index ? device : d))
    onChange({ ...draft, devices })
    setEditing(null)
  }
  const remove = (index: number): void => {
    const id = draft.devices[index]?.id
    onChange({ ...draft, devices: draft.devices.filter((_, i) => i !== index), projects: draft.projects.filter((p) => p.host !== id) })
  }

  return (
    <>
      <StepHeading title={dv.title}>{dv.intro}</StepHeading>
      {draft.devices.length ? (
        <ul className="mb-6 divide-y divide-line border-y border-line">
          {draft.devices.map((d, i) => (
            <li key={d.id || i} className="flex items-center gap-3 py-3">
              <ProjectMark color={d.color} icon={d.icon} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] font-[600] text-ink">{d.name}</p>
                <p className="truncate font-mono text-2xs text-ink-3">
                  {d.user}@{d.host} · {d.projectsDir}
                </p>
              </div>
              <IconButton size="sm" icon={Pencil} label={dv.edit(d.name)} onClick={() => setEditing({ device: d, index: i })} />
              <IconButton size="sm" icon={Trash2} tone="danger" label={dv.remove(d.name)} onClick={() => remove(i)} />
            </li>
          ))}
        </ul>
      ) : null}
      {editing ? (
        <section aria-label={editing.index === null ? dv.newDevice : dv.editDevice} className="rounded-lg border border-line bg-canvas/60 p-5">
          <DeviceForm value={editing.device} others={draft.devices.filter((_, i) => i !== editing.index)} onChange={(device) => setEditing({ ...editing, device })} />
          <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t.common.cancel}
            </Button>
            <Button variant="soft" disabled={deviceError(editing.device, draft.devices.filter((_, i) => i !== editing.index)) !== null} onClick={save}>
              {editing.index === null ? dv.adopt : dv.adoptChanges}
            </Button>
          </div>
        </section>
      ) : (
        <Button icon={Plus} onClick={() => setEditing({ device: newDevice(draft.devices, keyPath), index: null })}>
          {dv.add}
        </Button>
      )}
      {!keyPath && !draft.devices.length ? (
        <p className="mt-6 max-w-[60ch] text-xs leading-relaxed text-ink-3">
          {dv.noKey('~/.ssh', t.setup.docsGuide)}
        </p>
      ) : null}
    </>
  )
}

function SummaryRow({ label, value, onEdit }: { readonly label: string; readonly value: ReactNode; onEdit(): void }): React.JSX.Element {
  const t = useT()
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)_auto] items-baseline gap-4 py-3.5">
      <dt className="text-xs font-[560] text-ink-3">{label}</dt>
      <dd className="min-w-0 text-[0.8125rem] text-ink-2">{value}</dd>
      <Button size="sm" variant="ghost" onClick={onEdit}>
        {t.setup.finish.change}
      </Button>
    </div>
  )
}

export function FinishStep({ draft, onChange, onJump }: { readonly draft: SetupDraft; onChange(next: SetupDraft): void; onJump(step: number): void }): React.JSX.Element {
  const t = useT()
  const f = t.setup.finish
  const projects = draft.projects.filter((p) => p.selected)
  return (
    <>
      <StepHeading title={f.title}>{f.intro}</StepHeading>
      <dl className="divide-y divide-line border-y border-line">
        <SummaryRow label={f.projectsRoot} value={<span className="font-mono text-xs break-all">{draft.projectsRoot}</span>} onEdit={() => onJump(1)} />
        <SummaryRow
          label={f.projects}
          value={projects.length ? f.projectsSummary(projects.length, projects.slice(0, 4).map((p) => p.name).join(', '), projects.length > 4) : f.projectsNone(t.frame.views.projects)}
          onEdit={() => onJump(1)}
        />
        <SummaryRow label={f.obsidian} value={draft.useVault && draft.vault.path ? <span className="font-mono text-xs break-all">{draft.vault.path}</span> : f.notConnected} onEdit={() => onJump(2)} />
        <SummaryRow label={f.devices} value={draft.devices.length ? draft.devices.map((d) => d.name).join(', ') : f.onlyThisPc} onEdit={() => onJump(3)} />
      </dl>
      <div className="mt-8">
        <Switch
          checked={draft.launchOnStartup}
          onChange={(v) => onChange({ ...draft, launchOnStartup: v })}
          label={f.launchLabel}
          description={f.launchDescription}
        />
      </div>
    </>
  )
}
