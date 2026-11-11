import { z } from 'zod'
import type { KnowledgeDraft, KnowledgeStats, ProjectKnowledge } from '@shared/knowledge'

export const KNOWLEDGE_LIMITS = {
  summary: 300,
  nodes: 12,
  nodeNote: 140,
  features: 15,
  featureName: 60,
  timeline: 20,
  concepts: 8,
  conceptShort: 140,
  conceptLinks: 3,
  conceptFiles: 3,
  gaps: 6,
  flows: 6,
  flowSteps: 12,
  flowParticipants: 7,
  title: 60,
  line: 120,
  command: 200,
  orientation: 6,
  pitfalls: 6,
  pitfallDetail: 240,
  resources: 10
} as const

const L = KNOWLEDGE_LIMITS
const MAX_SENTENCES = 3
const SENTENCE_END = /[.!?](\s|$)/g
const WEB_URL = /^https?:\/\/\S+$/i
const PARENT_SEGMENT = /(^|[\\/])\.\.([\\/]|$)/
const ABSOLUTE_PATH = /^([\\/]|[a-zA-Z]:)/

function tooMany(field: string, max: number): string {
  return `${field} hat zu viele Einträge, erlaubt sind ${max}. Auf die wichtigsten kürzen.`
}

const text = (field: string, max: number): z.ZodString =>
  z.string().trim().min(1, `${field} darf nicht leer sein.`).max(max, `${field} ist länger als ${max} Zeichen. Kürzen.`)

const list = <T extends z.ZodType>(item: T, field: string, max: number): z.ZodArray<T> => z.array(item).max(max, tooMany(field, max))

const projectPath = (field: string): z.ZodString =>
  z
    .string()
    .trim()
    .min(1, `${field} darf nicht leer sein.`)
    .refine((path) => !ABSOLUTE_PATH.test(path) && !PARENT_SEGMENT.test(path), `${field} muss relativ zum Projekt sein und darf kein .. enthalten.`)

const webLinkSchema = z.object({
  title: text('Link-title', L.title),
  url: z.string().trim().regex(WEB_URL, 'url muss mit http:// oder https:// beginnen.')
})

const nodeSchema = z.object({
  id: z.string().min(1, 'Knoten-id darf nicht leer sein.'),
  label: z.string().min(1, 'Knoten-label darf nicht leer sein.'),
  kind: z.enum(['ui', 'service', 'data', 'external', 'device']),
  where: z.string().optional(),
  note: z.string().max(L.nodeNote, `Knoten-note ist länger als ${L.nodeNote} Zeichen. Kürzen.`).optional()
})

const edgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional()
})

const featureSchema = z.object({
  name: z.string().max(L.featureName, `Feature-name ist länger als ${L.featureName} Zeichen. Kürzen.`),
  where: z.string(),
  status: z.enum(['fertig', 'teilweise', 'geplant'])
})

const linkSchema = z.object({
  kind: z.enum(['protocol', 'commit', 'file']),
  ref: z.string()
})

const eventSchema = z.object({
  date: z.string(),
  title: z.string(),
  detail: z.string().optional(),
  links: z.array(linkSchema)
})

const explanationSchema = z.string().superRefine((value, ctx) => {
  const count = value.match(SENTENCE_END)?.length ?? 0
  if (count > MAX_SENTENCES) {
    ctx.addIssue({ code: 'custom', message: `Erklärung hat ${count} Sätze, erlaubt sind ${MAX_SENTENCES}. Kürzen.` })
  }
})

const conceptBase = {
  term: z.string(),
  explanation: explanationSchema,
  files: list(projectPath('Konzept-files'), 'concepts.files', L.conceptFiles).optional()
}

/** Gespeichertes Wissen der Fassung 1 hat weder `short` noch `links`. */
const storedConceptSchema = z.object({
  ...conceptBase,
  short: z.string().optional(),
  links: z.array(webLinkSchema).optional()
})

const draftConceptSchema = z.object({
  ...conceptBase,
  short: text('Konzept-short', L.conceptShort),
  links: list(webLinkSchema, 'concepts.links', L.conceptLinks)
})

const summarySchema = z.string().superRefine((value, ctx) => {
  if (value.length > L.summary) {
    ctx.addIssue({ code: 'custom', message: `summary hat ${value.length} Zeichen, erlaubt sind ${L.summary}. Kürzen.` })
  }
})

const architectureSchema = z
  .object({
    nodes: list(nodeSchema, 'architecture.nodes', L.nodes),
    edges: z.array(edgeSchema)
  })
  .superRefine((arch, ctx) => {
    const ids = new Set(arch.nodes.map((node) => node.id))
    arch.nodes.forEach((node, index) => {
      if (arch.nodes.findIndex((other) => other.id === node.id) !== index) {
        ctx.addIssue({ code: 'custom', path: ['nodes', index, 'id'], message: `Knoten-id "${node.id}" kommt mehrfach vor. Jede id nur einmal vergeben.` })
      }
    })
    arch.edges.forEach((edge, index) => {
      for (const end of ['from', 'to'] as const) {
        if (!ids.has(edge[end])) {
          ctx.addIssue({
            code: 'custom',
            path: ['edges', index, end],
            message: `Kante verweist auf unbekannten Knoten "${edge[end]}". Knoten anlegen oder Kante entfernen.`
          })
        }
      }
    })
  })

const flowSchema = z
  .object({
    title: text('Ablauf-title', L.title),
    question: text('Ablauf-question', L.line),
    steps: z
      .array(z.object({ from: text('Schritt-from', L.title), to: text('Schritt-to', L.title), label: text('Schritt-label', L.line) }))
      .min(1, 'Ein Ablauf braucht mindestens einen Schritt.')
      .max(L.flowSteps, tooMany('flows.steps', L.flowSteps))
  })
  .superRefine((flow, ctx) => {
    const participants = new Set(flow.steps.flatMap((step) => [step.from, step.to]))
    if (participants.size > L.flowParticipants) {
      ctx.addIssue({ code: 'custom', path: ['steps'], message: `Ablauf hat ${participants.size} Beteiligte, erlaubt sind ${L.flowParticipants}. Zusammenfassen.` })
    }
  })

const orientationSchema = z.object({
  start: list(z.object({ label: text('start-label', L.title), command: text('start-command', L.command) }), 'orientation.start', L.orientation),
  readFirst: list(z.object({ path: projectPath('readFirst-path'), why: text('readFirst-why', L.line) }), 'orientation.readFirst', L.orientation)
})

const pitfallSchema = z.object({
  title: text('Stolperfalle-title', L.title),
  detail: text('Stolperfalle-detail', L.pitfallDetail),
  where: projectPath('Stolperfalle-where').optional()
})

const resourceSchema = webLinkSchema.extend({ about: text('Ressource-about', L.line) })

const coreShape = {
  summary: summarySchema,
  architecture: architectureSchema,
  features: list(featureSchema, 'features', L.features),
  timeline: list(eventSchema, 'timeline', L.timeline),
  gaps: list(z.string(), 'gaps', L.gaps)
}

const extrasShape = {
  flows: list(flowSchema, 'flows', L.flows),
  orientation: orientationSchema,
  pitfalls: list(pitfallSchema, 'pitfalls', L.pitfalls),
  resources: list(resourceSchema, 'resources', L.resources)
}

export const knowledgeDraftSchema: z.ZodType<KnowledgeDraft> = z.object({
  ...coreShape,
  concepts: list(draftConceptSchema, 'concepts', L.concepts),
  ...extrasShape
})

const count = z.number().int().nonnegative()
const day = z.string().nullable()

export const knowledgeStatsSchema: z.ZodType<KnowledgeStats> = z.object({
  computedAt: z.number(),
  files: count,
  lines: count,
  languages: z.array(z.object({ name: z.string(), lines: count, files: count })),
  areas: z.array(z.object({ path: z.string(), lines: count, files: count })),
  commits: count,
  firstCommit: day,
  lastCommit: day,
  activity: z.array(z.object({ month: z.string(), commits: count })),
  contributorCount: count,
  contributors: z.array(z.object({ name: z.string(), commits: count })),
  hotspots: z.array(z.object({ path: z.string(), changes: count, lines: count })),
  dependencies: z.array(
    z.object({ name: z.string(), version: z.string().nullable(), ecosystem: z.enum(['npm', 'pypi', 'crates', 'go']), dev: z.boolean(), manifest: z.string() })
  )
})

/** Liest Fassung 1 und 2; was Fassung 1 nicht kennt, bleibt leer. */
export const projectKnowledgeSchema: z.ZodType<ProjectKnowledge> = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  generatedAt: z.number(),
  basedOn: z.object({
    head: z.string().nullable(),
    protocolDate: z.string().nullable()
  }),
  ...coreShape,
  concepts: z.array(storedConceptSchema),
  flows: z.array(flowSchema).optional(),
  orientation: orientationSchema.optional(),
  pitfalls: z.array(pitfallSchema).optional(),
  resources: z.array(resourceSchema).optional(),
  stats: knowledgeStatsSchema.optional()
})
