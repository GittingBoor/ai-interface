import type { KnowledgeProject, KnowledgeStats } from '@shared/knowledge'
import { useT } from '@renderer/i18n/useT'
import { AreaTreemap } from '../charts/AreaTreemap'
import { HotspotBars } from '../charts/HotspotBars'
import { LanguageShares } from '../charts/LanguageShares'
import { useFileOpener } from '../KnowledgeLinks'
import { ChartBlock, SectionFrame } from './SectionFrame'

interface CodeProps {
  readonly stats: KnowledgeStats
  readonly project: KnowledgeProject
}

/** Woraus der Code besteht, wo er liegt und welche Dateien sich ständig ändern. */
export function CodeStructureSection({ stats, project }: CodeProps): React.JSX.Element {
  const t = useT().knowledge
  const opener = useFileOpener(project)
  const hasLanguages = stats.languages.some((l) => l.lines > 0)
  const hasAreas = stats.areas.some((a) => a.lines > 0)
  return (
    <SectionFrame id="code">
      <div className="space-y-8">
        {hasLanguages || stats.hotspots.length ? (
          <div className="grid gap-x-10 gap-y-8 @4xl:grid-cols-2">
            {hasLanguages ? (
              <ChartBlock title={t.view.languages}>
                <LanguageShares languages={stats.languages} />
              </ChartBlock>
            ) : null}
            {stats.hotspots.length ? (
              <ChartBlock title={t.view.hotspots} hint={t.view.hotspotsHint}>
                <HotspotBars hotspots={stats.hotspots} opener={opener} />
              </ChartBlock>
            ) : null}
          </div>
        ) : null}
        {hasAreas ? (
          <ChartBlock title={t.view.folders} hint={t.view.foldersHint}>
            <AreaTreemap areas={stats.areas} totalLines={stats.lines} opener={opener} />
          </ChartBlock>
        ) : null}
      </div>
    </SectionFrame>
  )
}
