import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { FileText, FolderOpen, Wand2 } from 'lucide-react'
import type { AppInfo, HostId, NotificationSettings, OrchestratorSettings, Settings } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt } from '@renderer/api/call'
import { Button } from '@renderer/components/Button'
import { Field, Segmented, Switch } from '@renderer/components/Controls'
import { ViewHeader } from '@renderer/components/Section'
import { ErrorState, SkeletonRows } from '@renderer/components/States'
import { useSettings } from '@renderer/stores/settingsStore'
import { confirmAction } from '@renderer/stores/confirmStore'
import { useNav } from '@renderer/stores/navStore'
import { notify } from '@renderer/stores/toastStore'
import { hostIds, hostLabel } from '@renderer/lib/hosts'
import { PriceTable } from './PriceTable'
import { PrivacySection } from './PrivacySection'
import { DevicesSection } from './DevicesSection'
import { LinksSection } from './LinksSection'
import { LINKS_SETTINGS_ANCHOR } from '../links/LinkView'
import { NavigationSection } from './NavigationSection'
import { UpdatesSection } from './UpdatesSection'
import { UPDATES_SETTINGS_ANCHOR } from '@renderer/stores/updateStore'
import { Group, SaveBar, useDraft } from './parts'

interface VaultDraft {
  readonly host: HostId
  readonly path: string
  readonly todoFile: string
  readonly protocolDir: string
  readonly notesDir: string
  readonly claudeCommand: string
  readonly projectsRoot: string
}

function VaultGroup({ settings }: { readonly settings: Settings }): React.JSX.Element {
  const update = useSettings((s) => s.update)
  const source = useMemo<VaultDraft>(
    () => ({
      host: settings.vault.host,
      path: settings.vault.path,
      todoFile: settings.todoFile,
      protocolDir: settings.protocolDir,
      notesDir: settings.notesDir,
      claudeCommand: settings.claudeCommand,
      projectsRoot: settings.projectsRoot
    }),
    [settings]
  )
  const { draft, setDraft, dirty, reset } = useDraft<VaultDraft>(source)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof VaultDraft>(key: K, value: VaultDraft[K]): void => setDraft({ ...draft, [key]: value })

  const save = async (): Promise<void> => {
    setSaving(true)
    const ok = await update({
      vault: { host: draft.host, path: draft.path.trim() },
      todoFile: draft.todoFile.trim(),
      protocolDir: draft.protocolDir.trim(),
      notesDir: draft.notesDir.trim(),
      claudeCommand: draft.claudeCommand.trim() || 'claude',
      projectsRoot: draft.projectsRoot.trim() || settings.projectsRoot
    })
    setSaving(false)
    if (ok) {
      reset()
      notify.success('Ordner und Befehl gespeichert.')
    }
  }

  const pick = async (key: 'path' | 'projectsRoot'): Promise<void> => {
    const folder = await attempt(api.favorites.pickFolder())
    if (folder) set(key, folder)
  }

  return (
    <Group id="vault" title="Ordner und Notizen" description="Wo deine Projekte liegen, wo TODO-Datei und Protokolle im Obsidian-Vault liegen und mit welchem Befehl Claude Code startet.">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Projektordner" className="col-span-2" hint="Hier legt der Assistent neue Projekte an. Eine CLAUDE.md darin dient ihm als Checkliste.">
          {(id, d) => (
            <div className="flex gap-2">
              <input id={id} aria-describedby={d} value={draft.projectsRoot} onChange={(e) => set('projectsRoot', e.target.value)} className="field font-mono text-xs" spellCheck={false} />
              <Button size="md" icon={FolderOpen} onClick={() => void pick('projectsRoot')}>
                Wählen
              </Button>
            </div>
          )}
        </Field>
        {hostIds().length > 1 ? (
          <Field label="Vault liegt auf" className="col-span-2">
            {() => <Segmented<HostId> label="Vault liegt auf" value={draft.host} onChange={(v) => set('host', v)} options={hostIds().map((h) => ({ value: h, label: hostLabel(h) }))} />}
          </Field>
        ) : null}
        <Field label="Obsidian-Vault" className="col-span-2" hint="Leer lassen, wenn du kein Obsidian nutzt. TODOs und Protokolle bleiben dann leer.">
          {(id, d) => (
            <div className="flex gap-2">
              <input id={id} aria-describedby={d} value={draft.path} onChange={(e) => set('path', e.target.value)} className="field font-mono text-xs" spellCheck={false} placeholder="kein Vault" />
              {draft.host === 'local' ? (
                <Button size="md" icon={FolderOpen} onClick={() => void pick('path')}>
                  Wählen
                </Button>
              ) : null}
            </div>
          )}
        </Field>
        <Field label="TODO-Datei" hint="Relativ zum Vault">
          {(id, d) => <input id={id} aria-describedby={d} value={draft.todoFile} onChange={(e) => set('todoFile', e.target.value)} className="field font-mono text-xs" spellCheck={false} />}
        </Field>
        <Field label="Protokollordner" hint="Relativ zum Vault">
          {(id, d) => <input id={id} aria-describedby={d} value={draft.protocolDir} onChange={(e) => set('protocolDir', e.target.value)} className="field font-mono text-xs" spellCheck={false} />}
        </Field>
        <Field label="Projektnotizen" hint="Ordner im Vault mit einer Mappe je Projekt (z. B. „Projekte“); leer = Vault-Wurzel">
          {(id, d) => <input id={id} aria-describedby={d} value={draft.notesDir} onChange={(e) => set('notesDir', e.target.value)} className="field font-mono text-xs" spellCheck={false} />}
        </Field>
        <Field label="Claude-Befehl" hint="Wird im Projektordner ausgeführt, z. B. „claude“">
          {(id, d) => <input id={id} aria-describedby={d} value={draft.claudeCommand} onChange={(e) => set('claudeCommand', e.target.value)} className="field font-mono text-xs" spellCheck={false} />}
        </Field>
      </div>
      <SaveBar dirty={dirty} saving={saving} onSave={() => void save()} onReset={reset} />
    </Group>
  )
}

function AppGroup(): React.JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  useEffect(() => {
    void attempt(api.app.info()).then(setInfo)
  }, [])
  const rows: [string, ReactNode][] = info
    ? [
        ['Version', info.version],
        ['Plattform', info.platform],
        ['Build', info.packaged ? 'installiert' : 'Entwicklung'],
        ['Datenordner', <span className="font-mono text-2xs">{info.dataDir}</span>],
        ['Logdatei', <span className="font-mono text-2xs">{info.logFile}</span>]
      ]
    : []
  return (
    <Group id="app" title="App" description="Version, Speicherorte und Log für die Fehlersuche.">
      {!info ? <SkeletonRows rows={3} /> : null}
      {info ? (
        <>
          <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-y-2 text-xs">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-ink-3">{label}</dt>
                <dd className="truncate text-ink-2">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex gap-2">
            <Button size="sm" icon={FileText} onClick={() => void attempt(api.app.openLog())}>
              Log öffnen
            </Button>
            <Button size="sm" variant="ghost" icon={FolderOpen} onClick={() => void attempt(api.app.showInFolder(info.dataDir))}>
              Datenordner zeigen
            </Button>
          </div>
        </>
      ) : null}
    </Group>
  )
}

interface NotificationOption {
  readonly key: keyof NotificationSettings
  readonly label: string
  readonly description: string
}

const NOTIFICATION_OPTIONS: readonly NotificationOption[] = [
  { key: 'permission', label: 'Erlaubnis nötig', description: 'Claude wartet auf deine Freigabe, z. B. für einen Befehl.' },
  { key: 'question', label: 'Frage von Claude', description: 'Claude stellt eine Rückfrage.' },
  { key: 'done', label: 'Claude ist fertig', description: 'Eine Antwort ist abgeschlossen.' },
  { key: 'quotaFree', label: 'Kontingent wieder frei', description: 'Wenn das 5-Stunden-Kontingent zurückgesetzt wurde und Durchläufe warten.' }
]

function NotificationsGroup({ settings }: { readonly settings: Settings }): React.JSX.Element {
  const update = useSettings((s) => s.update)
  const current = settings.notifications
  return (
    <Group id="notifications" title="Benachrichtigungen" description="Desktop-Meldungen, wenn Claude in einem Terminal auf dich wartet.">
      <div className="space-y-4">
        {NOTIFICATION_OPTIONS.map((o) => (
          <Switch
            key={o.key}
            checked={current[o.key]}
            onChange={(v) => void update({ notifications: { ...current, [o.key]: v } })}
            label={o.label}
            description={o.description}
          />
        ))}
      </div>
      <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-3">
        Gilt für Terminals, die in der App gestartet werden (lokal und auf Geräten). Keine Meldung, wenn du das Terminal gerade ansiehst.
      </p>
    </Group>
  )
}

interface OrchestratorOption {
  readonly key: keyof OrchestratorSettings
  readonly label: string
  readonly description: string
}

const ORCHESTRATOR_OPTIONS: readonly OrchestratorOption[] = [
  { key: 'enabled', label: 'Orchestrator anbieten', description: 'Zeigt den Eintrag im Dialog „Neues Terminal“.' },
  { key: 'confirmBeforeSend', label: 'Vor dem Senden nachfragen', description: 'Claude Code fragt, bevor der Orchestrator ein Projekt öffnet oder einem Terminal schreibt.' }
]

function OrchestratorGroup({ settings }: { readonly settings: Settings }): React.JSX.Element {
  const update = useSettings((s) => s.update)
  const current = settings.orchestrator
  return (
    <Group id="orchestrator" title="Orchestrator" description="Ein Claude-Terminal, das Aufgaben an deine Projekte verteilt. Du öffnest es im Dialog „Neues Terminal“ ganz oben.">
      <div className="space-y-4">
        {ORCHESTRATOR_OPTIONS.map((o) => (
          <Switch
            key={o.key}
            checked={current[o.key]}
            onChange={(v) => void update({ orchestrator: { ...current, [o.key]: v } })}
            label={o.label}
            description={o.description}
          />
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-4">
        <p className="text-xs leading-relaxed text-ink-3">Änderungen wirken beim nächsten Öffnen des Orchestrators. Seine Regeln stehen in einer eigenen CLAUDE.md.</p>
        <Button size="sm" icon={FileText} onClick={() => void attempt(api.orchestrator.openClaudeMd())}>
          CLAUDE.md öffnen
        </Button>
      </div>
    </Group>
  )
}

export function SettingsView(): React.JSX.Element {
  const settings = useSettings((s) => s.settings)
  const error = useSettings((s) => s.error)
  const load = useSettings((s) => s.load)
  const update = useSettings((s) => s.update)
  const anchor = useNav((s) => s.settingsAnchor)

  // Sprung aus Seitenleiste oder Gerätebereich zu einem Abschnitt, danach den Wunsch vergessen.
  useEffect(() => {
    if (!anchor || !settings) return
    requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    useNav.setState({ settingsAnchor: null })
  }, [anchor, settings])

  const restartSetup = async (): Promise<void> => {
    const ok = await confirmAction({
      title: 'Einrichtung erneut starten?',
      message: 'Der Assistent führt noch einmal durch Projektordner, Notizen und Geräte. Vorhandene Projekte, Geräte und Daten bleiben erhalten.',
      confirmLabel: 'Einrichtung starten'
    })
    if (ok) await update({ setupDone: false })
  }

  return (
    <div className="flex h-full flex-col">
      <ViewHeader title="Einstellungen">Änderungen gelten sofort nach dem Speichern</ViewHeader>
      <div className="@container/main flex-1 overflow-y-auto px-8 pb-12">
        <div className="gap-x-14 @min-[110rem]/main:columns-2">
          {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
          {!settings && !error ? <SkeletonRows rows={6} /> : null}
          {settings ? (
            <>
              <VaultGroup settings={settings} />
              <Group id="devices" title="Geräte" description="Weitere Rechner per SSH: Verbrauch, Systemwerte, Git-Stand und Terminals. Jedes Gerät bekommt einen eigenen Eintrag in der Seitenleiste.">
                <DevicesSection settings={settings} />
              </Group>
              <Group id={LINKS_SETTINGS_ANCHOR} title="Webseiten" description="Seiten wie Home Assistant, Router oder ein Server-Panel als eigene Ansicht in der App. Sie stehen in der Seitenleiste unter „Verknüpfungen“, auf Wunsch eingerückt unter einem Gerät.">
                <LinksSection settings={settings} />
              </Group>
              <Group id="navigation" title="Seitenleiste" description="Gruppen und Reihenfolge der Bereiche. Die Übersicht ordnest du direkt dort über „Anpassen“.">
                <NavigationSection settings={settings} />
              </Group>
              <Group id="system" title="System" description="Verhalten beim Anmelden und erste Einrichtung.">
                <Switch
                  checked={settings.launchOnStartup}
                  onChange={(v) => void update({ launchOnStartup: v }).then((ok) => ok && notify.success(v ? 'Startet beim Anmelden.' : 'Startet nicht mehr beim Anmelden.'))}
                  label="Beim Anmelden starten"
                  description="Die App öffnet sich nach der Anmeldung automatisch (nur in der installierten Version)."
                />
                <div className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-4">
                  <p className="text-xs leading-relaxed text-ink-3">Einrichtungsassistent erneut durchlaufen, z. B. nach einem Umzug der Ordner oder um einen Vorschlag aus ai-interface-setup.json zu übernehmen.</p>
                  <Button size="sm" icon={Wand2} onClick={() => void restartSetup()}>
                    Einrichtung starten
                  </Button>
                </div>
              </Group>
              <Group id={UPDATES_SETTINGS_ANCHOR} title="Updates" description="Neue Stände kommen von GitHub. Gebaut wird im lokalen Repo, vor der Installation wird die Datenbank gesichert.">
                <UpdatesSection settings={settings} />
              </Group>
              <NotificationsGroup settings={settings} />
              <OrchestratorGroup settings={settings} />
              <Group id="privacy" title="Privatmodus" description="Blendet private Projekte überall in der App aus, auch in Summen und Diagrammen. Sichtschutz, keine Verschlüsselung der Dateien.">
                <PrivacySection />
              </Group>
              <Group id="prices" title="Preise" description="USD pro Million Token. Modell-IDs gelten als Präfix, z. B. deckt „claude-opus-5-5“ auch datierte Varianten ab.">
                <PriceTable
                  prices={settings.prices}
                  onSave={async (prices) => {
                    const ok = await update({ prices })
                    if (ok) notify.success('Preise gespeichert. Kosten werden neu berechnet.')
                    return ok
                  }}
                />
              </Group>
              <AppGroup />
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
