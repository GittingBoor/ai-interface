import { Download, Mic } from 'lucide-react'
import { speechModelInfo } from '@shared/speech'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import { useSpeech } from '@renderer/stores/speechStore'

/** whisper.cpp inkl. Vulkan-Backend, beide Zips zusammen. */
const BINARIES_MB = 44
const MB = 1_000_000

export function SpeechSetupDialog(): React.JSX.Element {
  const model = useSpeech((s) => s.setupModel)
  const status = useSpeech((s) => s.status)
  const progress = useSpeech((s) => s.progress)
  const { install, cancelInstall, closeSetup } = useSpeech.getState()
  const info = model ? speechModelInfo(model) : null
  const running = progress !== null
  const needBinaries = status ? !status.binariesInstalled : true
  const totalMb = info ? Math.round(info.bytes / MB) + (needBinaries ? BINARIES_MB : 0) : 0
  const percent = progress && progress.totalBytes > 0 ? Math.round((progress.receivedBytes / progress.totalBytes) * 100) : 0
  const receivedMb = Math.round((progress?.receivedBytes ?? 0) / MB)
  const progressMb = Math.round((progress?.totalBytes ?? 0) / MB)

  return (
    <Modal open={model !== null} label="Spracheingabe einrichten" onClose={() => (running ? undefined : closeSetup())} className="w-full max-w-[26rem] rounded-xl border border-line-strong/70 bg-raised p-5 shadow-[0_24px_60px_-12px_oklch(0_0_0/0.7)]">
      {info ? (
        <div>
          <div className="flex items-center gap-2.5">
            <Mic className="size-4 text-accent" aria-hidden />
            <h2 className="text-[0.9375rem] font-[640] text-ink">Spracheingabe einrichten</h2>
          </div>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-2">
            Modell <strong className="font-[600] text-ink">{info.label}</strong>: {info.description}
          </p>
          <p className="mt-1 text-xs text-ink-3">
            Download ca. {totalMb} MB{needBinaries ? ' (inkl. whisper.cpp mit Vulkan)' : ''}. Läuft danach komplett offline.
          </p>
          {running ? (
            <div className="mt-4" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${percent} %, ${receivedMb} von ${progressMb} MB`} aria-label="Download-Fortschritt">
              <div className="h-1.5 overflow-hidden rounded-full bg-raised-2">
                <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${percent}%` }} />
              </div>
              <p className="num mt-1.5 text-2xs text-ink-3">
                {percent} % · {receivedMb} / {progressMb} MB
              </p>
            </div>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            {running ? (
              <Button variant="ghost" autoFocus onClick={() => void cancelInstall()}>
                Abbrechen
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={closeSetup}>
                  Später
                </Button>
                <Button variant="primary" icon={Download} data-autofocus onClick={() => void install(info.id)}>
                  Herunterladen
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
