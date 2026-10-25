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
  const pick = async (): Promise<void> => {
    const folder = await attempt(api.favorites.pickFolder())
    if (folder) onChange(folder)
  }
  return (
    <div className="flex gap-2">
      <input id={id} aria-describedby={describedBy} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field font-mono text-xs" spellCheck={false} />
      <Button icon={FolderOpen} onClick={() => void pick()}>
        Wählen
      </Button>
    </div>
  )
}

const FEATURES: readonly { readonly icon: typeof FolderGit2; readonly title: string; readonly text: string }[] = [
  { icon: FolderGit2, title: 'Projekte', text: 'Deine Code-Ordner. Ein Klick startet Claude Code im eingebauten Terminal, die App zählt Zeit und Token je Projekt.' },
  { icon: BookOpen, title: 'Notizen', text: 'Optional ein Obsidian-Vault: TODO-Liste und Protokolle direkt in der App.' },
  { icon: Server, title: 'Geräte', text: 'Optional weitere Rechner per SSH, etwa ein Server: Verbrauch, Systemwerte, Git-Stand, Terminals.' }
]

export function WelcomeStep({ detection, draft }: { readonly detection: SetupDetection; readonly draft: SetupDraft }): React.JSX.Element {
  const proposal = detection.proposal
  return (
    <>
      <StepHeading title={detection.existingInstall ? 'Einrichtung prüfen' : 'AI Interface einrichten'}>
        Die Steuerzentrale für deine Arbeit mit Claude Code. Drei kurze Fragen, dann geht es los; die App hat schon nachgesehen, was auf diesem Rechner liegt.
      </StepHeading>
      <ul className="divide-y divide-line border-y border-line">
        {FEATURES.map((f) => (
          <li key={f.title} className="flex gap-4 py-4">
            <f.icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden strokeWidth={1.75} />
            <div>
              <p className="text-[0.875rem] font-[600] text-ink">{f.title}</p>
              <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-3">{f.text}</p>
            </div>
          </li>
        ))}
      </ul>
      {proposal ? (
        <div className="mt-8 flex gap-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3.5">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0 text-[0.8125rem] leading-relaxed text-ink-2">
            <p className="font-[600] text-ink">Vorschlag gefunden und übernommen</p>
            <p>
              Aus <span className="font-mono text-xs break-all">{detection.proposalPath}</span>: {draft.projects.length} Projekte, {draft.devices.length} Geräte
              {draft.useVault ? ', Obsidian-Vault' : ''}. Du kannst in jedem Schritt noch ändern.
            </p>
          </div>
        </div>
      ) : detection.proposalError ? (
        <div role="alert" className="mt-8 flex gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3.5 text-[0.8125rem] leading-relaxed text-danger-ink">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <span className="font-[600]">Vorschlagsdatei nicht lesbar.</span> {detection.proposalError} Die Einrichtung läuft trotzdem; korrigiere die Datei und starte die Einrichtung später erneut.
          </p>
        </div>
      ) : (
        <p className="mt-8 flex gap-2.5 text-xs leading-relaxed text-ink-3">
          <FileJson className="mt-px size-4 shrink-0" aria-hidden />
          <span>
            Tipp: Gib Claude die Vorlage <span className="font-mono">docs/CLAUDE-TEMPLATE.md</span> aus dem Repository. Claude sieht sich deinen Rechner an und schreibt{' '}
            <span className="font-mono break-all">{detection.proposalPath}</span>; diese Einrichtung übernimmt den Vorschlag dann automatisch.
          </span>
        </p>
      )}
    </>
  )
}

function ProjectRow({ project, onToggle }: { readonly project: ProjectChoice; onToggle(): void }): React.JSX.Element {
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
        {project.fromProposal ? <span className="rounded-full bg-accent-soft px-2 text-2xs font-[560] text-accent-text">Vorschlag</span> : null}
        {/* Feste Spalten, damit Git-Symbol und CLAUDE.md über alle Zeilen untereinander stehen. */}
        <span className="flex w-3.5 shrink-0 justify-center">{project.isGit ? <GitBranch className="size-3.5 text-ink-3" aria-label="Git-Repository" /> : null}</span>
        <span className="w-[4.5rem] shrink-0 text-right font-mono text-2xs text-ink-3">{project.hasClaudeMd ? 'CLAUDE.md' : null}</span>
      </label>
    </li>
  )
}

export function ProjectsStep({ detection, draft, onChange }: StepProps): React.JSX.Element {
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
      <StepHeading title="Wo liegen deine Projekte?">
        Der Ordner, in dem deine Code-Projekte liegen. Darunter gefundene Ordner kannst du gleich als Projekte übernehmen; Git-Repositories sind vorausgewählt.
      </StepHeading>
      <Field label="Projektordner" hint="Hier legt der Assistent der App später auch neue Projekte an.">
        {(id, d) => <PathInput id={id} describedBy={d} value={draft.projectsRoot} onChange={(v) => onChange({ ...draft, projectsRoot: v })} />}
      </Field>
      <Suggestions items={detection.projectRootCandidates} current={draft.projectsRoot} label="Gefunden:" onPick={(v) => void scan(v)} />

      <div className="mt-8 flex items-end justify-between gap-4 border-b border-line pb-2">
        <div>
          <h2 className="text-[0.875rem] font-[620] text-ink">Projekte übernehmen</h2>
          <p className="num mt-0.5 text-xs text-ink-3">
            {draft.projects.length ? `${selected} von ${draft.projects.length} ausgewählt` : scanning ? 'Lese Ordner …' : 'Noch nichts eingelesen'}
          </p>
        </div>
        <div className="flex gap-1">
          {draft.projects.length ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setAll(true)}>
                Alle
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAll(false)}>
                Keine
              </Button>
            </>
          ) : null}
          <Button size="sm" icon={RefreshCw} loading={scanning} disabled={!draft.projectsRoot.trim()} onClick={() => void scan(draft.projectsRoot)}>
            Ordner einlesen
          </Button>
        </div>
      </div>
      {draft.projects.length ? (
        <ul className="max-h-[22rem] overflow-y-auto py-1">
          {draft.projects.map((p) => (
            <ProjectRow key={choiceKey(p)} project={p} onToggle={() => toggle(choiceKey(p))} />
          ))}
        </ul>
      ) : (
        <p className="py-5 text-[0.8125rem] leading-relaxed text-ink-3">
          {scannedRoot ? `In ${scannedRoot} liegen keine Unterordner. Du kannst Projekte auch später unter „Projekte“ eintragen.` : 'Ordner wählen und einlesen. Projekte lassen sich auch später unter „Projekte“ eintragen.'}
        </p>
      )}
    </>
  )
}

export function NotesStep({ detection, draft, onChange }: StepProps): React.JSX.Element {
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
      <StepHeading title="Nutzt du Obsidian?">
        Mit einem Vault zeigt die App deine TODO-Liste (Obsidian-Tasks-Format) und Protokolle aus Markdown-Dateien. Ohne Vault fehlen nur diese beiden Bereiche.
      </StepHeading>
      <Switch checked={draft.useVault} onChange={(v) => onChange({ ...draft, useVault: v })} label="Obsidian-Vault verbinden" description="Die App liest und schreibt nur die TODO-Datei; Protokolle werden nur gelesen." />
      {draft.useVault ? (
        <div className="mt-8 space-y-6">
          <div>
            <Field label="Vault-Ordner">{(id, d) => <PathInput id={id} describedBy={d} value={vault.path} onChange={(v) => setVault({ path: v })} placeholder="Ordner mit .obsidian darin" />}</Field>
            <Suggestions items={detection.vaultCandidates} current={vault.path} label="Gefunden:" onPick={(v) => setVault({ path: v })} />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 max-md:grid-cols-1">
            <div>
              <Field label="TODO-Datei" hint="Relativ zum Vault; wird angelegt, falls sie fehlt">
                {(id, d) => <input id={id} aria-describedby={d} list="setup-todo-files" value={vault.todoFile} onChange={(e) => setVault({ todoFile: e.target.value })} className="field font-mono text-xs" spellCheck={false} />}
              </Field>
              <datalist id="setup-todo-files">{scan?.todoFiles.map((f) => <option key={f} value={f} />)}</datalist>
              <Suggestions items={scan?.todoFiles ?? []} current={vault.todoFile} label="Im Vault:" onPick={(v) => setVault({ todoFile: v })} />
            </div>
            <div>
              <Field label="Protokollordner" hint="Relativ zum Vault, Markdown je Tag">
                {(id, d) => <input id={id} aria-describedby={d} value={vault.protocolDir} onChange={(e) => setVault({ protocolDir: e.target.value })} className="field font-mono text-xs" spellCheck={false} />}
              </Field>
              <Suggestions items={scan?.protocolDirs ?? []} current={vault.protocolDir} label="Im Vault:" onPick={(v) => setVault({ protocolDir: v })} />
            </div>
            <div className="col-span-2 max-md:col-span-1">
              <Field label="Ordner für Projektnotizen" hint="Optional: Mappe mit einem Unterordner je Projekt, z. B. „Projekte“. Darin gefundene Protokoll-Ordner ordnet die App dem Projekt zu.">
                {(id, d) => <input id={id} aria-describedby={d} value={vault.notesDir} onChange={(e) => setVault({ notesDir: e.target.value })} className="field font-mono text-xs" spellCheck={false} placeholder="Vault-Wurzel" />}
              </Field>
              <Suggestions items={scan?.topDirs ?? []} current={vault.notesDir} label="Ordner:" onPick={(v) => setVault({ notesDir: v })} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export function DevicesStep({ detection, draft, onChange }: StepProps): React.JSX.Element {
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
      <StepHeading title="Weitere Rechner anbinden?">
        Server, Mini-PC, NAS oder Raspberry Pi, die du per SSH erreichst. Jedes Gerät bekommt einen eigenen Bereich in der Seitenleiste. Brauchst du nicht? Einfach überspringen.
      </StepHeading>
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
              <IconButton size="sm" icon={Pencil} label={`${d.name} bearbeiten`} onClick={() => setEditing({ device: d, index: i })} />
              <IconButton size="sm" icon={Trash2} tone="danger" label={`${d.name} entfernen`} onClick={() => remove(i)} />
            </li>
          ))}
        </ul>
      ) : null}
      {editing ? (
        <section aria-label={editing.index === null ? 'Neues Gerät' : 'Gerät bearbeiten'} className="rounded-lg border border-line bg-canvas/60 p-5">
          <DeviceForm value={editing.device} others={draft.devices.filter((_, i) => i !== editing.index)} onChange={(device) => setEditing({ ...editing, device })} />
          <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Abbrechen
            </Button>
            <Button variant="soft" disabled={deviceError(editing.device, draft.devices.filter((_, i) => i !== editing.index)) !== null} onClick={save}>
              {editing.index === null ? 'Gerät übernehmen' : 'Änderungen übernehmen'}
            </Button>
          </div>
        </section>
      ) : (
        <Button icon={Plus} onClick={() => setEditing({ device: newDevice(draft.devices, keyPath), index: null })}>
          Gerät hinzufügen
        </Button>
      )}
      {!keyPath && !draft.devices.length ? (
        <p className="mt-6 max-w-[60ch] text-xs leading-relaxed text-ink-3">
          Auf diesem PC liegt noch kein SSH-Schlüssel unter <span className="font-mono">~/.ssh</span>. Wie du einen anlegst und auf das Gerät kopierst, steht in <span className="font-mono">docs/EINRICHTUNG.md</span>.
        </p>
      ) : null}
    </>
  )
}

function SummaryRow({ label, value, onEdit }: { readonly label: string; readonly value: ReactNode; onEdit(): void }): React.JSX.Element {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)_auto] items-baseline gap-4 py-3.5">
      <dt className="text-xs font-[560] text-ink-3">{label}</dt>
      <dd className="min-w-0 text-[0.8125rem] text-ink-2">{value}</dd>
      <Button size="sm" variant="ghost" onClick={onEdit}>
        Ändern
      </Button>
    </div>
  )
}

export function FinishStep({ draft, onChange, onJump }: { readonly draft: SetupDraft; onChange(next: SetupDraft): void; onJump(step: number): void }): React.JSX.Element {
  const projects = draft.projects.filter((p) => p.selected)
  return (
    <>
      <StepHeading title="Alles bereit">Ein letzter Blick. Danach öffnet sich die Übersicht; Verbrauch und Projekte füllen sich, sobald du mit Claude Code arbeitest.</StepHeading>
      <dl className="divide-y divide-line border-y border-line">
        <SummaryRow label="Projektordner" value={<span className="font-mono text-xs break-all">{draft.projectsRoot}</span>} onEdit={() => onJump(1)} />
        <SummaryRow
          label="Projekte"
          value={projects.length ? `${projects.length} übernehmen: ${projects.slice(0, 4).map((p) => p.name).join(', ')}${projects.length > 4 ? ' …' : ''}` : 'keine, später unter „Projekte“'}
          onEdit={() => onJump(1)}
        />
        <SummaryRow label="Obsidian" value={draft.useVault && draft.vault.path ? <span className="font-mono text-xs break-all">{draft.vault.path}</span> : 'nicht verbunden'} onEdit={() => onJump(2)} />
        <SummaryRow label="Geräte" value={draft.devices.length ? draft.devices.map((d) => d.name).join(', ') : 'nur dieser PC'} onEdit={() => onJump(3)} />
      </dl>
      <div className="mt-8">
        <Switch
          checked={draft.launchOnStartup}
          onChange={(v) => onChange({ ...draft, launchOnStartup: v })}
          label="Beim Anmelden starten"
          description="Die App öffnet sich nach der Anmeldung automatisch (nur in der installierten Version)."
        />
      </div>
    </>
  )
}
