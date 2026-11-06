import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ExternalLink, Globe, Pencil, RotateCw, Unplug } from 'lucide-react'
import { Button, IconButton } from '@renderer/components/Button'
import { ViewHeader } from '@renderer/components/Section'
import { EmptyState, SkeletonRows } from '@renderer/components/States'
import { IS_MOCK } from '@renderer/api/client'
import { keptLinks, rememberOpened } from '@shared/links'
import type { WebLinkSettings } from '@shared/types'
import { useNav } from '@renderer/stores/navStore'
import { useSettings } from '@renderer/stores/settingsStore'
import { useT } from '@renderer/i18n/useT'
import { useWebview } from './useWebview'

/** Abschnitt der Einstellungen, in dem Webseiten verwaltet werden. */
export const LINKS_SETTINGS_ANCHOR = 'links'

const NO_LINKS: readonly WebLinkSettings[] = []

/** Öffnet die Adresse im Standardbrowser (der Main-Prozess leitet neue Fenster dorthin weiter). */
export function openInBrowser(url: string): void {
  window.open(url, '_blank', 'noopener')
}

/** Eingebettete Seite mit Zurück, Neu laden und Fehleranzeige (auch für Quellen). */
export function WebPage({ url }: { readonly url: string }): React.JSX.Element {
  const t = useT()
  const container = useRef<HTMLDivElement>(null)
  const page = useWebview(container, url)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-y border-line/70 px-6 py-1.5">
        <IconButton size="sm" icon={ArrowLeft} label={t.links.back} disabled={!page.canGoBack} onClick={page.goBack} />
        <IconButton size="sm" icon={RotateCw} label={t.links.reload} onClick={page.reload} />
        <p className="min-w-0 flex-1 truncate px-2 font-mono text-2xs text-ink-3" title={url}>
          {url}
        </p>
        {page.loading ? <span aria-label={t.links.loading} className="size-1.5 animate-pulse-dot rounded-full bg-accent" /> : null}
      </div>
      <div className="relative min-h-0 flex-1 bg-white">
        <div ref={container} className={`size-full ${page.error ? 'invisible' : ''}`} />
        {page.error ? (
          <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-canvas p-8">
            <EmptyState
              icon={Unplug}
              title={t.links.unreachable}
              action={
                <div className="flex gap-2">
                  <Button size="sm" icon={RotateCw} onClick={page.reload}>
                    {t.common.retry}
                  </Button>
                  <Button size="sm" variant="ghost" icon={ExternalLink} onClick={() => openInBrowser(url)}>
                    {t.links.openBrowser}
                  </Button>
                </div>
              }
            >
              {t.links.unreachableHint(page.error)}
            </EmptyState>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function LinkHeader({ link }: { readonly link: WebLinkSettings | null }): React.JSX.Element {
  const t = useT()
  const openSettings = useNav((s) => s.openSettings)
  return (
    <ViewHeader
      title={link?.name ?? t.links.fallbackTitle}
      actions={
        link ? (
          <>
            <Button variant="ghost" icon={Pencil} onClick={() => openSettings(LINKS_SETTINGS_ANCHOR)}>
              {t.links.edit}
            </Button>
            <Button icon={ExternalLink} onClick={() => openInBrowser(link.url)}>
              {t.links.openBrowser}
            </Button>
          </>
        ) : null
      }
    />
  )
}

/** Wartezustände der Ansicht; die Seite selbst zeigt `LinkPages`, damit sie beim Wegnavigieren nicht entladen wird. */
export function LinkView(): React.JSX.Element | null {
  const t = useT()
  const linkId = useNav((s) => s.linkId)
  const settings = useSettings((s) => s.settings)
  const link = settings?.links.find((l) => l.id === linkId) ?? null
  if (settings && link && !IS_MOCK) return null
  return (
    <div className="flex h-full flex-col">
      <LinkHeader link={link} />
      {!settings ? (
        <div className="px-8">
          <SkeletonRows rows={4} />
        </div>
      ) : !link ? (
        <div className="px-8">
          <EmptyState icon={Globe} title={t.links.notFoundTitle}>
            {t.links.notFoundBody(t.frame.views.settings, t.nav.groups.websites)}
          </EmptyState>
        </div>
      ) : (
        <div className="px-8">
          <EmptyState icon={Globe} title={t.links.desktopOnlyTitle}>
            {t.links.desktopOnlyBody(t.links.openBrowser)}
          </EmptyState>
        </div>
      )}
    </div>
  )
}

/** Einmal geöffnete Webseiten bleiben bis zum Beenden der App geladen und werden nur ausgeblendet. */
export function LinkPages(): React.JSX.Element | null {
  const view = useNav((s) => s.view)
  const linkId = useNav((s) => s.linkId)
  const links = useSettings((s) => s.settings?.links) ?? NO_LINKS
  const [opened, setOpened] = useState<readonly string[]>([])
  useEffect(() => {
    if (view === 'link') setOpened((list) => rememberOpened(list, linkId))
  }, [view, linkId])
  if (IS_MOCK) return null
  return (
    <>
      {keptLinks(links, opened).map((link) => {
        const shown = view === 'link' && link.id === linkId
        return (
          <div key={link.id} className={`absolute inset-0 flex flex-col bg-canvas ${shown ? '' : 'invisible pointer-events-none'}`} aria-hidden={!shown}>
            <LinkHeader link={link} />
            <WebPage url={link.url} />
          </div>
        )
      })}
    </>
  )
}
