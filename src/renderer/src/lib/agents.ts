import { AGENT_COLOR_HEX, AGENT_COLORS, effortOptions, memoryOptions, modelOptions, permissionOptions, type AgentColor, type AgentDefinition, type AgentsText } from '@shared/agents'
import type { SkillEntry } from '@shared/types'

const AGENTS_DIR = /[\\/]\.claude[\\/]agents[\\/][^\\/]+$/
/** Farbe für Agents ohne eigene Farbe: gedecktes Graphit statt Akzent. */
export const NEUTRAL_AGENT_COLOR = 'oklch(0.64 0.009 80)'

/** Projektordner eines Projekt-Agents (`<projekt>/.claude/agents/x.md` → `<projekt>`), sonst `null`. */
export function projectOfAgentPath(path: string): string | null {
  return AGENTS_DIR.test(path) ? path.replace(AGENTS_DIR, '') : null
}

export const isAgentColor = (value: string | null): value is AgentColor => value !== null && (AGENT_COLORS as readonly string[]).includes(value)

export const agentColor = (color: string | null): string => (isAgentColor(color) ? AGENT_COLOR_HEX[color] : NEUTRAL_AGENT_COLOR)

export interface AgentGroup {
  readonly id: string
  readonly label: string
  readonly hint: string
  readonly entries: readonly SkillEntry[]
}

const byName = (a: SkillEntry, b: SkillEntry): number => a.name.localeCompare(b.name, 'de-DE') || a.host.localeCompare(b.host)

/** Gruppen der Liste: eigene (global), je Projekt, je Plugin. */
export function groupAgents(entries: readonly SkillEntry[], t: AgentsText): AgentGroup[] {
  const groups: AgentGroup[] = []
  const user = entries.filter((e) => e.scope === 'user').sort(byName)
  if (user.length) groups.push({ id: 'user', label: t.groups.user, hint: t.groups.userHint, entries: user })
  const projects = [...new Set(entries.filter((e) => e.scope === 'project').map((e) => e.project ?? ''))].sort((a, b) => a.localeCompare(b, 'de-DE'))
  for (const p of projects) groups.push({ id: `project:${p}`, label: p || t.groups.project, hint: t.groups.projectHint, entries: entries.filter((e) => e.scope === 'project' && (e.project ?? '') === p).sort(byName) })
  const plugins = [...new Set(entries.filter((e) => e.scope === 'plugin').map((e) => e.plugin ?? ''))].sort((a, b) => a.localeCompare(b, 'de-DE'))
  for (const p of plugins) groups.push({ id: `plugin:${p}`, label: p || t.groups.plugin, hint: t.groups.pluginHint, entries: entries.filter((e) => e.scope === 'plugin' && (e.plugin ?? '') === p).sort(byName) })
  const rest = entries.filter((e) => e.scope !== 'user' && e.scope !== 'project' && e.scope !== 'plugin').sort(byName)
  if (rest.length) groups.push({ id: 'other', label: t.groups.other, hint: '', entries: rest })
  return groups
}

/** Suche über Name, Beschreibung, Zusammenfassung, Tools und Herkunft. */
export function matchesAgent(entry: SkillEntry, query: string, summary: string | undefined): boolean {
  const words = query.toLocaleLowerCase('de-DE').split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const haystack = [entry.name, entry.description, summary ?? '', entry.tools.join(' '), entry.skills.join(' '), entry.model ?? '', entry.plugin ?? '', entry.project ?? '']
    .join(' ')
    .toLocaleLowerCase('de-DE')
  return words.every((w) => haystack.includes(w))
}

export const modelLabel = (model: string | null, t: AgentsText): string => (model ? (modelOptions(t).find((m) => m.value === model)?.label ?? model) : t.inheritModel)

export interface SettingRow {
  readonly label: string
  readonly value: string
  readonly explain: string
  /** Feld fehlt in der Datei: Claude nimmt den Standard. */
  readonly inherited: boolean
}

/** Alle Einstellungen eines Agents in Klartext, für das Detail. */
export function settingRows(d: AgentDefinition, t: AgentsText): SettingRow[] {
  const r = t.settingRows
  const model = modelOptions(t).find((m) => m.value === d.model)
  const effort = effortOptions(t).find((e) => e.value === d.effort)
  const permission = permissionOptions(t).find((p) => p.value === d.permissionMode)
  const memory = memoryOptions(t).find((m) => m.value === d.memory)
  return [
    { label: r.model, value: model?.label ?? d.model ?? r.modelInherited, explain: model?.explain ?? (d.model ? r.modelCustomExplain : r.modelInheritedExplain), inherited: !d.model },
    { label: r.effort, value: effort?.label ?? r.sessionValue, explain: effort?.explain ?? r.effortInheritedExplain, inherited: !effort },
    { label: r.permission, value: permission?.label ?? r.sessionValue, explain: permission?.explain ?? r.permissionInheritedExplain, inherited: !permission },
    {
      label: r.maxTurns,
      value: d.maxTurns === null ? r.unlimited : String(d.maxTurns),
      explain: d.maxTurns === null ? r.turnsUnlimitedExplain : r.turnsLimitedExplain,
      inherited: d.maxTurns === null
    },
    { label: r.memory, value: memory?.label ?? r.memoryOff, explain: memory?.explain ?? r.memoryOffExplain, inherited: !memory },
    {
      label: r.isolation,
      value: d.isolation ? r.isolationWorktree : r.isolationProject,
      explain: d.isolation ? r.isolationWorktreeExplain : r.isolationProjectExplain,
      inherited: !d.isolation
    },
    {
      label: r.background,
      value: d.background ? r.yes : r.no,
      explain: d.background ? r.backgroundYesExplain : r.backgroundNoExplain,
      inherited: !d.background
    }
  ]
}
