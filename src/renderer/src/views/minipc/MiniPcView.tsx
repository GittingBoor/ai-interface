import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, FolderGit2, LayoutGrid as LayoutIcon, Play, RefreshCw, RotateCcw, ServerOff, Settings2, SquareTerminal } from 'lucide-react'
import { LayoutGrid, usePageLayout, type LayoutSection } from '@renderer/components/LayoutGrid'
import type { DeviceSettings, HostId, LaunchMode } from '@shared/types'
import type { Messages } from '@shared/i18n/messages'
import { Button } from '@renderer/components/Button'
import { FolderBrowser } from '@renderer/components/FolderBrowser'
import { HostBadge } from '@renderer/components/Host'
import { Section, ViewHeader } from '@renderer/components/Section'
import { EmptyState, ErrorState, Skeleton, SkeletonRows } from '@renderer/components/States'
import { MiniPcOfflineIllustration } from '@renderer/components/EmptyIllustrations'
import { useNav } from '@renderer/stores/navStore'
import { useSettings } from '@renderer/stores/settingsStore'
import { useTerminals } from '@renderer/stores/terminalStore'
import { projectsDirOf, useMiniPc } from '@renderer/stores/miniPcStore'
import { useClaudeAuth } from '@renderer/stores/claudeAuthStore'
import { useT } from '@renderer/i18n/useT'
import { claudeAuthView, type ClaudeAuthLevel } from '@renderer/lib/claudeAuth'
import { useDevices } from '@renderer/lib/hosts'
import { useInterval, useNow } from '@renderer/lib/hooks'
import { baseName, formatTime } from '@renderer/lib/format'
import { SystemCard } from './SystemCard'
import { GitTable } from './GitTable'
import { ClaudeSessions } from './ClaudeSessions'
import { OllamaList } from './OllamaList'
import { HistorySection } from './HistorySection'
import { ThermalSection } from './ThermalSection'
import { InfoError } from './parts'
import { CpuDetails } from './CpuDetails'
import { MemoryDetails } from './MemoryDetails'
import { DriveList } from './DriveList'
import { NetworkTable } from './NetworkTable'
import { DockerTable } from './DockerTable'
import { ProcessTable } from './ProcessTable'
import { DeviceFacts } from './DeviceFacts'

/** Snapshot nur, solange der Bereich sichtbar ist (die Seite wird beim Wechsel ausgehängt). */
const SNAPSHOT_POLL_MS = 10_000
/** Gerät und Docker kosten das Gerät mehr als der Snapshot, daher nur alle fünf Minuten. */
const INFO_POLL_MS = 300_000
const CLOCK_TICK_MS = 30_000
/** Zwei Detailbereiche nebeneinander, sobald die rechte Spalte breit genug ist. */
/** Schlüssel der gespeicherten Anordnung (gilt für alle Geräte). */
const PAGE = 'device'
const SKELETON_METERS = [0, 1, 2] as const
const SKELETON_CHARTS = [0, 1, 2, 3] as const

function refreshAll(): void {
  const store = useMiniPc.getState()
  void store.loadSnapshot()
  void store.loadInfo()
  void store.loadGit()
  void store.loadOllama()
}

/** Das angezeigte Gerät (aus der Navigation). */
function useDevice(): DeviceSettings | undefined {
  const id = useNav((s) => s.deviceId)
  return useDevices().find((d) => d.id === id)
}

function useDeviceId(): HostId {
  return useNav((s) => s.deviceId) ?? ''
}

const AUTH_TEXT: Readonly<Record<ClaudeAuthLevel, string>> = { ok: '', warn: 'text-warn', expired: 'text-danger-ink', unknown: '', none: '' }

/** Restlaufzeit der Claude-Anmeldung auf dem Gerät; Tooltip mit Datum bzw. Anleitung zum Neuanmelden. */
function ClaudeAuthStatus({ host, now }: { readonly host: HostId; readonly now: number }): React.JSX.Element | null {
  const auth = useClaudeAuth((s) => s.byHost[host])
  const checking = useClaudeAuth((s) => s.checking.includes(host))
  const t = useT().device
  const view = claudeAuthView(auth, now, t)
  if (!view.label) return null
  return (
    <span className="flex items-center gap-1">
      <span aria-hidden className="text-ink-3/60">
        ·
      </span>
      <span title={view.hint ?? undefined} className={`num ${AUTH_TEXT[view.level]}`}>
        {view.label}
        {view.hint ? <span className="sr-only">. {view.hint}</span> : null}
      </span>
      <button
        type="button"
        onClick={() => void useClaudeAuth.getState().check(host)}
        disabled={checking}
        aria-label={t.authRecheck}
        title={t.authRecheck}
        className="grid size-5 place-items-center rounded text-ink-3 transition-colors hover:bg-raised hover:text-ink-2 disabled:opacity-60"
      >
        <RefreshCw className={`size-3 ${checking ? 'animate-spin' : ''}`} aria-hidden strokeWidth={2} />
      </button>
    </span>
  )
}

function StatusLine(): React.JSX.Element {
  const host = useDeviceId()
  const snapshot = useMiniPc((s) => s.snapshot)
  const loading = useMiniPc((s) => s.snapshotLoading)
  const now = useNow(CLOCK_TICK_MS)
  const t = useT().device
  const text = !snapshot ? (loading ? t.connecting : t.notQueried) : snapshot.online ? t.onlineSince(formatTime(snapshot.fetchedAt)) : t.offline
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <HostBadge host={host} />
      <span className={`num ${snapshot && !snapshot.online ? 'text-danger-ink' : ''}`}>{text}</span>
      <ClaudeAuthStatus host={host} now={now} />
    </span>
  )
}

interface FolderPanelProps {
  readonly selected: string | null
  onSelect(path: string): void
}

const FOLDER_ACTIONS: readonly { readonly mode: LaunchMode; readonly label: (t: Messages['device']) => string; readonly icon: typeof Play }[] = [
  { mode: 'new', label: (t) => t.actionStart, icon: Play },
  { mode: 'continue', label: (t) => t.actionContinue, icon: RotateCcw },
  { mode: 'shell', label: (t) => t.actionShell, icon: SquareTerminal }
]

function FolderPanel({ selected, onSelect }: FolderPanelProps): React.JSX.Element {
  const t = useT().device
  const opening = useTerminals((s) => s.opening)
  const launch = useTerminals((s) => s.launch)
  const host = useDeviceId()
  const firstAction = useRef<HTMLButtonElement>(null)
  const name = selected ? baseName(selected) : ''
  return (
    <section aria-labelledby="minipc-files-title" className="flex min-h-0 flex-1 flex-col border-t border-line pt-4">
      <header className="mb-4 flex min-h-7 items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="minipc-files-title" className="text-[0.8125rem] font-[620] tracking-[0.005em] text-ink">
            {t.folderTitle}
          </h2>
          <p className="mt-0.5 text-xs text-ink-3">{t.folderHint}</p>
        </div>
      </header>
      <div className="flex min-h-[18rem] flex-1 flex-col [&>*]:flex-1">
        <FolderBrowser
          key={host}
          host={host}
          initialPath={projectsDirOf(host)}
          selectedPath={selected}
          onSelect={onSelect}
          onOpenTerminal={(path) => {
            onSelect(path)
            requestAnimationFrame(() => firstAction.current?.focus())
          }}
        />
      </div>
      <div className="mt-3 space-y-2">
        <p className="truncate font-mono text-2xs text-ink-3" title={selected ?? undefined} aria-live="polite">
          {selected ?? t.folderNone}
        </p>
        <div className="grid grid-cols-[1fr_auto_auto] gap-1.5">
          {FOLDER_ACTIONS.map((a, i) => (
            <Button
              key={a.mode}
              ref={i === 0 ? firstAction : undefined}
              variant={i === 0 ? 'soft' : 'secondary'}
              size="sm"
              icon={a.icon}
              disabled={!selected || opening}
              onClick={() => selected && void launch({ host, path: selected, name }, a.mode)}
              title={selected ? t.actionIn(a.label(t), name) : undefined}
            >
              {a.label(t)}
            </Button>
          ))}
        </div>
      </div>
    </section>
  )
}

function GitSection(): React.JSX.Element {
  const t = useT().device
  const repos = useMiniPc((s) => s.repos)
  const loading = useMiniPc((s) => s.gitLoading)
  const error = useMiniPc((s) => s.gitError)
  const load = useMiniPc((s) => s.loadGit)
  const dir = projectsDirOf(useDeviceId())
  const count = repos?.length ?? 0
  return (
    <Section
      id="minipc-git"
      title={t.sectionGit}
      description={repos ? t.gitCount(count, dir) : t.gitCountUnknown(dir)}
      actions={
        <Button size="sm" variant="ghost" icon={RefreshCw} loading={loading} onClick={() => void load()}>
          {t.gitReload}
        </Button>
      }
    >
      {error && !repos ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !repos ? (
        <SkeletonRows rows={3} />
      ) : repos.length === 0 ? (
        <EmptyState icon={FolderGit2} title={t.gitEmptyTitle} compact>
          {t.gitEmptyBody(dir)}
        </EmptyState>
      ) : (
        <GitTable repos={repos} />
      )}
    </Section>
  )
}

function OfflineState({ message }: { readonly message: string | null }): React.JSX.Element {
  const loading = useMiniPc((s) => s.snapshotLoading)
  const openSettings = useNav((s) => s.openSettings)
  const t = useT().device
  const name = useDevice()?.name ?? t.deviceFallback
  return (
    <div role="alert" className="flex max-w-lg flex-col items-start gap-4 border-t border-line pt-8">
      <MiniPcOfflineIllustration />
      <div className="space-y-1.5">
        <p className="text-[0.9375rem] font-[620] text-ink">{t.offlineTitle(name)}</p>
        <p className="text-[0.8125rem] leading-relaxed text-ink-3">{t.offlineBody}</p>
        {message ? <p className="rounded-md bg-raised px-3 py-2 font-mono text-2xs leading-relaxed text-ink-2">{message}</p> : null}
      </div>
      <div className="flex gap-2">
        <Button variant="primary" icon={RefreshCw} loading={loading} onClick={refreshAll}>
          {t.reconnect}
        </Button>
        <Button variant="ghost" icon={Settings2} onClick={() => openSettings('devices')}>
          {t.checkConnection}
        </Button>
      </div>
    </div>
  )
}

function LoadingLayout(): React.JSX.Element {
  const t = useT().device
  return (
    <div className="space-y-10" aria-busy="true" aria-label={t.loadingAria}>
      <div className="grid grid-cols-3 gap-8 border-t border-line pt-4">
        {SKELETON_METERS.map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-8 border-t border-line pt-4">
        {SKELETON_CHARTS.map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-14" />
          </div>
        ))}
      </div>
      <div className="border-t border-line pt-4">
        <SkeletonRows rows={3} />
      </div>
    </div>
  )
}

/** Ein einziger Hinweis, wenn Gerät und Docker nicht gelesen werden konnten. */
function InfoNotice(): React.JSX.Element | null {
  const info = useMiniPc((s) => s.info)
  const infoError = useMiniPc((s) => s.infoError)
  return infoError && !info ? <InfoError message={infoError} /> : null
}

function Dashboard({ editing }: { readonly editing: boolean }): React.JSX.Element {
  const snapshot = useMiniPc((s) => s.snapshot)
  const now = useNow(CLOCK_TICK_MS)
  const t = useT().device
  const [selected, setSelected] = useState<string | null>(null)
  const onSelect = useCallback((path: string) => setSelected(path), [])
  if (!snapshot) return <LoadingLayout />
  const system = snapshot.system
  const sections: LayoutSection[] = [
    {
      id: 'system',
      label: t.sectionSystem,
      width: 'full',
      render: () => (
        <Section id="minipc-system" title={t.sectionSystem} description={t.sectionSystemDesc}>
          {system ? <SystemCard system={system} fetchedAt={snapshot.fetchedAt} /> : <p className="text-[0.8125rem] text-ink-3">{t.noSystemValues}</p>}
        </Section>
      )
    },
    { id: 'notice', label: t.sectionNotices, width: 'full', render: () => <InfoNotice /> },
    { id: 'history', label: t.sectionHistory, width: 'full', render: () => (system ? <HistorySection system={system} /> : null) },
    { id: 'thermal', label: t.sectionThermal, width: 'full', render: () => (system ? <ThermalSection system={system} /> : null) },
    {
      id: 'claude',
      label: t.sectionClaude,
      width: 'full',
      render: () => (
        <Section id="minipc-claude" title={t.sectionClaude} description={t.sectionClaudeDesc}>
          <ClaudeSessions sessions={snapshot.claude} now={now} />
        </Section>
      )
    },
    { id: 'git', label: t.sectionGit, width: 'full', render: () => <GitSection /> },
    { id: 'cpu', label: t.sectionCpu, width: 'half', render: () => (system ? <CpuDetails system={system} /> : null) },
    { id: 'memory', label: t.sectionMemory, width: 'half', render: () => (system ? <MemoryDetails system={system} /> : null) },
    { id: 'docker', label: t.sectionDocker, width: 'full', render: () => <DockerTable /> },
    { id: 'processes', label: t.sectionProcesses, width: 'full', render: () => (system ? <ProcessTable system={system} /> : null) },
    { id: 'network', label: t.sectionNetwork, width: 'full', render: () => (system ? <NetworkTable system={system} /> : null) },
    { id: 'drives', label: t.sectionDrives, width: 'full', render: () => (system ? <DriveList system={system} /> : null) },
    {
      id: 'ollama',
      label: t.sectionOllama,
      width: 'full',
      render: () => (
        <Section id="minipc-ollama" title={t.sectionOllama} description={t.sectionOllamaDesc}>
          <OllamaList />
        </Section>
      )
    },
    { id: 'facts', label: t.sectionFacts, width: 'full', render: () => <DeviceFacts /> }
  ]
  return (
    <div className="grid min-h-0 flex-1 gap-x-10 gap-y-10 lg:grid-cols-[minmax(18rem,23rem)_minmax(0,1fr)]">
      <div className="flex min-h-[26rem] flex-col lg:sticky lg:top-0 lg:h-[calc(100vh-7.5rem)]">
        <FolderPanel selected={selected} onSelect={onSelect} />
      </div>
      <div className="@container min-w-0">
        <LayoutGrid page={PAGE} sections={sections} editing={editing} className="grid grid-cols-12 gap-x-10 gap-y-10" />
      </div>
    </div>
  )
}

function Body({ editing }: { readonly editing: boolean }): React.JSX.Element {
  const snapshot = useMiniPc((s) => s.snapshot)
  const error = useMiniPc((s) => s.snapshotError)
  if (error && !snapshot) return <ErrorState message={error} onRetry={refreshAll} />
  if (snapshot && !snapshot.online) return <OfflineState message={snapshot.error} />
  return <Dashboard editing={editing} />
}

function Missing(): React.JSX.Element {
  const t = useT().device
  const openSettings = useNav((s) => s.openSettings)
  return (
    <EmptyState
      icon={ServerOff}
      title={t.missingTitle}
      action={
        <Button variant="primary" icon={Settings2} onClick={() => openSettings('devices')}>
          {t.manageDevices}
        </Button>
      }
    >
      {t.missingBody}
    </EmptyState>
  )
}

export function MiniPcView(): React.JSX.Element {
  const t = useT().device
  const settings = useSettings((s) => s.settings)
  const device = useDevice()
  const enabled = device?.enabled ?? false
  const id = device?.id ?? null
  const busy = useMiniPc((s) => s.snapshotLoading || s.gitLoading)
  const shown = useMiniPc((s) => s.device)
  const [editing, setEditing] = useState(false)
  const { reset } = usePageLayout(PAGE)

  useEffect(() => {
    if (!id || !enabled) return
    useMiniPc.getState().select(id)
    refreshAll()
  }, [id, enabled])
  useInterval(() => {
    if (enabled) void useMiniPc.getState().loadSnapshot()
  }, SNAPSHOT_POLL_MS)
  useInterval(() => {
    if (enabled) void useMiniPc.getState().loadInfo()
  }, INFO_POLL_MS)

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={device?.name ?? t.deviceFallback}
        actions={
          !enabled ? null : editing ? (
            <>
              <Button variant="ghost" icon={RotateCcw} onClick={reset}>
                {t.layoutReset}
              </Button>
              <Button variant="primary" icon={Check} onClick={() => setEditing(false)}>
                {t.layoutDone}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" icon={LayoutIcon} onClick={() => setEditing(true)}>
                {t.customize}
              </Button>
              <Button icon={RefreshCw} loading={busy} onClick={refreshAll}>
                {t.refresh}
              </Button>
            </>
          )
        }
      >
        {enabled ? <StatusLine /> : t.subtitleDisabled}
      </ViewHeader>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 pb-10">
        {!settings ? <SkeletonRows rows={4} /> : !enabled ? <Missing /> : shown === id ? <Body editing={editing} /> : <LoadingLayout />}
      </div>
    </div>
  )
}
