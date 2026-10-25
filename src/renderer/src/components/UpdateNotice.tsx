import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownToLine, TriangleAlert } from 'lucide-react'
import type { UpdateState } from '@shared/types'
import { showsUpdateNotice, UPDATES_SETTINGS_ANCHOR, useUpdate } from '@renderer/stores/updateStore'
import { useNav } from '@renderer/stores/navStore'
import { BrandSpinner } from './BrandSpinner'
import { Button } from './Button'

const ENTER = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 6 }, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } } as const

function Available({ onInstall }: { onInstall(): void }): React.JSX.Element {
  return (
    <>
      <div className="mx-3 mb-2 rounded-md border border-line bg-base p-2.5 max-lg:hidden">
        <p className="flex items-center gap-2 text-xs font-[560] text-ink">
          <ArrowDownToLine className="size-3.5 shrink-0 text-accent" aria-hidden strokeWidth={2} />
          Update verfügbar
        </p>
        <p className="mt-0.5 pl-5.5 text-2xs text-ink-3">Dauert einige Minuten.</p>
        <Button size="sm" variant="soft" className="mt-2 w-full" onClick={onInstall}>
          Aktualisieren
        </Button>
      </div>
      <button
        type="button"
        onClick={onInstall}
        title="Update verfügbar – Aktualisieren"
        className="relative mx-2 mb-2 flex h-8 items-center justify-center rounded-md border border-line bg-base text-accent transition-colors hover:border-line-strong lg:hidden"
      >
        <ArrowDownToLine className="size-3.5" aria-hidden strokeWidth={2} />
        <span className="absolute top-1 right-1 size-1.5 animate-pulse-dot rounded-full bg-accent text-accent" aria-hidden />
        <span className="sr-only">Update verfügbar. Aktualisieren.</span>
      </button>
    </>
  )
}

function Working({ title, hint }: { readonly title: string; readonly hint: string }): React.JSX.Element {
  return (
    <div title={`${title} – ${hint}`} className="mx-2 mb-2 flex h-8 items-center justify-center gap-2 rounded-md text-xs text-ink-2 lg:mx-3 lg:h-auto lg:items-start lg:justify-start lg:px-2.5 lg:py-1.5">
      <BrandSpinner className="size-3.5 text-accent lg:mt-px" />
      <span className="flex-1 max-lg:sr-only">
        <span className="block">{title}</span>
        <span className="block text-2xs text-ink-3">{hint}</span>
      </span>
    </div>
  )
}

function Failed({ onOpen }: { onOpen(): void }): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Update fehlgeschlagen. Details in den Einstellungen."
      className="mx-2 mb-2 flex h-7 shrink-0 items-center justify-center gap-2 rounded-md text-left text-2xs text-danger-ink transition-colors hover:bg-base lg:mx-3 lg:justify-start lg:px-2.5"
    >
      <TriangleAlert className="size-3.5 shrink-0" aria-hidden strokeWidth={1.75} />
      <span className="flex-1 max-lg:sr-only">Update fehlgeschlagen</span>
      <span className="sr-only">: Details in den Einstellungen.</span>
    </button>
  )
}

function NoticeBody({ state }: { readonly state: UpdateState }): React.JSX.Element | null {
  const install = useUpdate((s) => s.install)
  const openSettings = useNav((s) => s.openSettings)
  switch (state.phase) {
    case 'available':
      return <Available onInstall={() => void install()} />
    case 'building':
      return <Working title="Wird gebaut …" hint="Dauert einige Minuten" />
    case 'installing':
      return <Working title="Wird installiert" hint="App startet gleich neu" />
    case 'failed':
      return <Failed onOpen={() => openSettings(UPDATES_SETTINGS_ANCHOR)} />
    default:
      return null
  }
}

/** Hinweis in der Seitenleiste, solange ein Update ansteht, läuft oder fehlgeschlagen ist. */
export function UpdateNotice(): React.JSX.Element {
  const state = useUpdate((s) => s.state)
  const visible = showsUpdateNotice(state)
  return (
    <div aria-live="polite" className="flex shrink-0 flex-col">
      <AnimatePresence initial={false} mode="wait">
        {visible ? (
          <motion.div key={state.phase} className="flex flex-col" {...ENTER}>
            <NoticeBody state={state} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
