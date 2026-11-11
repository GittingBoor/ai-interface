import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { formatInteger } from '@renderer/lib/format'
import { useT } from '@renderer/i18n/useT'
import { sectionAnchor, type KnowledgeSectionEntry, type KnowledgeSectionId } from './knowledgeSections'

/** Ein Abschnitt gilt als aktiv, sobald seine Oberkante diese Strecke unter den oberen Rand des Scrollbereichs gerückt ist. */
const ACTIVE_OFFSET = 140
const BOTTOM_TOLERANCE = 4
const SCROLLER = '[data-knowledge-scroll]'
const EASE = [0.16, 1, 0.3, 1] as const

function activeSection(scroller: HTMLElement, entries: readonly KnowledgeSectionEntry[]): KnowledgeSectionId | null {
  const last = entries[entries.length - 1]
  if (last && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - BOTTOM_TOLERANCE) return last.id
  const top = scroller.getBoundingClientRect().top
  let current: KnowledgeSectionId | null = entries[0]?.id ?? null
  for (const e of entries) {
    const el = document.getElementById(sectionAnchor(e.id))
    if (el && el.getBoundingClientRect().top - top <= ACTIVE_OFFSET) current = e.id
  }
  return current
}

/** Verfolgt, welcher Abschnitt gerade oben im Scrollbereich steht. */
function useScrollSpy(anchor: React.RefObject<HTMLElement | null>, entries: readonly KnowledgeSectionEntry[]): [KnowledgeSectionId | null, (id: KnowledgeSectionId) => void] {
  const [active, setActive] = useState<KnowledgeSectionId | null>(entries[0]?.id ?? null)
  useEffect(() => {
    const scroller = anchor.current?.closest<HTMLElement>(SCROLLER)
    if (!scroller) return
    let frame = 0
    const update = (): void => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setActive(activeSection(scroller, entries)))
    }
    update()
    scroller.addEventListener('scroll', update, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      scroller.removeEventListener('scroll', update)
    }
  }, [anchor, entries])
  return [active, setActive]
}

function useJump(): (id: KnowledgeSectionId) => void {
  const reduced = useReducedMotion() ?? false
  return useCallback(
    (id) => {
      document.getElementById(sectionAnchor(id))?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    },
    [reduced]
  )
}

/** Seitenleiste mit Scroll-Spy für breite Fenster. */
export function KnowledgeTocRail({ entries }: { readonly entries: readonly KnowledgeSectionEntry[] }): React.JSX.Element {
  const t = useT().knowledge
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useScrollSpy(ref, entries)
  const jump = useJump()
  return (
    <nav ref={ref} aria-label={t.view.tocLabel} className="sticky top-0">
      <p className="mb-2 pl-3.5 text-2xs font-[600] text-ink-3">{t.view.tocTitle}</p>
      <ul className="relative space-y-px before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-line">
        {entries.map((e) => {
          const current = e.id === active
          return (
            <li key={e.id} className="relative">
              {current ? <motion.span layoutId="knowledge-toc-marker" aria-hidden className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-accent" transition={{ duration: 0.3, ease: EASE }} /> : null}
              <a
                href={`#${sectionAnchor(e.id)}`}
                aria-current={current ? 'location' : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  setActive(e.id)
                  jump(e.id)
                }}
                className={`flex h-7 items-center justify-between gap-2 rounded-r-md pr-2 pl-3.5 text-xs transition-colors duration-150 ${current ? 'font-[580] text-ink' : 'text-ink-3 hover:bg-raised hover:text-ink-2'}`}
              >
                <span className="truncate">{t.view.section[e.id]}</span>
                {e.count !== undefined ? <span className="num text-2xs text-ink-3">{formatInteger(e.count)}</span> : null}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Inhaltsverzeichnis als umbrechende Zeile für schmale Fenster. */
export function KnowledgeTocInline({ entries }: { readonly entries: readonly KnowledgeSectionEntry[] }): React.JSX.Element {
  const t = useT().knowledge
  const jump = useJump()
  return (
    <nav aria-label={t.view.tocLabel}>
      <ul className="flex flex-wrap gap-1.5">
        {entries.map((e) => (
          <li key={e.id}>
            <a
              href={`#${sectionAnchor(e.id)}`}
              onClick={(event) => {
                event.preventDefault()
                jump(e.id)
              }}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-ink-2 transition-colors duration-150 hover:border-line-strong hover:bg-raised hover:text-ink"
            >
              {t.view.section[e.id]}
              {e.count !== undefined ? <span className="num text-2xs text-ink-3">{formatInteger(e.count)}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
