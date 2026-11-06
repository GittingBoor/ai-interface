import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { LINK_PARTITION } from '@shared/links'
import { currentT } from '@renderer/i18n/useT'

/** Der Teil der Electron-`<webview>`-Schnittstelle, den die Ansicht braucht. */
interface WebviewElement extends HTMLElement {
  canGoBack(): boolean
  goBack(): void
  reload(): void
  executeJavaScript(code: string): Promise<unknown>
}

interface FailLoadEvent extends Event {
  readonly errorCode: number
  readonly errorDescription: string
  readonly isMainFrame: boolean
}

/** Chromium meldet abgebrochene Ladevorgänge (Weiterleitung, neuer Klick) als Fehler -3; das ist keiner. */
const ERR_ABORTED = -3
const NAVIGATION_EVENTS: readonly string[] = ['did-navigate', 'did-navigate-in-page']

/** Fehlerart des letzten Ladevorgangs; der Text entsteht erst bei der Anzeige in der aktuellen Sprache. */
interface LoadFailure {
  readonly code: number
  readonly description: string
}

export interface WebviewState {
  readonly loading: boolean
  readonly error: string | null
  readonly canGoBack: boolean
  goBack(): void
  reload(): void
  /** Code in der geladenen Seite ausführen (z. B. für Erweiterungen); ohne Seite → `null`. */
  executeJavaScript(code: string): Promise<unknown>
}

/**
 * Hängt eine `<webview>` mit der dauerhaften Sitzung der Verknüpfungen in den Container. Sie entsteht per DOM statt JSX,
 * weil React das Attribut `allowpopups` nicht schreibt; ohne es kämen Links mit neuem Fenster nicht im Browser an.
 */
export function useWebview(container: RefObject<HTMLDivElement | null>, url: string, partition: string = LINK_PARTITION): WebviewState {
  const view = useRef<WebviewElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState<LoadFailure | null>(null)
  const [canGoBack, setCanGoBack] = useState(false)

  useEffect(() => {
    const host = container.current
    if (!host) return
    const element = document.createElement('webview') as WebviewElement
    element.setAttribute('partition', partition)
    element.setAttribute('allowpopups', '')
    element.setAttribute('src', url)
    element.className = 'size-full'
    const onStart = (): void => {
      setLoading(true)
      setFailure(null)
    }
    const onStop = (): void => setLoading(false)
    const onFail = (event: Event): void => {
      const fail = event as FailLoadEvent
      if (fail.isMainFrame && fail.errorCode !== ERR_ABORTED) setFailure({ code: fail.errorCode, description: fail.errorDescription })
    }
    const onNavigate = (): void => setCanGoBack(element.canGoBack())
    element.addEventListener('did-start-loading', onStart)
    element.addEventListener('did-stop-loading', onStop)
    element.addEventListener('did-fail-load', onFail)
    for (const name of NAVIGATION_EVENTS) element.addEventListener(name, onNavigate)
    host.replaceChildren(element)
    view.current = element
    return () => {
      view.current = null
      element.remove()
      setLoading(true)
      setFailure(null)
      setCanGoBack(false)
    }
  }, [container, url, partition])

  const goBack = useCallback(() => view.current?.goBack(), [])
  const reload = useCallback(() => view.current?.reload(), [])
  const executeJavaScript = useCallback(async (code: string) => (view.current ? view.current.executeJavaScript(code) : null), [])
  const error = failure ? failure.description || currentT().links.errorCode(failure.code) : null
  return { loading, error, canGoBack, goBack, reload, executeJavaScript }
}
