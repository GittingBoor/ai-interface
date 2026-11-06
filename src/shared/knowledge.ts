import type { HostId } from './types'

export const KNOWLEDGE_DIR = '.ai-interface'
export const KNOWLEDGE_FILE = 'projektwissen.json'

export type KnowledgeNodeKind = 'ui' | 'service' | 'data' | 'external' | 'device'
export type FeatureStatus = 'fertig' | 'teilweise' | 'geplant'
export type KnowledgeLinkKind = 'protocol' | 'commit' | 'file'

export interface KnowledgeBasis {
  readonly head: string | null
  /** 'JJJJ-MM-TT' */
  readonly protocolDate: string | null
}

export interface KnowledgeNode {
  readonly id: string
  readonly label: string
  readonly kind: KnowledgeNodeKind
}

export interface KnowledgeEdge {
  readonly from: string
  readonly to: string
  readonly label?: string
}

export interface KnowledgeFeature {
  readonly name: string
  readonly where: string
  readonly status: FeatureStatus
}

export interface KnowledgeLink {
  readonly kind: KnowledgeLinkKind
  readonly ref: string
}

export interface KnowledgeEvent {
  readonly date: string
  readonly title: string
  readonly detail?: string
  readonly links: readonly KnowledgeLink[]
}

export interface KnowledgeConcept {
  readonly term: string
  readonly explanation: string
}

export interface ProjectKnowledge {
  readonly version: 1
  readonly generatedAt: number
  readonly basedOn: KnowledgeBasis
  readonly summary: string
  readonly architecture: {
    readonly nodes: readonly KnowledgeNode[]
    readonly edges: readonly KnowledgeEdge[]
  }
  readonly features: readonly KnowledgeFeature[]
  readonly timeline: readonly KnowledgeEvent[]
  readonly concepts: readonly KnowledgeConcept[]
  readonly gaps: readonly string[]
}

/** Inhalt, den der Agent liefert; generatedAt und basedOn setzt die App. */
export type KnowledgeDraft = Omit<ProjectKnowledge, 'version' | 'generatedAt' | 'basedOn'>

export type KnowledgeStatus =
  | 'current'
  | 'stale'
  | 'missing'
  | 'running'
  | 'queued'
  | 'deferred'
  | 'unreachable'
  | 'failed'

export interface KnowledgeProject {
  readonly favoriteId: number
  readonly name: string
  readonly host: HostId
  readonly path: string
  readonly color: string
  readonly icon: string | null
  readonly status: KnowledgeStatus
  readonly knowledge: ProjectKnowledge | null
  readonly error: string | null
}

/** Ein Projekt, das ein Durchgang aufbereiten würde, mit geschätztem Verbrauch. */
export interface KnowledgePlanItem {
  readonly favoriteId: number
  readonly name: string
  readonly status: Extract<KnowledgeStatus, 'missing' | 'stale'>
  /** Prozentpunkte des 5-Stunden-Fensters (Richtwert). */
  readonly estimate: number
}

/** Vorschau vor einem Durchgang, damit der Nutzer auswählt, bevor Kontingent fließt. */
export interface KnowledgePlan {
  readonly items: readonly KnowledgePlanItem[]
  /** Wie viele Projekte Projektwissen eingeschaltet haben. */
  readonly enabled: number
  /** Verbrauch des 5-Stunden-Fensters jetzt; null = unbekannt. */
  readonly quotaPercent: number | null
  /** Ab hier stellt der Durchgang den Rest zurück. */
  readonly stopPercent: number
}

export interface KnowledgeProgress {
  readonly active: boolean
  readonly total: number
  readonly done: number
  readonly deferred: number
  readonly runs: readonly { readonly favoriteId: number; readonly terminalId: string }[]
}
