import { useRef } from 'react'
import { ArrowLeft, ExternalLink, Globe, Pencil, RotateCw, Unplug } from 'lucide-react'
import type { WebLinkSettings } from '@shared/types'
import { Button, IconButton } from '@renderer/components/Button'
import { ViewHeader } from '@renderer/components/Section'
import { EmptyState, SkeletonRows } from '@renderer/components/States'
import { IS_MOCK } from '@renderer/api/client'
import { useNav } from '@renderer/stores/navStore'
import { useSettings } from '@renderer/stores/settingsStore'
import { useWebview } from './useWebview'

/** Abschnitt der Einstellungen, in dem Webseiten verwaltet werden. */
export const LINKS_SETTINGS_ANCHOR = 'links'

/** Öffnet die Adresse im Standardbrowser (der Main-Prozess leitet neue Fenster dorthin weiter). */
function openInBrowser(url: string): void {
  window.open(url, '_blank', 'noopener')
}

function WebPage({ link }: { readonly link: WebLinkSettings }): React.JSX.Element {
  const container = useRef<HTMLDivElement>(null)
  const page = useWebview(container, link.url)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-y border-line/70 px-6 py-1.5">
        <IconButton size="sm" icon={ArrowLeft} label="Zurück" disabled={!page.canGoBack} onClick={page.goBack} />
        <IconButton size="sm" icon={RotateCw} label="Neu laden" onClick={page.reload} />
        <p className="min-w-0 flex-1 truncate px-2 font-mono text-2xs text-ink-3" title={link.url}>
          {link.url}
        </p>
        {page.loading ? <span aria-label="lädt" className="size-1.5 animate-pulse-dot rounded-full bg-accent" /> : null}
      </div>
      <div className="relative min-h-0 flex-1 bg-white">
        <div ref={container} className={`size-full ${page.error ? 'invisible' : ''}`} />
        {page.error ? (
          <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-canvas p-8">
            <EmptyState
              icon={Unplug}
              title="Seite nicht erreichbar"
              action={
                <div className="flex gap-2">
                  <Button size="sm" icon={RotateCw} onClick={page.reload}>
                    Erneut versuchen
                  </Button>
                  <Button size="sm" variant="ghost" icon={ExternalLink} onClick={() => openInBrowser(link.url)}>
                    Im Browser öffnen
                  </Button>
                </div>
              }
            >
              {page.error}. Läuft der Dienst, und ist das Netz erreichbar (Heimnetz oder VPN)?
            </EmptyState>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Eine Webseite aus den Einstellungen als eigene Ansicht; Anmeldungen und Cookies bleiben in der Sitzung der App. */
export function LinkView(): React.JSX.Element {
  const linkId = useNav((s) => s.linkId)
  const openSettings = useNav((s) => s.openSettings)
  const settings = useSettings((s) => s.settings)
  const link = settings?.links.find((l) => l.id === linkId) ?? null
  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={link?.name ?? 'Verknüpfung'}
        actions={
          link ? (
            <>
              <Button variant="ghost" icon={Pencil} onClick={() => openSettings(LINKS_SETTINGS_ANCHOR)}>
                Bearbeiten
              </Button>
              <Button icon={ExternalLink} onClick={() => openInBrowser(link.url)}>
                Im Browser öffnen
              </Button>
            </>
          ) : null
        }
      />
      {!settings ? (
        <div className="px-8">
          <SkeletonRows rows={4} />
        </div>
      ) : !link ? (
        <div className="px-8">
          <EmptyState icon={Globe} title="Verknüpfung nicht gefunden">
            Sie wurde entfernt. Unter Einstellungen → Webseiten legst du Verknüpfungen an.
          </EmptyState>
        </div>
      ) : IS_MOCK ? (
        <div className="px-8">
          <EmptyState icon={Globe} title="Nur in der Desktop-App">
            Eingebettete Seiten gibt es nur in Electron. Im Browser-Modus über „Im Browser öffnen“.
          </EmptyState>
        </div>
      ) : (
        <WebPage key={link.id} link={link} />
      )}
    </div>
  )
}
