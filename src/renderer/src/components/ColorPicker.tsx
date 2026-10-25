import { useEffect, useId, useRef, useState } from 'react'
import { Check, Pipette } from 'lucide-react'
import { isHexColor } from '@shared/projectIcon'
import { FAVORITE_COLORS } from '@renderer/lib/hosts'

interface ColorPickerProps {
  readonly value: string
  readonly label: string
  /** Eigene Farbe per Farbwähler und Hex-Feld (Standard: an). */
  readonly allowCustom?: boolean
  onChange(color: string): void
}

/** Der native Farbwähler feuert beim Ziehen ständig; erst nach kurzer Ruhe übernehmen. */
const NATIVE_COMMIT_DELAY_MS = 180
const SHORT_HEX_LENGTH = 4
const RAINBOW = 'conic-gradient(from 90deg, #e0714f, #d9b35a, #8fb573, #5fb3a8, #6f9bd8, #9b8ad8, #c77ea8, #e0714f)'

const sameColor = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

/** `#rgb` → `#rrggbb`, weil `<input type="color">` nur die lange Form kennt. */
function toLongHex(color: string): string {
  if (color.length !== SHORT_HEX_LENGTH) return color.toLowerCase()
  return `#${[...color.slice(1)].map((c) => c + c).join('')}`.toLowerCase()
}

function withHash(text: string): string {
  const trimmed = text.trim()
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}

interface CustomColorProps {
  readonly value: string
  readonly label: string
  readonly isCustom: boolean
  onChange(color: string): void
}

function CustomColor({ value, label, isCustom, onChange }: CustomColorProps): React.JSX.Element {
  const errorId = useId()
  const [text, setText] = useState(value)
  const [touched, setTouched] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => setText(value), [value])
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    []
  )

  const candidate = withHash(text)
  const invalid = text.trim() !== '' && !isHexColor(candidate)
  const showError = touched && invalid
  const preview = isHexColor(candidate) ? candidate : value

  const commitText = (): void => {
    setTouched(true)
    if (isHexColor(candidate) && !sameColor(candidate, value)) onChange(candidate.toLowerCase())
  }

  const onNative = (color: string): void => {
    setText(color)
    setTouched(false)
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onChange(color), NATIVE_COMMIT_DELAY_MS)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label
          title="Eigene Farbe wählen"
          className={`relative grid size-6 shrink-0 cursor-pointer place-items-center rounded-md transition-transform duration-150 focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-raised hover:scale-110 ${isCustom ? 'ring-2 ring-ink ring-offset-2 ring-offset-raised' : ''}`}
          style={{ background: isCustom ? preview : RAINBOW }}
        >
          <input
            type="color"
            aria-label={`${label}: eigene Farbe`}
            value={toLongHex(preview)}
            onChange={(e) => onNative(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
          {isCustom ? (
            <Check className="pointer-events-none size-3.5 text-canvas" strokeWidth={3} aria-hidden />
          ) : (
            <Pipette className="pointer-events-none size-3 text-canvas" strokeWidth={2.5} aria-hidden />
          )}
        </label>
        <input
          aria-label={`${label}: Hex-Wert`}
          aria-invalid={showError}
          aria-describedby={showError ? errorId : undefined}
          value={text}
          spellCheck={false}
          maxLength={7}
          placeholder="#rrggbb"
          onChange={(e) => {
            setText(e.target.value)
            if (isHexColor(withHash(e.target.value))) setTouched(false)
          }}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitText()
            }
          }}
          className="field h-7 w-[5.75rem] px-2 font-mono text-2xs"
        />
      </div>
      {showError ? (
        <p id={errorId} className="text-2xs text-danger-ink">
          Hex-Farbe erwartet, z. B. #e08a4f oder #fa0.
        </p>
      ) : null}
    </div>
  )
}

export function ColorPicker({ value, label, allowCustom = true, onChange }: ColorPickerProps): React.JSX.Element {
  const isCustom = !FAVORITE_COLORS.some((c) => sameColor(c, value))
  return (
    <div className="flex flex-col items-start gap-2.5">
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {FAVORITE_COLORS.map((color) => {
          const selected = sameColor(color, value)
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`Farbe ${color}`}
              onClick={() => onChange(color)}
              className={`grid size-6 place-items-center rounded-md transition-transform duration-150 hover:scale-110 ${selected ? 'ring-2 ring-ink ring-offset-2 ring-offset-raised' : ''}`}
              style={{ background: color }}
            >
              {selected ? <Check className="size-3.5 text-canvas" strokeWidth={3} aria-hidden /> : null}
            </button>
          )
        })}
      </div>
      {allowCustom ? (
        <CustomColor value={value} label={label} isCustom={isCustom} onChange={onChange} />
      ) : null}
    </div>
  )
}
