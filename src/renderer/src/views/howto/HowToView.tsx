import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { IconButton } from '@renderer/components/Button'
import { Kbd } from '@renderer/components/Controls'
import { ViewHeader } from '@renderer/components/Section'
import { filterHowTo, HOWTO_ENTRIES, HOWTO_GROUPS } from '@renderer/lib/howto'
import { SpeechPanel } from './SpeechPanel'

export function HowToView(): React.JSX.Element {
  const [query, setQuery] = useState('')
  const visible = useMemo(() => filterHowTo(HOWTO_ENTRIES, query), [query])

  return (
    <div className="flex h-full flex-col">
      <ViewHeader title="Steuerung" />
      <div className="@container/main min-h-0 flex-1 overflow-y-auto px-8 pb-12">
        <div className="grid items-start gap-8 @min-[90rem]/main:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] @min-[90rem]/main:gap-12">
          <SpeechPanel />
          <section aria-label="Kürzel und Tricks">
            <label className="relative block max-w-sm">
              <span className="sr-only">Kürzel suchen</span>
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && query) {
                    e.stopPropagation()
                    setQuery('')
                  }
                }}
                placeholder="Kürzel suchen …"
                className="field pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? <IconButton size="sm" icon={X} label="Suche leeren" className="absolute top-0.5 right-0.5 size-7" onClick={() => setQuery('')} /> : null}
            </label>
            <div className="grid gap-x-10 @min-[120rem]/main:grid-cols-2">
              {HOWTO_GROUPS.map((group) => {
                const entries = visible.filter((e) => e.group === group.id)
                if (!entries.length) return null
                return (
                  <div key={group.id} className="mt-6">
                    <h2 className="text-xs font-[620] text-ink-2">{group.label}</h2>
                    <ul className="mt-2 divide-y divide-line border-y border-line">
                      {entries.map((e) => (
                        <li key={`${e.group}-${e.title}`} className="grid grid-cols-[11rem_1fr] items-baseline gap-4 py-2.5">
                          <span className="flex flex-wrap gap-0.5">
                            {e.keys.map((k, i) => (
                              <Kbd key={`${i}-${k}`}>{k}</Kbd>
                            ))}
                          </span>
                          <span>
                            <span className="block text-[0.8125rem] font-[560] text-ink">{e.title}</span>
                            <span className="block text-xs text-ink-3">{e.description}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
            {visible.length === 0 ? <p className="mt-6 text-xs text-ink-3">Nichts gefunden für „{query}“.</p> : null}
          </section>
        </div>
      </div>
    </div>
  )
}
