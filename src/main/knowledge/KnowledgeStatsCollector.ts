import type { Dependency, KnowledgeStats } from '@shared/knowledge'
import { joinPath, type Host } from '../hosts/Host'
import { quoteFor } from '../hosts/projectRead'
import {
  aggregateAreas,
  aggregateLanguages,
  findManifests,
  hotspots,
  mergeDependencies,
  monthlyActivity,
  parseDates,
  parseManifest,
  parseNumstat,
  parseShortlog,
  topContributors
} from './statsParse'

/** Leerer Baum in Git (SHA-1); der Diff dagegen liefert die Zeilen jeder Datei. */
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'
const HOTSPOT_COMMITS = 500
const MANIFEST_READ_BYTES = 64 * 1024

/** Berechnet Kennzahlen eines Projekts aus Git und Manifesten, ganz ohne KI. */
export class KnowledgeStatsCollector {
  constructor(
    private readonly logError: (message: string, error: unknown) => void,
    private readonly now: () => number = Date.now
  ) {}

  /** `null` ohne Git; einzelne Teile, die scheitern, bleiben leer. */
  async collect(host: Host, projectPath: string): Promise<KnowledgeStats | null> {
    const git = (args: string): Promise<string | null> => this.git(host, projectPath, args)
    if ((await git('rev-parse HEAD')) === null) return null
    const [numstat, dates, shortlog, names] = await Promise.all([
      git(`diff --numstat -z ${EMPTY_TREE} HEAD`),
      git('log --no-merges --date=short --format=%ad HEAD'),
      git('shortlog -sn --no-merges HEAD'),
      git(`log --no-merges --format= --name-only -n ${HOTSPOT_COMMITS} HEAD`)
    ])
    const files = parseNumstat(numstat ?? '')
    const days = parseDates(dates ?? '')
    const contributors = parseShortlog(shortlog ?? '')
    return {
      computedAt: this.now(),
      files: files.length,
      lines: files.reduce((sum, f) => sum + f.lines, 0),
      languages: aggregateLanguages(files),
      areas: aggregateAreas(files),
      commits: days.length,
      firstCommit: days.at(-1) ?? null,
      lastCommit: days[0] ?? null,
      activity: monthlyActivity(days),
      contributorCount: contributors.length,
      contributors: topContributors(contributors),
      hotspots: hotspots(names ?? '', files),
      dependencies: await this.dependencies(host, projectPath, files.map((f) => f.path))
    }
  }

  private async dependencies(host: Host, projectPath: string, paths: readonly string[]): Promise<Dependency[]> {
    const lists = await Promise.all(
      findManifests(paths).map(async (path) => {
        try {
          const data = await host.readFile(joinPath(host, projectPath, path), 0, MANIFEST_READ_BYTES)
          return parseManifest(path, data.toString('utf8'))
        } catch (error) {
          // Ein unlesbares Manifest soll die übrigen Kennzahlen nicht verhindern.
          this.logError(`Manifest ${path} lesen`, error) // i18n-ignore: Logtext
          return []
        }
      })
    )
    return mergeDependencies(lists.flat())
  }

  private async git(host: Host, projectPath: string, args: string): Promise<string | null> {
    const result = await host.exec(`git -C ${quoteFor(host, projectPath)} -c core.quotepath=off ${args}`)
    return result.code === 0 ? result.stdout : null
  }
}
