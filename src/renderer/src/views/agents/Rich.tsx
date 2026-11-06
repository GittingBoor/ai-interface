import type { ReactNode } from 'react'

const MARKUP = /(\*\*[^*]+\*\*|`[^`]+`)/g
const BOLD_MARK = '**'
const CODE_CLASS = 'rounded bg-raised px-1 font-mono text-2xs text-ink-2'

/** Wörterbuchtexte mit einfacher Auszeichnung: `**fett**` und `Code` in Backticks. */
export function Rich({ text, codeClassName = CODE_CLASS }: { readonly text: string; readonly codeClassName?: string }): React.JSX.Element {
  const nodes: ReactNode[] = text.split(MARKUP).map((part, i) => {
    if (part.startsWith(BOLD_MARK) && part.endsWith(BOLD_MARK) && part.length > 2 * BOLD_MARK.length) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={i} className={codeClassName}>{part.slice(1, -1)}</code>
    return part
  })
  return <>{nodes}</>
}
