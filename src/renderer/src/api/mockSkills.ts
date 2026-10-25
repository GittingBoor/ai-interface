/** Beispielkatalog für den Browser-Modus: Skills, Agents, Befehle aus allen Herkünften. */
import type { HostId, SkillCatalogResult, SkillEntry, SkillRelation } from '@shared/types'

interface MockSkillSpec {
  readonly name: string
  readonly kind: SkillEntry['kind']
  readonly description: string
  readonly rel: string
  readonly scope?: SkillEntry['scope']
  readonly ai?: SkillEntry['ai']
  readonly plugin?: string
  readonly project?: string
  readonly tools?: readonly string[]
  readonly model?: string
  readonly skills?: readonly string[]
  /** Skill-Namen, die im Text vorkommen. */
  readonly mentions?: readonly string[]
  /** Nur auf diesem Rechner vorhanden. */
  readonly only?: HostId
}

const SPECS: readonly MockSkillSpec[] = [
  { name: 'impeccable', kind: 'skill', rel: 'skills/impeccable/SKILL.md', description: 'Use when the user wants to design, redesign, critique, audit, polish or otherwise improve a frontend interface.' },
  { name: 'frontend-design', kind: 'skill', rel: 'skills/frontend-design/SKILL.md', description: 'Create distinctive, production-grade frontend interfaces with strong visual hierarchy.' },
  { name: 'dataviz', kind: 'skill', rel: 'skills/dataviz/SKILL.md', description: 'Use before creating any chart, graph, plot, dashboard or data visualization.' },
  { name: 'apple-design', kind: 'skill', rel: 'skills/apple-design/SKILL.md', description: "Apple's approach to interface design and fluid, physical motion, translated for the web." },
  { name: 'responsive-web', kind: 'skill', rel: 'skills/responsive-web/SKILL.md', description: 'Design and implement websites that work across mobile, tablet, laptop and large screens.', only: 'local' },
  { name: 'docx', kind: 'skill', rel: 'skills/docx/SKILL.md', scope: 'synced', description: 'Create, read, edit or manipulate Word documents (.docx).' },
  { name: 'pdf', kind: 'skill', rel: 'skills/pdf/SKILL.md', scope: 'synced', description: 'Anything with PDF files: extract, merge, split, fill forms, OCR.' },
  { name: 'pptx', kind: 'skill', rel: 'skills/pptx/SKILL.md', scope: 'synced', description: 'Create, edit or read PowerPoint presentations.' },
  { name: 'brainstorming', kind: 'skill', rel: 'plugins/superpowers/skills/brainstorming/SKILL.md', scope: 'plugin', plugin: 'superpowers', description: 'You MUST use this before any creative work. Explores user intent, requirements and design before implementation.' },
  { name: 'test-driven-development', kind: 'skill', rel: 'plugins/superpowers/skills/tdd/SKILL.md', scope: 'plugin', plugin: 'superpowers', description: 'Use when implementing any feature or bugfix, before writing implementation code.' },
  { name: 'systematic-debugging', kind: 'skill', rel: 'plugins/superpowers/skills/systematic-debugging/SKILL.md', scope: 'plugin', plugin: 'superpowers', description: 'Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes.' },
  { name: 'writing-plans', kind: 'skill', rel: 'plugins/superpowers/skills/writing-plans/SKILL.md', scope: 'plugin', plugin: 'superpowers', description: 'Use when you have a spec or requirements for a multi-step task, before touching code.' },
  {
    name: 'code-reviewer',
    kind: 'agent',
    rel: 'plugins/superpowers/agents/code-reviewer.md',
    scope: 'plugin',
    plugin: 'superpowers',
    description: 'Reviews a completed step against the plan and coding standards.',
    tools: ['Read', 'Grep', 'Glob'],
    model: 'sonnet',
    skills: ['systematic-debugging']
  },
  { name: 'commit', kind: 'command', rel: 'plugins/commit-commands/commands/commit.md', scope: 'plugin', plugin: 'commit-commands', description: 'Create a git commit with a message derived from the staged diff.' },
  { name: 'commit-push-pr', kind: 'command', rel: 'plugins/commit-commands/commands/commit-push-pr.md', scope: 'plugin', plugin: 'commit-commands', description: 'Commit, push and open a pull request in one go.' },
  {
    name: 'webbuilder',
    kind: 'agent',
    rel: 'agents/webbuilder.md',
    description: 'Specialist for designing and implementing high-quality websites and frontend interfaces.',
    tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'mcp__playwright__browser_navigate', 'mcp__playwright__browser_take_screenshot'],
    model: 'inherit',
    skills: ['impeccable'],
    mentions: ['frontend-design', 'dataviz', 'apple-design', 'responsive-web']
  },
  {
    name: 'paper-finder',
    kind: 'agent',
    rel: 'agents/paper-finder.md',
    description: 'Finds real, verified job listings and saves every found job to the Obsidian vault.',
    tools: ['WebSearch', 'WebFetch', 'Write', 'Read', 'Bash'],
    model: 'sonnet',
    mentions: ['pdf'],
    only: 'local'
  },
  { name: 'deploy', kind: 'command', rel: 'commands/deploy.md', description: 'Build and deploy the current project to the VPS.', only: 'mini-pc' },
  { name: 'morning', kind: 'command', rel: 'commands/morning.md', description: 'Render the morning brief with calendar, TODOs and usage.' },
  {
    name: 'ipc-checker',
    kind: 'agent',
    rel: '../projects/ai-interface/.claude/agents/ipc-checker.md',
    scope: 'project',
    project: 'ai-interface',
    description: 'Checks that every IPC channel in api.ts has a handler and a preload binding.',
    tools: ['Read', 'Grep', 'Glob'],
    model: 'haiku',
    mentions: ['systematic-debugging']
  },
  { name: 'release', kind: 'command', rel: '../projects/ai-interface/.claude/commands/release.md', scope: 'project', project: 'ai-interface', description: 'Bump version, build the Windows installer and write release notes.' },
  { name: 'figma', kind: 'skill', rel: '../.codex/skills/figma/SKILL.md', ai: 'codex', description: 'Use the Figma MCP server to fetch design context, screenshots and variables.' },
  { name: 'openai-docs', kind: 'skill', rel: '../.codex/skills/openai-docs/SKILL.md', ai: 'codex', description: 'Look up current OpenAI API documentation before writing integration code.' },
  { name: 'old-scraper', kind: 'skill', rel: 'skills-disabled/old-scraper/SKILL.md', scope: 'disabled', description: 'Scrape paper archives with a headless browser (replaced by paper-finder).' }
]

/** Vorbelegte Zusammenfassungen, damit Liste und Detail beide Fälle zeigen. */
export const MOCK_SKILL_SUMMARIES: Readonly<Record<string, string>> = {
  'h-impeccable': 'Leitet Gestaltung und Überarbeitung von Oberflächen an, von der Kritik bis zum Feinschliff. Nutzen, wenn eine UI besser aussehen oder sich besser bedienen lassen soll.',
  'h-brainstorming': 'Klärt Absicht, Anforderungen und Entwurf, bevor Code entsteht. Vor jeder kreativen oder neuen Funktion zuerst aufrufen.',
  'h-webbuilder': 'Eigener Agent für Webseiten und Oberflächen: lädt Design-Skills, baut und prüft das Ergebnis per Screenshot im Browser.',
  'h-pdf': 'Liest, erstellt und bearbeitet PDF-Dateien, auch Formulare und OCR.'
}

export function mockSummaryFor(name: string): string {
  return `Kurzfassung für „${name}“: beschreibt, wofür der Eintrag gedacht ist und wann Claude ihn laden sollte.`
}

function excerpt(spec: MockSkillSpec): string {
  const lines = [`# ${spec.name}`, '', spec.description, '']
  if (spec.mentions?.length) lines.push('## Vorgehen', ...spec.mentions.map((m) => `- Lade den Skill \`${m}\`, wenn es passt.`))
  else lines.push('## Vorgehen', '1. Kontext lesen', '2. Plan festlegen', '3. Umsetzen und prüfen')
  return lines.join('\n')
}

export function mockSkillCatalog(host: HostId): SkillCatalogResult {
  const home = host === 'local' ? 'C:/Users/Alex/.claude' : '/home/alex/.claude'
  const specs = SPECS.filter((s) => !s.only || s.only === host)
  const entries: SkillEntry[] = specs.map((s) => ({
    id: `${host}:${home}/${s.rel}`,
    kind: s.kind,
    name: s.name,
    description: s.description,
    path: `${home}/${s.rel}`,
    host,
    ai: s.ai ?? 'claude',
    scope: s.scope ?? 'user',
    plugin: s.plugin ?? null,
    project: s.project ?? null,
    tools: s.tools ?? [],
    model: s.model ?? null,
    skills: s.skills ?? [],
    hash: `h-${s.name}`,
    bodyExcerpt: excerpt(s)
  }))
  const idOf = (name: string): string | undefined => entries.find((e) => e.name === name && e.kind === 'skill')?.id
  const relations: SkillRelation[] = []
  specs.forEach((s, i) => {
    const id = entries[i]?.id
    if (!id) return
    if (s.plugin) relations.push({ from: `plugin:${s.plugin}`, to: id, kind: 'contains' })
    for (const tool of s.tools ?? []) relations.push({ from: id, to: `tool:${tool}`, kind: 'uses-tool' })
    for (const name of s.skills ?? []) {
      const to = idOf(name)
      if (to) relations.push({ from: id, to, kind: 'uses-skill' })
    }
    for (const name of s.mentions ?? []) {
      const to = idOf(name)
      if (to) relations.push({ from: id, to, kind: 'mentions' })
    }
  })
  const errors = host === 'local' ? ['C:/Users/Alex/.claude/skills/broken/SKILL.md: Frontmatter nicht lesbar'] : []
  return { host, entries, relations, errors }
}
