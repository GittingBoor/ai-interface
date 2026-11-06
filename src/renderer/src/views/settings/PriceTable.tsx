import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { ModelPrice, PriceTable as PriceTableType } from '@shared/types'
import { Button, IconButton } from '@renderer/components/Button'
import { currentT, useT } from '@renderer/i18n/useT'

interface PriceRow {
  readonly key: number
  readonly model: string
  readonly input: string
  readonly output: string
  readonly cacheWrite: string
  readonly cacheRead: string
}

const PRICE_FIELDS = ['input', 'output', 'cacheWrite', 'cacheRead'] as const

let rowKey = 0
const PRICE_DECIMALS = 6
const toText = (v: number): string => String(Number(v.toFixed(PRICE_DECIMALS))).replace('.', ',')
const toNumber = (text: string): number => Number(text.trim().replace(',', '.'))

function toRows(table: PriceTableType): PriceRow[] {
  return Object.entries(table).map(([model, p]) => ({ key: ++rowKey, model, input: toText(p.input), output: toText(p.output), cacheWrite: toText(p.cacheWrite), cacheRead: toText(p.cacheRead) }))
}

/** Fehlerart statt Text, damit die Meldung beim Sprachwechsel mitgeht. */
type PriceProblem =
  | { readonly kind: 'missingId' }
  | { readonly kind: 'duplicateId' }
  | { readonly kind: 'invalidPrice'; readonly model: string; readonly field: (typeof PRICE_FIELDS)[number] }

function validate(rows: readonly PriceRow[]): PriceProblem | null {
  const names = rows.map((r) => r.model.trim())
  if (names.some((n) => !n)) return { kind: 'missingId' }
  if (new Set(names).size !== names.length) return { kind: 'duplicateId' }
  for (const r of rows) for (const f of PRICE_FIELDS) if (!Number.isFinite(toNumber(r[f])) || toNumber(r[f]) < 0) return { kind: 'invalidPrice', model: r.model, field: f }
  return null
}

interface PriceTableProps {
  readonly prices: PriceTableType
  onSave(prices: PriceTableType): Promise<boolean>
}

/** Editierbare Preistabelle (USD pro Mio. Token). */
export function PriceTable({ prices, onSave }: PriceTableProps): React.JSX.Element {
  const p = useT().settings.prices
  const [rows, setRows] = useState<PriceRow[]>(() => toRows(prices))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<PriceProblem | null>(null)

  useEffect(() => {
    if (!dirty) setRows(toRows(prices))
  }, [prices, dirty])

  const edit = (key: number, field: keyof Omit<PriceRow, 'key'>, value: string): void => {
    setRows((list) => list.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
    setDirty(true)
  }

  const save = async (): Promise<void> => {
    const found = validate(rows)
    setProblem(found)
    if (found) return
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
              <th className="px-2 pb-2 font-[520]">{p.modelIdPrefix}</th>
              {PRICE_FIELDS.map((f) => (
                <th key={f} className="w-[7.5rem] px-2 pb-2 text-right font-[520] whitespace-nowrap">
                  {p.fields[f]}
                </th>
              ))}
              <th className="w-9 pb-2" aria-label={p.actions} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="border-t border-line px-1 py-1">
                  <input aria-label={p.modelId} value={r.model} onChange={(e) => edit(r.key, 'model', e.target.value)} spellCheck={false} className="field h-7 border-transparent bg-transparent font-mono text-xs hover:border-line focus:bg-canvas" />
                </td>
                {PRICE_FIELDS.map((f) => (
                  <td key={f} className="border-t border-line px-1 py-1">
                    <input
                      aria-label={p.fieldFor(p.fields[f], r.model || p.newModel)}
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
                    label={p.removeRow(r.model || p.row)}
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
      {problem ? (
        <p role="alert" className="mt-2 text-xs text-danger-ink">
          {problem.kind === 'missingId' ? p.errorMissingId : problem.kind === 'duplicateId' ? p.errorDuplicateId : p.errorInvalidPrice(problem.model, p.fields[problem.field])}
        </p>
      ) : null}
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
          {p.addRow}
        </Button>
        <div className="flex gap-2">
          {dirty ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDirty(false)
                setProblem(null)
                setRows(toRows(prices))
              }}
            >
              {currentT().settings.discard}
            </Button>
          ) : null}
          <Button size="sm" variant="primary" disabled={!dirty} loading={saving} onClick={() => void save()}>
            {p.save}
          </Button>
        </div>
      </div>
    </div>
  )
}
