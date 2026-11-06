/** Agents und Automatisierungen für den Browser-Modus (ohne Claude, ohne Datenbank). */
import { agentTemplates, EMPTY_AGENT, agentSlug, type AgentAssistRequest, type AgentAssistResult, type AgentDefinition, type AgentDocument, type AgentSaveInput, type AgentSaveResult } from '@shared/agents'
import { nextRunAt, validateAutomation, type Automation, type AutomationInput, type AutomationRun } from '@shared/automations'
import { serializeAgentFile } from '@shared/agentFormat'
import type { HostId, SkillEntry } from '@shared/types'
import { currentT } from '@renderer/i18n/useT'
import { MOCK_FAVORITES } from './mockData'
import { MOCK_REMOVED_AGENTS, MOCK_SAVED_AGENTS, mockHome, mockSkillCatalog } from './mockSkills'

const HOUR_MS = 3_600_000
const RUN_MS = 4_000
const ASSIST_MS = 1_800

const MOCK_PROMPTS: Readonly<Record<string, string>> = {
  webbuilder: [
    'Du baust Webseiten und Oberflächen auf Agentur-Niveau.',
    '',
    '## Vorgehen',
    '1. Bestehenden Stack und Design-System lesen.',
    '2. Passende Design-Skills laden (`impeccable`, `frontend-design`).',
    '3. Umsetzen, dann im Browser per Screenshot prüfen.',
    '',
    '## Ausgabe',
    'Kurze Liste der geänderten Dateien und ein Satz zur Prüfung.'
  ].join('\n'),
  'ipc-checker': ['Du prüfst den IPC-Vertrag.', '', '## Vorgehen', '1. `src/shared/api.ts` lesen.', '2. Jeden Kanal in `ipc.ts` und im Preload suchen.', '', '## Ausgabe', 'Fehlende Kanäle als Liste, sonst „Alles verdrahtet“.'].join('\n')
}

const definitionOf = (entry: SkillEntry, saved: AgentDefinition | undefined): AgentDefinition =>
  saved ?? {
    ...EMPTY_AGENT,
    name: entry.name,
    description: entry.description,
    tools: entry.tools,
    model: entry.model,
    skills: entry.skills,
    color: (entry.color as AgentDefinition['color']) ?? null,
    permissionMode: entry.model === 'haiku' ? 'plan' : null,
    prompt: MOCK_PROMPTS[entry.name] ?? entry.bodyExcerpt
  }

export function createMockAgents(changed: () => void) {
  const definitions = new Map<string, AgentDefinition>()
  let nextId = 3
  let nextRunId = 10
  const now = Date.now()
  const runs = new Map<number, AutomationRun[]>([
    [
      1,
      [
        { id: 2, automationId: 1, trigger: 'schedule', status: 'success', startedAt: now - 20 * HOUR_MS, finishedAt: now - 20 * HOUR_MS + 94_000, result: '## Ergebnis\n\nAlles in Ordnung. 3 Commits geprüft, keine Auffälligkeiten.\n\n- `src/main/ipc.ts`: neue Kanäle korrekt verdrahtet', error: null, sessionId: 'mock-session-2', costUsd: 0.31, turns: 9 },
        { id: 1, automationId: 1, trigger: 'manual', status: 'error', startedAt: now - 44 * HOUR_MS, finishedAt: now - 44 * HOUR_MS + 12_000, result: '', error: 'Zeitlimit von 30 Min. überschritten', sessionId: null, costUsd: null, turns: null }
      ]
    ],
    [2, [{ id: 3, automationId: 2, trigger: 'schedule', status: 'skipped', startedAt: now - 3 * HOUR_MS, finishedAt: now - 3 * HOUR_MS, result: 'Übersprungen: Kontingent im 5-Stunden-Fenster bei 92 %.', error: null, sessionId: null, costUsd: null, turns: null }]]
  ])
  const base = (input: AutomationInput, id: number): Automation => ({ ...input, id, createdAt: now - 5 * 24 * HOUR_MS, nextRunAt: input.enabled ? nextRunAt(input.schedule, Date.now()) : null, lastRun: runs.get(id)?.[0] ?? null, running: false })
  const project = MOCK_FAVORITES[0]
  let automations: Automation[] = [
    base(
      {
        name: 'Morgen-Check',
        agent: 'ipc-checker',
        host: 'local',
        cwd: project?.path ?? 'C:/Projekte/demo',
        prompt: 'Prüfe die Commits seit gestern. Antworte mit einer kurzen Liste: Datei:Zeile und Problem. Findest du nichts, schreib „Alles in Ordnung“.',
        schedule: { kind: 'daily', time: '08:00', weekdays: [1, 2, 3, 4, 5] },
        permission: 'plan',
        model: null,
        timeoutMinutes: 30,
        notify: true,
        enabled: true
      },
      1
    ),
    base(
      {
        name: 'Abhängigkeiten aktuell halten',
        agent: 'webbuilder',
        host: 'mini-pc',
        cwd: '/home/alex/projects/website',
        prompt: 'Prüfe mit npm outdated, welche Pakete veraltet sind, und schlage sichere Updates vor. Nichts installieren.',
        schedule: { kind: 'interval', minutes: 6 * 60 },
        permission: 'plan',
        model: 'haiku',
        timeoutMinutes: 20,
        notify: false,
        enabled: false
      },
      2
    )
  ]
  const refresh = (id: number): void => {
    automations = automations.map((a) => (a.id === id ? { ...a, lastRun: runs.get(id)?.[0] ?? null, running: runs.get(id)?.[0]?.status === 'running' } : a))
  }

  const entryAt = (host: HostId, path: string): SkillEntry | undefined => mockSkillCatalog(host).entries.find((e) => e.path === path)

  return {
    read(host: HostId, path: string): AgentDocument {
      const entry = entryAt(host, path)
      const definition = definitionOf(entry ?? { ...emptyEntry(host, path) }, definitions.get(path))
      return { host, path, definition, preservedKeys: [], readOnly: entry?.scope === 'plugin', content: serializeAgentFile(definition) }
    },
    save(input: AgentSaveInput): AgentSaveResult {
      const home = mockHome(input.host)
      const dir = input.scope === 'user' ? `${home}/agents` : `${input.projectPath ?? ''}/.claude/agents`
      const path = `${dir}/${input.definition.name}.md`
      if (input.previousPath && input.previousPath !== path) {
        MOCK_SAVED_AGENTS.delete(input.previousPath)
        MOCK_REMOVED_AGENTS.add(input.previousPath)
      }
      definitions.set(path, input.definition)
      const d = input.definition
      MOCK_SAVED_AGENTS.set(path, {
        id: `${input.host}:${path}`,
        kind: 'agent',
        name: d.name,
        description: d.description,
        path,
        host: input.host,
        ai: 'claude',
        scope: input.scope,
        plugin: null,
        project: input.scope === 'project' ? (MOCK_FAVORITES.find((f) => f.path === input.projectPath)?.name ?? null) : null,
        tools: d.tools,
        model: d.model,
        skills: d.skills,
        color: d.color,
        hash: `h-saved-${d.name}-${Date.now()}`,
        bodyExcerpt: d.prompt.slice(0, 600)
      })
      return { host: input.host, path }
    },
    remove(path: string): void {
      MOCK_SAVED_AGENTS.delete(path)
      MOCK_REMOVED_AGENTS.add(path)
    },
    async assist(request: AgentAssistRequest): Promise<AgentAssistResult> {
      await new Promise((r) => setTimeout(r, ASSIST_MS))
      const templates = agentTemplates(currentT().agents)
      const template = templates[request.idea.length % templates.length] ?? templates[0]
      const base = request.current ?? template?.definition ?? EMPTY_AGENT
      const name = request.mode === 'improve' ? base.name : agentSlug(request.idea.split(/\s+/).slice(1, 3).join(' ')) || 'neuer-agent'
      return {
        definition: { ...base, name, description: request.mode === 'create' ? `${request.idea.trim()} Use when diese Aufgabe ansteht.` : base.description },
        notes: ['Nur Lese-Tools, weil der Agent nichts ändern muss.', 'Sonnet reicht: die Aufgabe braucht Sorgfalt, aber keine tiefe Planung.', 'Ausgabe auf eine kurze Liste begrenzt, damit der Hauptkontext klein bleibt.']
      }
    },
    list: (): Automation[] => automations,
    runs: (id: number): AutomationRun[] => runs.get(id) ?? [],
    create(input: AutomationInput): Automation | string {
      const problem = validateAutomation(input, currentT().automations)
      if (problem) return problem
      const created = { ...base(input, nextId++), createdAt: Date.now(), lastRun: null }
      automations = [...automations, created]
      return created
    },
    update(id: number, input: AutomationInput): Automation | string {
      const problem = validateAutomation(input, currentT().automations)
      if (problem) return problem
      automations = automations.map((a) => (a.id === id ? { ...a, ...input, nextRunAt: input.enabled ? nextRunAt(input.schedule, Date.now()) : null } : a))
      return automations.find((a) => a.id === id) ?? 'nicht gefunden'
    },
    removeAutomation(id: number): void {
      automations = automations.filter((a) => a.id !== id)
    },
    runNow(id: number): void {
      const run: AutomationRun = { id: nextRunId++, automationId: id, trigger: 'manual', status: 'running', startedAt: Date.now(), finishedAt: null, result: '', error: null, sessionId: null, costUsd: null, turns: null }
      runs.set(id, [run, ...(runs.get(id) ?? [])])
      refresh(id)
      changed()
      setTimeout(() => {
        const done: AutomationRun = { ...run, status: 'success', finishedAt: Date.now(), result: 'Fertig. **2 Hinweise:**\n\n1. `src/app.ts:42` – Fehler wird verschluckt\n2. `README.md` – Befehl veraltet', sessionId: 'mock-session', costUsd: 0.18, turns: 6 }
        runs.set(id, (runs.get(id) ?? []).map((r) => (r.id === run.id ? done : r)))
        refresh(id)
        changed()
      }, RUN_MS)
    }
  }
}

function emptyEntry(host: HostId, path: string): SkillEntry {
  return { id: `${host}:${path}`, kind: 'agent', name: path.split('/').pop()?.replace(/\.md$/, '') ?? 'agent', description: '', path, host, ai: 'claude', scope: 'user', plugin: null, project: null, tools: [], model: null, skills: [], color: null, hash: '', bodyExcerpt: '' }
}

