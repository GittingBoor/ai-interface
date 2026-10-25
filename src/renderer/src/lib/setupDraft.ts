import type { CategoryInput, DetectedProject, DeviceSettings, HostId, SetupDetection, SetupInput, SetupProposal, Settings } from '@shared/types'
import { DEVICE_COLORS, deviceIdFrom } from '@shared/layout'

const DEFAULT_PORT = 22
const DEFAULT_PROJECT_COLORS: readonly string[] = ['#e08a4f', '#d9b35a', '#8fb573', '#5fb3a8', '#6f9bd8', '#9b8ad8', '#c77ea8']
const DEFAULT_CATEGORY_COLOR = '#e08a4f'

/** Ein Ordner, der als Projekt übernommen werden kann. */
export interface ProjectChoice {
  readonly host: HostId
  readonly path: string
  readonly name: string
  readonly selected: boolean
  readonly category: string | null
  readonly color: string
  readonly icon: string | null
  readonly starred: boolean
  readonly isGit: boolean
  readonly hasClaudeMd: boolean
  /** Stammt aus `ai-interface-setup.json` (bleibt beim Neu-Einlesen erhalten). */
  readonly fromProposal: boolean
}

export interface VaultDraft {
  readonly path: string
  readonly todoFile: string
  readonly protocolDir: string
  readonly notesDir: string
}

export interface SetupDraft {
  readonly projectsRoot: string
  readonly projects: readonly ProjectChoice[]
  readonly useVault: boolean
  readonly vault: VaultDraft
  readonly devices: readonly DeviceSettings[]
  readonly categories: readonly CategoryInput[]
  readonly launchOnStartup: boolean
}

export const choiceKey = (p: Pick<ProjectChoice, 'host' | 'path'>): string => `${p.host}\n${p.path}`

const colorFor = (index: number): string => DEFAULT_PROJECT_COLORS[index % DEFAULT_PROJECT_COLORS.length] ?? DEFAULT_CATEGORY_COLOR

function proposalDevices(proposal: SetupProposal, existing: readonly DeviceSettings[], keyPath: string): DeviceSettings[] {
  const devices = [...existing]
  for (const [i, d] of (proposal.devices ?? []).entries()) {
    const known = devices.find((x) => (d.id && x.id === d.id) || x.name.toLowerCase() === d.name.toLowerCase())
    const id = known?.id ?? (d.id?.trim() || deviceIdFrom(d.name, devices.map((x) => x.id)))
    const device: DeviceSettings = {
      id,
      name: d.name,
      host: d.host,
      user: d.user,
      port: d.port ?? DEFAULT_PORT,
      privateKeyPath: d.privateKeyPath ?? keyPath,
      projectsDir: d.projectsDir ?? '~/projects',
      color: d.color ?? DEVICE_COLORS[(existing.length + i) % DEVICE_COLORS.length] ?? '#5fb37a',
      icon: d.icon === undefined ? 'lucide:server' : d.icon,
      enabled: true,
      hostFingerprint: known?.hostFingerprint ?? ''
    }
    if (known) devices.splice(devices.indexOf(known), 1, device)
    else devices.push(device)
  }
  return devices
}

/** `device` im Vorschlag (ID oder Name) → Host-ID; unbekannt → `local`. */
function resolveHost(device: string | undefined, devices: readonly DeviceSettings[]): HostId {
  if (!device || device === 'local') return 'local'
  const lower = device.toLowerCase()
  return devices.find((d) => d.id === device || d.name.toLowerCase() === lower)?.id ?? 'local'
}

function proposalProjects(proposal: SetupProposal, devices: readonly DeviceSettings[], categories: readonly CategoryInput[]): ProjectChoice[] {
  return (proposal.projects ?? []).map((p, i) => {
    const category = categories.find((c) => c.name.toLowerCase() === p.category?.toLowerCase())
    return {
      host: resolveHost(p.device, devices),
      path: p.path,
      name: p.name?.trim() || p.path.split(/[\\/]/).filter(Boolean).pop() || p.path,
      selected: true,
      category: category?.name ?? p.category ?? null,
      color: p.color ?? category?.color ?? colorFor(i),
      icon: p.icon ?? null,
      starred: p.starred ?? true,
      isGit: false,
      hasClaudeMd: false,
      fromProposal: true
    }
  })
}

/** Startwerte: bisherige Einstellungen, ergänzt um Funde auf dem Rechner, überschrieben vom Vorschlag. */
export function draftFromDetection(detection: SetupDetection, settings: Settings): SetupDraft {
  const proposal = detection.proposal ?? {}
  const keyPath = detection.sshKeyCandidates[0] ?? settings.devices[0]?.privateKeyPath ?? ''
  const devices = proposalDevices(proposal, settings.devices, keyPath)
  const categories: CategoryInput[] = (proposal.categories ?? []).map((c) => ({ name: c.name, color: c.color ?? DEFAULT_CATEGORY_COLOR, icon: c.icon ?? null }))
  const vaultPath = proposal.vault === null ? '' : (proposal.vault?.path ?? (settings.vault.path || detection.vaultCandidates[0] || ''))
  const firstRun = !detection.existingInstall
  return {
    projectsRoot: proposal.projectsRoot ?? (firstRun ? (detection.projectRootCandidates[0] ?? settings.projectsRoot) : settings.projectsRoot),
    projects: proposalProjects(proposal, devices, categories),
    useVault: vaultPath !== '',
    vault: {
      path: vaultPath,
      todoFile: proposal.vault?.todoFile ?? settings.todoFile,
      protocolDir: proposal.vault?.protocolDir ?? settings.protocolDir,
      notesDir: proposal.vault?.notesDir ?? settings.notesDir
    },
    devices,
    categories,
    launchOnStartup: settings.launchOnStartup
  }
}

/** Neu eingelesene Ordner einmischen: Vorschläge und schon getroffene Auswahl bleiben erhalten. */
export function mergeScan(current: readonly ProjectChoice[], scanned: readonly DetectedProject[], known: ReadonlySet<string>): ProjectChoice[] {
  const kept = current.filter((p) => p.fromProposal)
  const previous = new Map(current.map((p) => [choiceKey(p), p]))
  const keptKeys = new Set(kept.map(choiceKey))
  const fresh = scanned
    .filter((s) => !keptKeys.has(choiceKey({ host: 'local', path: s.path })))
    .map((s, i): ProjectChoice => {
      const before = previous.get(choiceKey({ host: 'local', path: s.path }))
      const already = known.has(choiceKey({ host: 'local', path: s.path }))
      return {
        host: 'local',
        path: s.path,
        name: s.name,
        selected: before?.selected ?? (!already && (s.isGit || s.hasClaudeMd)),
        category: before?.category ?? null,
        color: before?.color ?? colorFor(i),
        icon: before?.icon ?? null,
        starred: before?.starred ?? false,
        isGit: s.isGit,
        hasClaudeMd: s.hasClaudeMd,
        fromProposal: false
      }
    })
  return [...kept, ...fresh]
}

export function toSetupInput(draft: SetupDraft): SetupInput {
  const vault = draft.useVault ? draft.vault : { path: '', todoFile: draft.vault.todoFile, protocolDir: draft.vault.protocolDir, notesDir: '' }
  return {
    projectsRoot: draft.projectsRoot.trim(),
    vault,
    devices: draft.devices,
    categories: draft.categories,
    projects: draft.projects
      .filter((p) => p.selected)
      .map((p) => ({ host: p.host, path: p.path, name: p.name.trim() || p.path, category: p.category, color: p.color, icon: p.icon, starred: p.starred })),
    launchOnStartup: draft.launchOnStartup
  }
}
