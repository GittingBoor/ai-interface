import type { HostId } from './types'

export const KNOWLEDGE_DIR = '.ai-interface'
export const KNOWLEDGE_FILE = 'projektwissen.json'
/** Ältere Fassungen gelten als veraltet und werden beim nächsten Durchgang neu aufbereitet. */
export const KNOWLEDGE_VERSION = 2
/** Sammelname für Sprachen außerhalb der größten; die Oberfläche übersetzt ihn. */
export const OTHER_LANGUAGE = 'Other'

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
  /** Ordner oder Datei im Projekt. */
  readonly where?: string
  /** Ein Satz: was der Baustein tut. */
  readonly note?: string
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

/** Verweis auf eine Seite im Netz, z. B. offizielle Dokumentation. */
export interface KnowledgeWebLink {
  readonly title: string
  readonly url: string
}

export interface KnowledgeConcept {
  readonly term: string
  /** Ein Satz zum Überfliegen; fehlt bei Wissen der Fassung 1. */
  readonly short?: string
  readonly explanation: string
  readonly links?: readonly KnowledgeWebLink[]
  /** Dateien, in denen das Konzept steckt. */
  readonly files?: readonly string[]
}

/** Ein Schritt eines Ablaufs: wer schickt wem was. */
export interface KnowledgeFlowStep {
  readonly from: string
  readonly to: string
  readonly label: string
}

/** Ein Ablauf als Sequenzdiagramm, z. B. „Was passiert beim Speichern?“. */
export interface KnowledgeFlow {
  readonly title: string
  readonly question: string
  readonly steps: readonly KnowledgeFlowStep[]
}

export interface KnowledgeCommand {
  readonly label: string
  readonly command: string
}

export interface KnowledgeEntryPoint {
  readonly path: string
  readonly why: string
}

/** Einstieg: wie man das Projekt startet und welche Dateien man zuerst liest. */
export interface KnowledgeOrientation {
  readonly start: readonly KnowledgeCommand[]
  readonly readFirst: readonly KnowledgeEntryPoint[]
}

/** Stolperfalle: was man beim Arbeiten am Projekt wissen muss, um nichts kaputtzumachen. */
export interface KnowledgePitfall {
  readonly title: string
  readonly detail: string
  readonly where?: string
}

export interface KnowledgeResource extends KnowledgeWebLink {
  readonly about: string
}

/** Was der Agent in Fassung 1 lieferte. */
interface KnowledgeCore {
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

/** Seit Fassung 2. */
interface KnowledgeExtras {
  readonly flows: readonly KnowledgeFlow[]
  readonly orientation: KnowledgeOrientation
  readonly pitfalls: readonly KnowledgePitfall[]
  readonly resources: readonly KnowledgeResource[]
}

export interface LanguageShare {
  readonly name: string
  readonly lines: number
  readonly files: number
}

/** Ordner (erste und zweite Ebene) mit Größe. */
export interface AreaSize {
  readonly path: string
  readonly lines: number
  readonly files: number
}

export interface Hotspot {
  readonly path: string
  /** Commits, die die Datei geändert haben (aus den letzten Commits). */
  readonly changes: number
  readonly lines: number
}

export interface Contributor {
  readonly name: string
  readonly commits: number
}

export interface MonthActivity {
  /** 'JJJJ-MM' */
  readonly month: string
  readonly commits: number
}

export type DependencyEcosystem = 'npm' | 'pypi' | 'crates' | 'go'

export interface Dependency {
  readonly name: string
  readonly version: string | null
  readonly ecosystem: DependencyEcosystem
  readonly dev: boolean
  /** Manifest, aus dem die Abhängigkeit stammt (Pfad im Projekt). */
  readonly manifest: string
}

/** Kennzahlen, die die App selbst aus Git und den Manifesten berechnet (ohne KI). */
export interface KnowledgeStats {
  readonly computedAt: number
  readonly files: number
  readonly lines: number
  readonly languages: readonly LanguageShare[]
  readonly areas: readonly AreaSize[]
  readonly commits: number
  /** 'JJJJ-MM-TT' */
  readonly firstCommit: string | null
  readonly lastCommit: string | null
  readonly activity: readonly MonthActivity[]
  readonly contributorCount: number
  readonly contributors: readonly Contributor[]
  readonly hotspots: readonly Hotspot[]
  readonly dependencies: readonly Dependency[]
}

export interface ProjectKnowledge extends KnowledgeCore, Partial<KnowledgeExtras> {
  readonly version: 1 | 2
  readonly generatedAt: number
  readonly basedOn: KnowledgeBasis
  /** Fehlt ohne Git oder bei Wissen der Fassung 1. */
  readonly stats?: KnowledgeStats
}

/** Inhalt, den der Agent liefert; version, generatedAt, basedOn und stats setzt die App. */
export interface KnowledgeDraft extends KnowledgeCore, KnowledgeExtras {}

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
