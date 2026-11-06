import { useEffect, useId, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { KnowledgePlan } from '@shared/knowledge'
import { useT } from '@renderer/i18n/useT'
import { useKnowledge } from '@renderer/stores/knowledgeStore'
import { Button } from './Button'
import { Modal } from './Modal'

const PERCENT_STEP = 0.5

/** Auf halbe Prozentpunkte gerundet: Die Schätzung ist ein Richtwert, mehr Genauigkeit wäre vorgetäuscht. */
const roundPercent = (value: number): number => Math.round(value / PERCENT_STEP) * PERCENT_STEP

function PlanBody({ plan, onCancel }: { readonly plan: KnowledgePlan; readonly onCancel: () => void }): React.JSX.Element {
  const t = useT()
  const k = t.knowledge
  const confirm = useKnowledge((s) => s.confirmPlan)
  const [selected, setSelected] = useState<ReadonlySet<number>>(() => new Set(plan.items.map((i) => i.favoriteId)))
  const listId = useId()
  const chosen = plan.items.filter((i) => selected.has(i.favoriteId))
  const sum = roundPercent(chosen.reduce((total, i) => total + i.estimate, 0))
  const now = plan.quotaPercent
  const overStop = now !== null && now + sum >= plan.stopPercent

  const toggle = (id: number): void =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <>
      <h2 className="text-[0.9375rem] font-[640] text-ink">{k.confirmTitle}</h2>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-2">{k.confirmText}</p>
      <ul id={listId} className="mt-4 max-h-72 divide-y divide-line overflow-y-auto rounded-lg border border-line">
        {plan.items.map((item) => (
          <li key={item.favoriteId}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-[0.8125rem] transition-colors duration-150 hover:bg-raised-2 has-[:focus-visible]:bg-raised-2">
              <input type="checkbox" checked={selected.has(item.favoriteId)} onChange={() => toggle(item.favoriteId)} className="size-4 shrink-0 accent-[var(--color-accent)]" />
              <span className="min-w-0 flex-1 truncate text-ink">{item.name}</span>
              <span className="shrink-0 text-xs text-ink-3">{item.status === 'missing' ? k.statusNew : k.statusChanged}</span>
              <span className="num w-16 shrink-0 text-right text-xs text-ink-2">{k.estimate(roundPercent(item.estimate))}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="num mt-3 text-xs text-ink-2" aria-live="polite">
        {now === null ? k.total(sum) : k.totalWithNow(sum, Math.round(now))}
      </p>
      <p className="mt-1 text-xs text-ink-3">{k.estimateNote}</p>
      {overStop ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-warn">
          <AlertTriangle aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
          {k.overStop(plan.stopPercent)}
        </p>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} data-autofocus>
          {t.common.cancel}
        </Button>
        <Button variant="primary" disabled={chosen.length === 0} onClick={() => void confirm(chosen.map((i) => i.favoriteId))}>
          {k.start(chosen.length)}
        </Button>
      </div>
    </>
  )
}

/** Fragt vor jedem Durchgang, welche Projekte aufbereitet werden, und zeigt den geschätzten Verbrauch. */
export function KnowledgeConfirmDialog(): React.JSX.Element {
  const t = useT().knowledge
  const plan = useKnowledge((s) => s.plan)
  const cancel = useKnowledge((s) => s.cancelPlan)
  // Neuer Plan → Auswahl neu aufbauen (Schlüssel wechselt mit jedem Öffnen).
  const [openedAt, setOpenedAt] = useState(0)
  useEffect(() => {
    if (plan) setOpenedAt(Date.now())
  }, [plan])
  return (
    <Modal
      open={plan !== null}
      label={t.confirmTitle}
      onClose={cancel}
      className="w-full max-w-md rounded-xl border border-line-strong/70 bg-raised p-5 shadow-[0_24px_60px_-12px_oklch(0_0_0/0.7)]"
    >
      {plan ? <PlanBody key={openedAt} plan={plan} onCancel={cancel} /> : null}
    </Modal>
  )
}
