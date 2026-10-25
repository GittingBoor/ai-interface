import { useEffect, useRef } from 'react'
import { terminalRegistry } from '@renderer/lib/terminalRegistry'

interface TerminalPaneProps {
  /** Angezeigtes Terminal; wechselt, wenn ein anderes Terminal in den Slot kommt. */
  readonly id: string
  readonly active: boolean
  /** Bereich sichtbar (Terminal-Seite geöffnet). */
  readonly visible: boolean
}

/**
 * Container eines Slots. Die xterm-Instanz lebt in der Registry und wird hier nur
 * eingehängt: beim Wechsel des Terminals oder des Layouts verschoben, nie neu erzeugt.
 */
export function TerminalPane({ id, active, visible }: TerminalPaneProps): React.JSX.Element {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = container.current
    if (!element) return
    terminalRegistry.attach(id, element)
    const observer = new ResizeObserver(() => terminalRegistry.fit(id))
    observer.observe(element)
    return () => {
      observer.disconnect()
      // React räumt alle Effekte eines Commits vor dem neuen Einhängen auf, ein Tausch zwischen Slots bleibt also heil.
      element.replaceChildren()
    }
  }, [id])

  useEffect(() => {
    if (!active || !visible) return
    const frame = requestAnimationFrame(() => {
      terminalRegistry.fit(id)
      terminalRegistry.focus(id)
    })
    return () => cancelAnimationFrame(frame)
  }, [active, visible, id])

  return <div ref={container} className="h-full w-full" />
}
