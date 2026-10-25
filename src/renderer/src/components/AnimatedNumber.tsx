import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'motion/react'

interface AnimatedNumberProps {
  readonly value: number
  readonly format: (value: number) => string
  readonly className?: string
}

const DURATION_S = 0.7

/** Zählt beim ersten Anzeigen und bei Änderungen weich zum neuen Wert. */
export function AnimatedNumber({ value, format, className }: AnimatedNumberProps): React.JSX.Element {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)
  const previous = useRef(reduced ? value : 0)

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      previous.current = value
      return
    }
    const controls = animate(previous.current, value, {
      duration: DURATION_S,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setDisplay
    })
    previous.current = value
    return () => controls.stop()
  }, [value, reduced])

  return (
    <span className={className}>
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden>{format(display)}</span>
    </span>
  )
}
