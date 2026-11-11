import { Package, Wrench } from 'lucide-react'
import type { Dependency, DependencyEcosystem, KnowledgeProject } from '@shared/knowledge'
import { formatInteger } from '@renderer/lib/format'
import { useT } from '@renderer/i18n/useT'
import { FileLink } from '../KnowledgeLinks'
import { SectionFrame } from './SectionFrame'

const ECOSYSTEM_ORDER: readonly DependencyEcosystem[] = ['npm', 'pypi', 'crates', 'go']

/** Eigennamen der Paketverzeichnisse, in keiner Sprache übersetzt. */
const ECOSYSTEM_NAME: Readonly<Record<DependencyEcosystem, string>> = { npm: 'npm', pypi: 'PyPI', crates: 'crates.io', go: 'Go' }

const ECOSYSTEM_COLOR: Readonly<Record<DependencyEcosystem, string>> = {
  npm: 'var(--color-danger)',
  pypi: 'var(--color-status-review)',
  crates: 'var(--color-accent)',
  go: 'var(--color-status-idle)'
}

const REGISTRY_URL: Readonly<Record<DependencyEcosystem, (name: string) => string>> = {
  npm: (name) => `https://www.npmjs.com/package/${name}`,
  pypi: (name) => `https://pypi.org/project/${encodeURIComponent(name)}/`,
  crates: (name) => `https://crates.io/crates/${encodeURIComponent(name)}`,
  go: (name) => `https://pkg.go.dev/${name}`
}

const byName = (a: Dependency, b: Dependency): number => a.name.localeCompare(b.name)

function DependencyChip({ dep }: { readonly dep: Dependency }): React.JSX.Element {
  const t = useT().knowledge
  return (
    <a
      href={REGISTRY_URL[dep.ecosystem](dep.name)}
      target="_blank"
      rel="noreferrer"
      title={t.view.openPackage(dep.name)}
      className={`inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border px-2 font-mono text-xs transition-colors duration-150 hover:border-line-strong hover:bg-raised hover:text-ink ${
        dep.dev ? 'border-dashed border-line text-ink-3' : 'border-line bg-base text-ink'
      }`}
    >
      <span className="truncate">{dep.name}</span>
      {dep.version ? <span className="num shrink-0 text-[0.625rem] text-ink-3">{dep.version}</span> : null}
    </a>
  )
}

interface RowProps {
  readonly icon: typeof Package
  readonly title: string
  readonly deps: readonly Dependency[]
}

function DependencyRow({ icon: Icon, title, deps }: RowProps): React.JSX.Element | null {
  if (deps.length === 0) return null
  return (
    <div className="grid gap-x-4 gap-y-1.5 @2xl:grid-cols-[8rem_minmax(0,1fr)]">
      <p className="flex items-center gap-1.5 pt-1.5 text-2xs text-ink-3">
        <Icon aria-hidden className="size-3.5" strokeWidth={1.75} />
        {title}
        <span className="num">{formatInteger(deps.length)}</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {[...deps].sort(byName).map((d) => (
          <DependencyChip key={`${d.manifest}-${d.name}`} dep={d} />
        ))}
      </div>
    </div>
  )
}

interface GroupProps {
  readonly ecosystem: DependencyEcosystem
  readonly deps: readonly Dependency[]
  readonly project: KnowledgeProject
}

function EcosystemGroup({ ecosystem, deps, project }: GroupProps): React.JSX.Element {
  const t = useT().knowledge
  const manifests = [...new Set(deps.map((d) => d.manifest))]
  return (
    <div className="@container min-w-0 rounded-lg border border-line px-4 py-3">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h3 className="flex items-center gap-2 text-[0.8125rem] font-[620] text-ink">
          <span aria-hidden className="size-2 rounded-[3px]" style={{ background: ECOSYSTEM_COLOR[ecosystem] }} />
          {ECOSYSTEM_NAME[ecosystem]}
        </h3>
        <span className="flex flex-wrap gap-1.5">
          {manifests.map((m) => (
            <FileLink key={m} project={project} path={m} full />
          ))}
        </span>
      </div>
      <div className="space-y-2.5">
        <DependencyRow icon={Package} title={t.view.runtime} deps={deps.filter((d) => !d.dev)} />
        <DependencyRow icon={Wrench} title={t.view.devDeps} deps={deps.filter((d) => d.dev)} />
      </div>
    </div>
  )
}

interface DependenciesProps {
  readonly dependencies: readonly Dependency[]
  readonly project: KnowledgeProject
}

/** Bibliotheken nach Paketverzeichnis, Laufzeit getrennt von Entwicklung; Klick öffnet die Paketseite. */
export function DependenciesSection({ dependencies, project }: DependenciesProps): React.JSX.Element {
  const t = useT().knowledge
  const runtime = dependencies.filter((d) => !d.dev).length
  const groups = ECOSYSTEM_ORDER.map((e) => ({ ecosystem: e, deps: dependencies.filter((d) => d.ecosystem === e) })).filter((g) => g.deps.length > 0)
  return (
    <SectionFrame id="dependencies" description={t.view.depCount(runtime, dependencies.length - runtime)}>
      <div className="grid gap-2.5 @6xl:grid-cols-2">
        {groups.map((g) => (
          <EcosystemGroup key={g.ecosystem} ecosystem={g.ecosystem} deps={g.deps} project={project} />
        ))}
      </div>
    </SectionFrame>
  )
}
