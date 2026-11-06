import { lintAgent } from '@shared/agentLint'
import type { AgentAssistRequest, AgentAssistResult, AgentDocument, AgentSaveInput, AgentSaveResult } from '@shared/agents'
import type { Favorite, HostId } from '@shared/types'
import { AgentExistsError, NotFoundError, ValidationError } from '../errors'
import { mainT } from '../i18n'
import { type Host, joinPath } from '../hosts/Host'
import { ASSIST_MODEL, buildAssistPrompt, parseAssistAnswer } from './agentAssist'
import { parseAgentFile, serializeAgentFile } from './agentFile'

/** Agent-Dateien, die die App schreiben oder löschen darf: `<…>/.claude/agents/<name>.md`, nicht aus Plugins. */
const EDITABLE_PATH = /[\\/]\.claude[\\/]agents[\\/][^\\/]+\.md$/
const PLUGIN_PATH = /[\\/]\.claude[\\/]plugins[\\/]/
const MARKDOWN = /\.md$/i

/** Führt `claude -p` mit Modell und Prompt aus und liefert die Antwort. */
export type AssistRunner = (model: string, prompt: string) => Promise<string>

export interface AgentServiceDeps {
  readonly hosts: (id: HostId) => Host
  readonly projects: () => readonly Favorite[]
  readonly assist: AssistRunner
}

const isEditable = (path: string): boolean => EDITABLE_PATH.test(path) && !PLUGIN_PATH.test(path)

/** Lesen, Speichern und Löschen von Claude-Code-Agents auf allen Rechnern, plus KI-Entwurf. */
export class AgentService {
  constructor(private readonly deps: AgentServiceDeps) {}

  async read(host: HostId, path: string): Promise<AgentDocument> {
    if (!MARKDOWN.test(path)) throw new ValidationError(mainT().agents.service.notMarkdown(path))
    const content = (await this.deps.hosts(host).readFile(path)).toString('utf8')
    const parsed = parseAgentFile(content)
    return { host, path, definition: parsed.definition, preservedKeys: parsed.preservedKeys, readOnly: !isEditable(path), content }
  }

  async save(input: AgentSaveInput): Promise<AgentSaveResult> {
    const errors = lintAgent(input.definition, mainT().agents.lint).filter((f) => f.level === 'error' && f.field !== 'prompt')
    if (errors[0]) throw new ValidationError(errors[0].message)
    const host = this.deps.hosts(input.host)
    const path = joinPath(host, await this.agentsDir(host, input), `${input.definition.name}.md`)
    const previous = input.previousPath
    if (previous !== null && !isEditable(previous)) throw new ValidationError(mainT().agents.service.pluginCopyOnly)
    if (path !== previous && (await host.stat(path))) throw new AgentExistsError(input.definition.name)
    const preserved = previous ? parseAgentFile((await host.readFile(previous)).toString('utf8')).preserved : []
    await host.writeFileAtomic(path, serializeAgentFile(input.definition, preserved))
    if (previous && previous !== path) await host.remove(previous)
    return { host: input.host, path }
  }

  async remove(host: HostId, path: string): Promise<void> {
    if (!isEditable(path)) throw new ValidationError(mainT().agents.service.deleteOnlyOwn)
    const target = this.deps.hosts(host)
    if (!(await target.stat(path))) throw new NotFoundError(mainT().agents.service.fileLabel(path), mainT().agents.service.reloadHint)
    await target.remove(path)
  }

  async assist(request: AgentAssistRequest): Promise<AgentAssistResult> {
    if (request.mode === 'create' && request.idea.trim().length < 10) throw new ValidationError(mainT().agents.service.ideaTooShort)
    if (request.mode === 'improve' && !request.current) throw new ValidationError(mainT().agents.service.currentMissing)
    const answer = await this.deps.assist(ASSIST_MODEL, buildAssistPrompt(request))
    return parseAssistAnswer(answer, request.availableSkills)
  }

  private async agentsDir(host: Host, input: AgentSaveInput): Promise<string> {
    if (input.scope === 'user') return joinPath(host, await host.homeDir(), '.claude', 'agents')
    const project = this.deps.projects().find((p) => p.host === input.host && p.path === input.projectPath)
    if (!project) throw new ValidationError(mainT().agents.service.pickProject)
    return joinPath(host, project.path, '.claude', 'agents')
  }
}
