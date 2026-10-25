import { ErrorState, SkeletonRows } from '@renderer/components/States'
import { useMiniPc } from '@renderer/stores/miniPcStore'
import { OllamaHost } from '@renderer/views/models/ModelsView'

/** Ollama-Modelle auf dem Gerät, mit Markierung für geladene Modelle. */
export function OllamaList(): React.JSX.Element {
  const status = useMiniPc((s) => s.ollama)
  const error = useMiniPc((s) => s.ollamaError)
  const load = useMiniPc((s) => s.loadOllama)
  if (error && !status) return <ErrorState message={error} onRetry={() => void load()} />
  if (!status) return <SkeletonRows rows={2} />
  return <OllamaHost status={status} />
}
