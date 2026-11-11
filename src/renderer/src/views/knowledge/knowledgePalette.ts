import type { FeatureStatus, KnowledgeNode, KnowledgeNodeKind } from '@shared/knowledge'

/** Art eines Bausteins: dieselbe Farbe im Aufbau, in den Abläufen und in der Legende. */
export const KIND_COLOR: Readonly<Record<KnowledgeNodeKind, string>> = {
  ui: 'var(--color-accent)',
  service: 'var(--color-status-review)',
  data: 'var(--color-warn)',
  external: 'var(--color-status-question)',
  device: 'var(--color-status-idle)'
}

export const KIND_ORDER: readonly KnowledgeNodeKind[] = ['ui', 'service', 'data', 'external', 'device']

/** Reihenfolge für Kategorien ohne eigene Bedeutung (Sprachen, Ordner); benachbarte Töne liegen weit auseinander. */
const SERIES_COLORS: readonly string[] = [
  'var(--color-status-review)',
  'var(--color-accent)',
  'var(--color-status-idle)',
  'var(--color-status-question)',
  'var(--color-warn)',
  'var(--color-danger)',
  'var(--color-local-ink)',
  'var(--color-mini-ink)'
]

/** Sammelposten („Sonstige“) bleibt neutral, damit er nicht als eigene Kategorie gelesen wird. */
export const OTHER_COLOR = 'var(--color-status-exited)'

export const seriesColor = (index: number): string => SERIES_COLORS[index % SERIES_COLORS.length] ?? OTHER_COLOR

export const FEATURE_COLOR: Readonly<Record<FeatureStatus, string>> = {
  fertig: 'var(--color-status-idle)',
  teilweise: 'var(--color-warn)',
  geplant: 'var(--color-line-strong)'
}

export const FEATURE_ORDER: readonly FeatureStatus[] = ['fertig', 'teilweise', 'geplant']

/** Fläche eines Bausteins in seiner Art-Farbe, auf dem dunklen Grund. */
export const tintFill = (color: string, percent: number): string => `color-mix(in oklab, ${color} ${percent}%, var(--color-raised))`

const normalize = (label: string): string => label.trim().toLocaleLowerCase()

/** Art je Beteiligtem eines Ablaufs, wenn er einem Baustein des Aufbaus entspricht. */
export function kindsByLabel(nodes: readonly KnowledgeNode[]): ReadonlyMap<string, KnowledgeNodeKind> {
  return new Map(nodes.map((n) => [normalize(n.label), n.kind]))
}

export const kindOf = (kinds: ReadonlyMap<string, KnowledgeNodeKind>, label: string): KnowledgeNodeKind | undefined => kinds.get(normalize(label))
