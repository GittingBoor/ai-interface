import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { ModelPrice, PriceTable as PriceTableType } from '@shared/types'
import { Button, IconButton } from '@renderer/components/Button'

interface PriceRow {
  readonly key: number
  readonly model: string
  readonly input: string
  readonly output: string
  readonly cacheWrite: string
  readonly cacheRead: string
}

const PRICE_FIELDS = ['input', 'output', 'cacheWrite', 'cacheRead'] as const
const FIELD_LABEL: Readonly<Record<(typeof PRICE_FIELDS)[number], string>> = { input: 'Input', output: 'Output', cacheWrite: 'Cache schreiben', cacheRead: 'Cache lesen' }

let rowKey = 0
const PRICE_DECIMALS = 6
const toText = (v: number): string => String(Number(v.toFixed(PRICE_DECIMALS))).replace('.', ',')
const toNumber = (text: string): number => Number(text.trim().replace(',', '.'))

function toRows(table: PriceTableType): PriceRow[] {
  return Object.entries(table).map(([model, p]) => ({ key: ++rowKey, model, input: toText(p.input), output: toText(p.output), cacheWrite: toText(p.cacheWrite), cacheRead: toText(p.cacheRead) }))
}

function validate(rows: readonly PriceRow[]): string | null {
  const names = rows.map((r) => r.model.trim())
  if (names.some((n) => !n)) return 'Jede Zeile braucht eine Modell-ID.'
  if (new Set(names).size !== names.length) return 'Jede Modell-ID darf nur einmal vorkommen.'
  for (const r of rows) for (const f of PRICE_FIELDS) if (!Number.isFinite(toNumber(r[f])) || toNumber(r[f]) < 0) return `Ungültiger Preis bei „${r.model}“ (${FIELD_LABEL[f]}).`
  return null
}

interface PriceTableProps {
  readonly prices: PriceTableType
  onSave(prices: PriceTableType): Promise<boolean>
}

/** Editierbare Preistabelle (USD pro Mio. Token). */
export function PriceTable({ prices, onSave }: PriceTableProps): React.JSX.Element {
  const [rows, setRows] = useState<PriceRow[]>(() => toRows(prices))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!dirty) setRows(toRows(prices))
  }, [prices, dirty])

  const edit = (key: number, field: keyof Omit<PriceRow, 'key'>, value: string): void => {
    setRows((list) => list.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
    setDirty(true)
  }

  const save = async (): Promise<void> => {
    const problem = validate(rows)
    setError(problem)
    if (problem) return
    const table: Record<string, ModelPrice> = {}
    for (const r of rows) table[r.model.trim()] = { input: toNumber(r.input), output: toNumber(r.output), cacheWrite: toNumber(r.cacheWrite), cacheRead: toNumber(r.cacheRead) }
    setSaving(true)
    const ok = await onSave(table)
    setSaving(false)
    if (ok) setDirty(false)
  }

  return (
    <div>
      <div className="-mx-2 overflow-x-auto">
        <table className="num w-full min-w-[40rem] border-separate border-spacing-0 text-xs">
          <thead>
            <tr className="text-left text-ink-3">
              <th className="px-2 pb-2 font-[520]">Modell-ID (Präfix)</th>
              {PRICE_FIELDS.map((f) => (
                <th key={f} className="w-[7.5rem] px-2 pb-2 text-right font-[520] whitespace-nowrap">
                  {FIELD_LABEL[f]}
                </th>
              ))}
              <th className="w-9 pb-2" aria-label="Aktionen" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="border-t border-line px-1 py-1">
                  <input aria-label="Modell-ID" value={r.model} onChange={(e) => edit(r.key, 'model', e.target.value)} spellCheck={false} className="field h-7 border-transparent bg-transparent font-mono text-xs hover:border-line focus:bg-canvas" />
                </td>
                {PRICE_FIELDS.map((f) => (
                  <td key={f} className="border-t border-line px-1 py-1">
                    <input
                      aria-label={`${FIELD_LABEL[f]} für ${r.model || 'neues Modell'}`}
                      inputMode="decimal"
                      value={r[f]}
                      onChange={(e) => edit(r.key, f, e.target.value)}
                      className="field num h-7 border-transparent bg-transparent text-right text-xs hover:border-line focus:bg-canvas"
                    />
                  </td>
                ))}
                <td className="border-t border-line py-1 text-right">
                  <IconButton
                    size="sm"
                    tone="danger"
                    icon={Trash2}
                    label={`${r.model || 'Zeile'} entfernen`}
                    onClick={() => {
                      setRows((list) => list.filter((x) => x.key !== r.key))
                      setDirty(true)
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? <p role="alert" className="mt-2 text-xs text-danger-ink">{error}</p> : null}
      <div className="mt-3 flex items-center justify-between gap-3">
        <Button
          size="sm"
          variant="ghost"
          icon={Plus}
          onClick={() => {
            setRows((list) => [...list, { key: ++rowKey, model: '', input: '0', output: '0', cacheWrite: '0', cacheRead: '0' }])
            setDirty(true)
          }}
        >
          Zeile hinzufügen
        </Button>
        <div className="flex gap-2">
          {dirty ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDirty(false)
                setError(null)
                setRows(toRows(prices))
              }}
            >
              Verwerfen
            </Button>
          ) : null}
          <Button size="sm" variant="primary" disabled={!dirty} loading={saving} onClick={() => void save()}>
            Preise speichern
          </Button>
        </div>
      </div>
    </div>
  )
}
