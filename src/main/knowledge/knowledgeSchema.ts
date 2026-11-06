import { z } from 'zod'
import type { KnowledgeDraft, ProjectKnowledge } from '@shared/knowledge'

export const KNOWLEDGE_LIMITS = {
  summary: 300,
  nodes: 12,
  features: 15,
  featureName: 60,
  timeline: 20,
  concepts: 8,
  gaps: 6
} as const

const MAX_SENTENCES = 3
const SENTENCE_END = /[.!?](\s|$)/g

function tooMany(field: string, max: number): string {
  return `${field} hat zu viele Einträge, erlaubt sind ${max}. Auf die wichtigsten kürzen.`
}

const nodeSchema = z.object({
  id: z.string().min(1, 'Knoten-id darf nicht leer sein.'),
  label: z.string().min(1, 'Knoten-label darf nicht leer sein.'),
  kind: z.enum(['ui', 'service', 'data', 'external', 'device'])
})

const edgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional()
})

const featureSchema = z.object({
  name: z
    .string()
    .max(
      KNOWLEDGE_LIMITS.featureName,
      `Feature-name ist länger als ${KNOWLEDGE_LIMITS.featureName} Zeichen. Kürzen.`
    ),
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

const conceptSchema = z.object({
  term: z.string(),
  explanation: z.string().superRefine((text, ctx) => {
    const count = text.match(SENTENCE_END)?.length ?? 0
    if (count > MAX_SENTENCES) {
      ctx.addIssue({
        code: 'custom',
        message: `Erklärung hat ${count} Sätze, erlaubt sind ${MAX_SENTENCES}. Kürzen.`
      })
    }
  })
})

const summarySchema = z.string().superRefine((text, ctx) => {
  if (text.length > KNOWLEDGE_LIMITS.summary) {
    ctx.addIssue({
      code: 'custom',
      message: `summary hat ${text.length} Zeichen, erlaubt sind ${KNOWLEDGE_LIMITS.summary}. Kürzen.`
    })
  }
})

const architectureSchema = z
  .object({
    nodes: z
      .array(nodeSchema)
      .max(KNOWLEDGE_LIMITS.nodes, tooMany('architecture.nodes', KNOWLEDGE_LIMITS.nodes)),
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

const draftShape = {
  summary: summarySchema,
  architecture: architectureSchema,
  features: z
    .array(featureSchema)
    .max(KNOWLEDGE_LIMITS.features, tooMany('features', KNOWLEDGE_LIMITS.features)),
  timeline: z
    .array(eventSchema)
    .max(KNOWLEDGE_LIMITS.timeline, tooMany('timeline', KNOWLEDGE_LIMITS.timeline)),
  concepts: z
    .array(conceptSchema)
    .max(KNOWLEDGE_LIMITS.concepts, tooMany('concepts', KNOWLEDGE_LIMITS.concepts)),
  gaps: z.array(z.string()).max(KNOWLEDGE_LIMITS.gaps, tooMany('gaps', KNOWLEDGE_LIMITS.gaps))
}

export const knowledgeDraftSchema: z.ZodType<KnowledgeDraft> = z.object(draftShape)

export const projectKnowledgeSchema: z.ZodType<ProjectKnowledge> = z.object({
  version: z.literal(1),
  generatedAt: z.number(),
  basedOn: z.object({
    head: z.string().nullable(),
    protocolDate: z.string().nullable()
  }),
  ...draftShape
})
