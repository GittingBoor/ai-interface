import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, FileText, RotateCcw } from 'lucide-react'
import { crashReport } from '@shared/crashReport'
import { api } from '@renderer/api/client'
import { useT } from '@renderer/i18n/useT'
import { Button } from './Button'
import { EmptyState } from './States'

/** Schreibt einen Fehler der Oberfläche ins Log; scheitert das, bleibt er wenigstens in der Konsole. */
export function logCrash(report: Parameters<typeof api.app.logError>[0]): void {
  console.error(report.message, report.stack)
  void api.app.logError(report).catch(() => undefined)
}

function CrashFallback({ message }: { readonly message: string }): React.JSX.Element {
  const t = useT().frame.states
  return (
    <div className="h-full overflow-y-auto px-8">
      <EmptyState
        icon={AlertTriangle}
        title={t.crashTitle}
        action={
          <div className="flex gap-2">
            <Button variant="primary" icon={RotateCcw} onClick={() => window.location.reload()}>
              {t.reload}
            </Button>
            <Button variant="ghost" icon={FileText} onClick={() => void api.app.openLog()}>
              {t.openLog}
            </Button>
          </div>
        }
      >
        <p>{t.crashBody}</p>
        <p className="mt-2 font-mono text-2xs break-all text-ink-3">{message}</p>
      </EmptyState>
    </div>
  )
}

interface ErrorBoundaryProps {
  readonly children: ReactNode
}

interface ErrorBoundaryState {
  readonly message: string | null
}

/** Fängt Renderfehler eines Bereichs ab: statt eines schwarzen Fensters erscheint eine Meldung, der Fehler kommt ins Log. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { message: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { message: crashReport('render', error).message }
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    logCrash(crashReport('render', error, info.componentStack ?? ''))
  }

  override render(): ReactNode {
    return this.state.message === null ? this.props.children : <CrashFallback message={this.state.message} />
  }
}
