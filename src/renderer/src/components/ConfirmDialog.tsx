import { useConfirm } from '@renderer/stores/confirmStore'
import { Button } from './Button'
import { Modal } from './Modal'

export function ConfirmDialog(): React.JSX.Element {
  const request = useConfirm((s) => s.request)
  const answer = useConfirm((s) => s.answer)
  return (
    <Modal
      open={request !== null}
      label={request?.title ?? 'Bestätigen'}
      onClose={() => answer(false)}
      className="w-full max-w-sm rounded-xl border border-line-strong/70 bg-raised p-5 shadow-[0_24px_60px_-12px_oklch(0_0_0/0.7)]"
    >
      {request ? (
        <>
          <h2 className="text-[0.9375rem] font-[640] text-ink">{request.title}</h2>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-2">{request.message}</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => answer(false)} data-autofocus>
              Abbrechen
            </Button>
            <Button variant={request.danger ? 'danger' : 'primary'} onClick={() => answer(true)}>
              {request.confirmLabel}
            </Button>
          </div>
        </>
      ) : null}
    </Modal>
  )
}
