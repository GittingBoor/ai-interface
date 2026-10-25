import { useTerminals } from '@renderer/stores/terminalStore'
import { terminalRegistry } from './terminalRegistry'
import type { SpeechTarget } from './speechText'

let assistantInserter: ((text: string) => void) | null = null

/** Der Composer meldet sich hier an, damit diktierter Text an seiner Cursorposition landet. */
export function registerAssistantInserter(insert: (text: string) => void): () => void {
  assistantInserter = insert
  return () => {
    if (assistantInserter === insert) assistantInserter = null
  }
}

export function deliverTranscript(target: SpeechTarget, text: string): boolean {
  if (target.kind === 'assistant') {
    if (!assistantInserter) return false
    assistantInserter(text)
    return true
  }
  const running = useTerminals.getState().terminals.some((t) => t.id === target.id && t.running)
  return running && terminalRegistry.paste(target.id, text)
}
