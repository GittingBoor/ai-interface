import { create } from 'zustand'
import type { FileKind } from '@renderer/lib/fileKind'

/** Eine ins Terminal gezogene Datei, wie die Vorschau sie zeigt. */
export interface TerminalAttachment {
  readonly key: string
  readonly name: string
  readonly path: string
  readonly size: number
  readonly kind: FileKind
  /** Object-URL für Bilder, sonst `null`; wird beim Leeren freigegeben. */
  readonly previewUrl: string | null
}

interface AttachmentState {
  readonly byTerminal: Readonly<Record<string, readonly TerminalAttachment[]>>
  add(terminalId: string, items: readonly TerminalAttachment[]): void
  /** Nach dem Absenden (Enter) oder Schließen: Vorschau weg, Object-URLs frei. */
  clear(terminalId: string): void
}

const EMPTY: readonly TerminalAttachment[] = []

function release(items: readonly TerminalAttachment[]): void {
  for (const item of items) if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
}

export const useAttachments = create<AttachmentState>((set, get) => ({
  byTerminal: {},
  add: (terminalId, items) => set((s) => ({ byTerminal: { ...s.byTerminal, [terminalId]: [...(s.byTerminal[terminalId] ?? EMPTY), ...items] } })),
  clear: (terminalId) => {
    const current = get().byTerminal[terminalId]
    if (!current) return
    release(current)
    set((s) => {
      const { [terminalId]: _removed, ...rest } = s.byTerminal
      return { byTerminal: rest }
    })
  }
}))

/** Stabile leere Liste, damit Selektoren ohne Anhänge nicht bei jedem Rendern neu auslösen. */
export function attachmentsOf(state: AttachmentState, terminalId: string): readonly TerminalAttachment[] {
  return state.byTerminal[terminalId] ?? EMPTY
}
