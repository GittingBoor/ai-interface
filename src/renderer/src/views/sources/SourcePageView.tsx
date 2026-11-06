import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bookmark, ExternalLink, Globe, MonitorPlay, Star } from 'lucide-react'
import type { Source, SourceOpenMode } from '@shared/types'
import { domainOf } from '@shared/sources'
import { IS_MOCK } from '@renderer/api/client'
import { Button } from '@renderer/components/Button'
import { ViewHeader } from '@renderer/components/Section'
import { EmptyState, SkeletonRows } from '@renderer/components/States'
import { useNav } from '@renderer/stores/navStore'
import { useSources } from '@renderer/stores/sourcesStore'
import { openInBrowser, WebPage } from '../links/LinkView'
import { displayTitle } from './folders'
import { useT } from '@renderer/i18n/useT'
import { toggleStar, useOpenMode } from './useSourceActions'

/** Bei „Browser“: einmal im Browser öffnen, hier nur ein ruhiger Hinweis mit „Hier anzeigen“. */
function OpenedInBrowser({ source, onShowHere }: { readonly source: Source; onShowHere(): void }): React.JSX.Element {
  const t = useT()
  return (
    <div className="px-8">
      <EmptyState
        icon={ExternalLink}
        title={t.sources.openedTitle}
        action={
          <div className="flex gap-2">
            <Button size="sm" icon={MonitorPlay} onClick={onShowHere}>
              {t.sources.showHere}
            </Button>
            <Button size="sm" variant="ghost" icon={ExternalLink} onClick={() => openInBrowser(source.url)}>
              {t.sources.openAgain}
            </Button>
          </div>
        }
      >
        {t.sources.openedBody(t.sources.showHere)}
      </EmptyState>
    </div>
  )
}

function SourceBody({ source, openIn }: { readonly source: Source; readonly openIn: SourceOpenMode }): React.JSX.Element {
  const t = useT()
  const [showHere, setShowHere] = useState(openIn === 'app')
  const opened = useRef(false)
  useEffect(() => {
    if (openIn !== 'browser' || opened.current) return
    opened.current = true
    openInBrowser(source.url)
  }, [openIn, source.url])

  if (!showHere) return <OpenedInBrowser source={source} onShowHere={() => setShowHere(true)} />
  if (IS_MOCK) {
    return (
      <div className="px-8">
        <EmptyState icon={Globe} title={t.links.desktopOnlyTitle}>
          {t.links.desktopOnlyBody(t.links.openBrowser)}
        </EmptyState>
      </div>
    )
  }
  return <WebPage url={source.url} />
}

/** Eine Quelle als eigene Ansicht, erreichbar über die Liste oder mit Stern aus der Seitenleiste. */
export function SourcePageView(): React.JSX.Element {
  const t = useT()
  const sourceId = useNav((s) => s.sourceId)
  const go = useNav((s) => s.go)
  const loaded = useSources((s) => s.loaded)
  const source = useSources((s) => s.sources.find((x) => x.id === sourceId) ?? null)
  const openIn = useOpenMode()

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={source ? displayTitle(source) : t.sources.sourceFallback}
        actions={
          <>
            <Button variant="ghost" icon={ArrowLeft} onClick={() => go('sources')}>
              {t.frame.views.sources}
            </Button>
            {source ? (
              <>
                <Button variant="ghost" icon={Star} onClick={() => void toggleStar(source)}>
                  {source.starred ? t.sources.starRemove : t.sources.starSet}
                </Button>
                <Button icon={ExternalLink} onClick={() => openInBrowser(source.url)}>
                  {t.sources.openBrowser}
                </Button>
              </>
            ) : null}
          </>
        }
      >
        {source ? (
          <span className="block truncate">
            {domainOf(source.url)}
            {source.note ? ` · ${source.note}` : ''}
          </span>
        ) : null}
      </ViewHeader>
      {!loaded ? (
        <div className="px-8">
          <SkeletonRows rows={4} />
        </div>
      ) : !source ? (
        <div className="px-8">
          <EmptyState
            icon={Bookmark}
            title={t.sources.notFoundTitle}
            action={
              <Button size="sm" icon={ArrowLeft} onClick={() => go('sources')}>
                {t.sources.toSources}
              </Button>
            }
          >
            {t.sources.notFoundBody(t.frame.views.sources)}
          </EmptyState>
        </div>
      ) : (
        <SourceBody key={source.id} source={source} openIn={openIn} />
      )}
    </div>
  )
}
