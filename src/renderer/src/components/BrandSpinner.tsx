interface BrandSpinnerProps {
  readonly className?: string
  /** Mit Text wird der Spinner für Screenreader angesagt, sonst ist er rein dekorativ. */
  readonly label?: string
}

/** Lade-Anzeige im Markenstil: das Λ der Bildmarke schreibt sich, der Cursor blinkt. Farbe = currentColor. */
export function BrandSpinner({ className = 'size-3.5', label }: BrandSpinnerProps): React.JSX.Element {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }
  return (
    <svg viewBox="0 0 16 16" className={`shrink-0 ${className}`} {...a11y}>
      <path
        className="brand-spinner-lambda"
        d="M2.75 13 L6 3.25 L9.25 13"
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect className="brand-spinner-caret" x="11.25" y="2" width="2" height="12" rx="1" fill="currentColor" />
    </svg>
  )
}
