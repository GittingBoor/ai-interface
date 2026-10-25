import { createSdkMcpServer, type HookJSONOutput, query, tool } from '@anthropic-ai/claude-agent-sdk'
import { ClaudeCliError } from '../errors'
import { terminalEnv } from '../terminal/launchCommand'
import { type AgentMessage, BUILTIN_READ_TOOLS, type RunOptions, TOOL_SERVER, touchesSecret } from './AssistantService'
import type { AssistantTool } from './tools'

export const ASSISTANT_MODEL = 'claude-opus-5-5'

/** Eingebaute Werkzeuge, die der Assistent nie bekommt (ändern Dateien oder führen Befehle aus). */
const BLOCKED_BUILTIN_TOOLS: readonly string[] = ['Bash', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'WebFetch', 'WebSearch', 'Task', 'Agent']

export interface SdkRunnerConfig {
  readonly tools: readonly AssistantTool[]
  systemPrompt(): Promise<string>
  cwd(): string
  claudePath(): string | null
}

/** Sperrt Lesezugriffe auf Geheimnisse, bevor ein eingebautes Lesewerkzeug läuft. */
async function blockSecrets(input: unknown): Promise<HookJSONOutput> {
  const toolInput = (input as { tool_input?: unknown }).tool_input
  if (typeof toolInput !== 'object' || toolInput === null || !touchesSecret(toolInput as Record<string, unknown>)) return {}
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: 'Schlüssel-, Anmelde- und .env-Dateien sind für den Assistenten gesperrt.'
    }
  }
}

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/** Baut den `run`-Aufruf für `AssistantService` auf dem Claude Agent SDK (Abo-Login von Claude Code). */
export function createSdkRunner(config: SdkRunnerConfig): (prompt: string, options: RunOptions) => AsyncIterable<AgentMessage> {
  const server = createSdkMcpServer({
    name: TOOL_SERVER,
    tools: config.tools.map((t) =>
      tool(t.name, t.description, t.schema, async (args: unknown) => {
        try {
          return { content: [{ type: 'text' as const, text: await t.run(args) }] }
        } catch (error) {
          return { content: [{ type: 'text' as const, text: errorText(error) }], isError: true }
        }
      })
    )
  })
  const readOnlyTools = config.tools.filter((t) => !t.mutating).map((t) => `mcp__${TOOL_SERVER}__${t.name}`)
  return async function* run(prompt: string, options: RunOptions): AsyncGenerator<AgentMessage> {
    const executable = config.claudePath()
    if (!executable) throw new ClaudeCliError('Claude Code wurde nicht gefunden')
    const stream = query({
      prompt,
      options: {
        model: ASSISTANT_MODEL,
        cwd: config.cwd(),
        pathToClaudeCodeExecutable: executable,
        settingSources: [],
        systemPrompt: await config.systemPrompt(),
        mcpServers: { [TOOL_SERVER]: server },
        allowedTools: [...BUILTIN_READ_TOOLS, ...readOnlyTools],
        disallowedTools: [...BLOCKED_BUILTIN_TOOLS],
        canUseTool: (name, input) => options.canUseTool(name, input),
        hooks: { PreToolUse: [{ matcher: BUILTIN_READ_TOOLS.join('|'), hooks: [blockSecrets] }] },
        abortController: options.abortController,
        env: terminalEnv(process.env),
        ...(options.resume ? { resume: options.resume } : {})
      }
    })
    for await (const message of stream) yield message as AgentMessage
  }
}
