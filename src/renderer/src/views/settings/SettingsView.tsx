import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { FileText, FolderOpen, Wand2 } from 'lucide-react'
import type { AppInfo, HostId, NotesStorageMode, NotificationSettings, OrchestratorSettings, Settings, SourceOpenMode } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt } from '@renderer/api/call'
import { Button } from '@renderer/components/Button'
import { Field, Segmented, Switch } from '@renderer/components/Controls'
import { ViewHeader } from '@renderer/components/Section'
import { ErrorState, SkeletonRows } from '@renderer/components/States'
import { useSettings } from '@renderer/stores/settingsStore'
import { useTodos } from '@renderer/stores/todoStore'
import { confirmAction } from '@renderer/stores/confirmStore'
import { useNav } from '@renderer/stores/navStore'
import { notify } from '@renderer/stores/toastStore'
import { hostIds, hostLabel } from '@renderer/lib/hosts'
import { PriceTable } from './PriceTable'
import { PrivacySection } from './PrivacySection'
import { DevicesSection } from './DevicesSection'
import { LinksSection } from './LinksSection'
import { LINKS_SETTINGS_ANCHOR } from '../links/LinkView'
import { SOURCES_SETTINGS_ANCHOR } from '../sources/SourcesView'
import { LanguageSection } from './LanguageSection'
import { currentT, useT } from '@renderer/i18n/useT'
import { NavigationSection } from './NavigationSection'
import { UpdatesSection } from './UpdatesSection'
import { UPDATES_SETTINGS_ANCHOR } from '@renderer/stores/updateStore'
import { Group, SaveBar, useDraft } from './parts'

interface VaultDraft {
  readonly storage: NotesStorageMode
  readonly host: HostId
  readonly path: string
  readonly todoFile: string
  readonly protocolDir: string
  readonly notesDir: string
  readonly claudeCommand: string
  readonly projectsRoot: string
}

function VaultGroup({ settings }: { readonly settings: Settings }): React.JSX.Element {
  const v = useT().settings.vault
  const update = useSettings((s) => s.update)
  const source = useMemo<VaultDraft>(
    () => ({
      storage: settings.storage,
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
  const [appNotesDir, setAppNotesDir] = useState<string | null>(null)
  useEffect(() => {
    void attempt(api.app.info()).then((info) => setAppNotesDir(info?.notesDir ?? null))
  }, [])
  const set = <K extends keyof VaultDraft>(key: K, value: VaultDraft[K]): void => setDraft({ ...draft, [key]: value })

  const save = async (): Promise<void> => {
    setSaving(true)
    const storageChanged = draft.storage !== settings.storage || draft.path.trim() !== settings.vault.path || draft.host !== settings.vault.host
    const ok = await update({
      storage: draft.storage,
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
      if (storageChanged) void useTodos.getState().load()
      notify.success(currentT().settings.vault.saved)
    }
  }

  const pick = async (key: 'path' | 'projectsRoot'): Promise<void> => {
    const folder = await attempt(api.favorites.pickFolder())
    if (folder) set(key, folder)
  }

  return (
    <Group id="vault" title={v.title} description={v.description}>
      <div className="grid grid-cols-2 gap-4">
        <Field label={v.projectsRoot} className="col-span-2" hint={v.projectsRootHint}>
          {(id, d) => (
            <div className="flex gap-2">
              <input id={id} aria-describedby={d} value={draft.projectsRoot} onChange={(e) => set('projectsRoot', e.target.value)} className="field font-mono text-xs" spellCheck={false} />
              <Button size="md" icon={FolderOpen} onClick={() => void pick('projectsRoot')}>
                {v.choose}
              </Button>
            </div>
          )}
        </Field>
        <Field label={v.storage} className="col-span-2">
          {() => (
            <Segmented<NotesStorageMode>
              label={v.storage}
              value={draft.storage}
              onChange={(value) => set('storage', value)}
              options={[
                { value: 'app', label: v.storageApp },
                { value: 'obsidian', label: v.storageObsidian }
              ]}
            />
          )}
        </Field>
        {draft.storage === 'app' ? (
          <Field label={v.appFolder} className="col-span-2" hint={v.appFolderHint}>
            {(id, d) => (
              <div className="flex gap-2">
                <input id={id} aria-describedby={d} value={appNotesDir ?? ''} readOnly className="field font-mono text-xs text-ink-2" spellCheck={false} />
                {appNotesDir ? (
                  <Button size="md" icon={FolderOpen} onClick={() => void attempt(api.app.showInFolder(appNotesDir))}>
                    {v.showFolder}
                  </Button>
                ) : null}
              </div>
            )}
          </Field>
        ) : (
          <>
          {hostIds().length > 1 ? (
            <Field label={v.host} className="col-span-2">
              {() => <Segmented<HostId> label={v.host} value={draft.host} onChange={(v) => set('host', v)} options={hostIds().map((h) => ({ value: h, label: hostLabel(h) }))} />}
            </Field>
          ) : null}
          <Field label={v.vault} className="col-span-2" hint={v.vaultHint}>
            {(id, d) => (
              <div className="flex gap-2">
                <input id={id} aria-describedby={d} value={draft.path} onChange={(e) => set('path', e.target.value)} className="field font-mono text-xs" spellCheck={false} placeholder={v.vaultPlaceholder} />
                {draft.host === 'local' ? (
                  <Button size="md" icon={FolderOpen} onClick={() => void pick('path')}>
                    {v.choose}
                  </Button>
                ) : null}
              </div>
            )}
          </Field>
          <Field label={v.todoFile} hint={v.relativeToVault}>
            {(id, d) => <input id={id} aria-describedby={d} value={draft.todoFile} onChange={(e) => set('todoFile', e.target.value)} className="field font-mono text-xs" spellCheck={false} />}
          </Field>
          <Field label={v.protocolDir} hint={v.relativeToVault}>
            {(id, d) => <input id={id} aria-describedby={d} value={draft.protocolDir} onChange={(e) => set('protocolDir', e.target.value)} className="field font-mono text-xs" spellCheck={false} />}
          </Field>
          <Field label={v.notesDir} hint={v.notesDirHint}>
            {(id, d) => <input id={id} aria-describedby={d} value={draft.notesDir} onChange={(e) => set('notesDir', e.target.value)} className="field font-mono text-xs" spellCheck={false} />}
          </Field>
          </>
        )}
        <Field label={v.claudeCommand} hint={v.claudeCommandHint}>
          {(id, d) => <input id={id} aria-describedby={d} value={draft.claudeCommand} onChange={(e) => set('claudeCommand', e.target.value)} className="field font-mono text-xs" spellCheck={false} />}
        </Field>
      </div>
      <SaveBar dirty={dirty} saving={saving} onSave={() => void save()} onReset={reset} />
    </Group>
  )
}

function AppGroup(): React.JSX.Element {
  const a = useT().settings.app
  const [info, setInfo] = useState<AppInfo | null>(null)
  useEffect(() => {
    void attempt(api.app.info()).then(setInfo)
  }, [])
  const rows: [string, ReactNode][] = info
    ? [
        [a.version, info.version],
        [a.platform, info.platform],
        [a.build, info.packaged ? a.buildInstalled : a.buildDev],
        [a.dataDir, <span className="font-mono text-2xs">{info.dataDir}</span>],
        [a.logFile, <span className="font-mono text-2xs">{info.logFile}</span>]
      ]
    : []
  return (
    <Group id="app" title={a.title} description={a.description}>
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
              {a.openLog}
            </Button>
            <Button size="sm" variant="ghost" icon={FolderOpen} onClick={() => void attempt(api.app.showInFolder(info.dataDir))}>
              {a.showDataDir}
            </Button>
          </div>
        </>
      ) : null}
    </Group>
  )
}

function SourcesGroup({ settings }: { readonly settings: Settings }): React.JSX.Element {
  const t = useT()
  const s = t.settings.sources
  const options: readonly { readonly value: SourceOpenMode; readonly label: string }[] = [
    { value: 'app', label: s.optionApp },
    { value: 'browser', label: s.optionBrowser }
  ]
  const update = useSettings((s) => s.update)
  const current = settings.sources
  const change = (openIn: SourceOpenMode): void => {
    void update({ sources: { ...current, openIn } }).then((ok) => ok && notify.success(openIn === 'app' ? currentT().settings.sources.savedApp : currentT().settings.sources.savedBrowser))
  }
  return (
    <Group id={SOURCES_SETTINGS_ANCHOR} title={s.title} description={s.description(t.nav.groups.websites)}>
      <Field label={s.openIn} hint={current.openIn === 'app' ? s.hintApp(t.links.openBrowser) : s.hintBrowser}>
        {() => <Segmented<SourceOpenMode> label={s.openInAria} value={current.openIn} onChange={change} options={options} />}
      </Field>
    </Group>
  )
}

const NOTIFICATION_KEYS: readonly (keyof NotificationSettings)[] = ['permission', 'question', 'done', 'quotaFree']

function NotificationsGroup({ settings }: { readonly settings: Settings }): React.JSX.Element {
  const n = useT().settings.notifications
  const update = useSettings((s) => s.update)
  const current = settings.notifications
  return (
    <Group id="notifications" title={n.title} description={n.description}>
      <div className="space-y-4">
        {NOTIFICATION_KEYS.map((key) => (
          <Switch
            key={key}
            checked={current[key]}
            onChange={(v) => void update({ notifications: { ...current, [key]: v } })}
            label={n[key].label}
            description={n[key].description}
          />
        ))}
      </div>
      <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-3">
        {n.footnote}
      </p>
    </Group>
  )
}

const ORCHESTRATOR_KEYS: readonly (keyof OrchestratorSettings)[] = ['enabled', 'confirmBeforeSend']

function OrchestratorGroup({ settings }: { readonly settings: Settings }): React.JSX.Element {
  const t = useT()
  const o = t.settings.orchestrator
  const newTerminal = t.terminal.newTerminalTitle
  const optionText = (key: keyof OrchestratorSettings): { readonly label: string; readonly description: string } =>
    key === 'enabled' ? { label: o.enabled.label, description: o.enabled.description(newTerminal) } : o.confirmBeforeSend
  const update = useSettings((s) => s.update)
  const current = settings.orchestrator
  return (
    <Group id="orchestrator" title={o.title} description={o.description(newTerminal)}>
      <div className="space-y-4">
        {ORCHESTRATOR_KEYS.map((key) => (
          <Switch
            key={key}
            checked={current[key]}
            onChange={(v) => void update({ orchestrator: { ...current, [key]: v } })}
            label={optionText(key).label}
            description={optionText(key).description}
          />
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-4">
        <p className="text-xs leading-relaxed text-ink-3">{o.footnote}</p>
        <Button size="sm" icon={FileText} onClick={() => void attempt(api.orchestrator.openClaudeMd())}>
          {o.openClaudeMd}
        </Button>
      </div>
    </Group>
  )
}

export function SettingsView(): React.JSX.Element {
  const t = useT()
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
    const sys = currentT().settings.system
    const ok = await confirmAction({ title: sys.restartTitle, message: sys.restartMessage, confirmLabel: sys.restartButton })
    if (ok) await update({ setupDone: false })
  }

  return (
    <div className="flex h-full flex-col">
      <ViewHeader title={t.frame.views.settings}>{t.settings.subtitle}</ViewHeader>
      <div className="@container/main flex-1 overflow-y-auto px-8 pb-12">
        <div className="gap-x-14 @min-[110rem]/main:columns-2">
          {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
          {!settings && !error ? <SkeletonRows rows={6} /> : null}
          {settings ? (
            <>
              <Group id="language" title={t.settings.languageTitle} description={t.settings.languageDescription}>
                <LanguageSection settings={settings} />
              </Group>
              <VaultGroup settings={settings} />
              <Group id="devices" title={t.settings.devices.title} description={t.settings.devices.description}>
                <DevicesSection settings={settings} />
              </Group>
              <Group id={LINKS_SETTINGS_ANCHOR} title={t.settings.links.title} description={t.settings.links.description(t.nav.groups.devices)}>
                <LinksSection settings={settings} />
              </Group>
              <SourcesGroup settings={settings} />
              <Group id="navigation" title={t.settings.navigation.title} description={t.settings.navigation.description}>
                <NavigationSection settings={settings} />
              </Group>
              <Group id="system" title={t.settings.system.title} description={t.settings.system.description}>
                <Switch
                  checked={settings.launchOnStartup}
                  onChange={(v) => void update({ launchOnStartup: v }).then((ok) => ok && notify.success(v ? currentT().settings.system.launchOn : currentT().settings.system.launchOff))}
                  label={t.settings.system.launchLabel}
                  description={t.settings.system.launchDescription}
                />
                <div className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-4">
                  <p className="text-xs leading-relaxed text-ink-3">{t.settings.system.restartNote}</p>
                  <Button size="sm" icon={Wand2} onClick={() => void restartSetup()}>
                    {t.settings.system.restartButton}
                  </Button>
                </div>
              </Group>
              <Group id={UPDATES_SETTINGS_ANCHOR} title={t.settings.updates.title} description={t.settings.updates.description}>
                <UpdatesSection settings={settings} />
              </Group>
              <NotificationsGroup settings={settings} />
              <OrchestratorGroup settings={settings} />
              <Group id="privacy" title={t.settings.privacy.title} description={t.settings.privacy.description}>
                <PrivacySection />
              </Group>
              <Group id="prices" title={t.settings.prices.title} description={t.settings.prices.description}>
                <PriceTable
                  prices={settings.prices}
                  onSave={async (prices) => {
                    const ok = await update({ prices })
                    if (ok) notify.success(currentT().settings.prices.saved)
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
