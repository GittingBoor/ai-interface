import { TITLE_BAR_HEIGHT } from '@shared/titleBar'
import { AppMark } from './AppMark'

/**
 * Eigene Titelleiste über die ganze Breite: zieht das Fenster, Doppelklick maximiert.
 * Die Fensterknöpfe zeichnet Windows rechts darüber (titleBarOverlay), im Browser fehlen sie.
 */
export function TitleBar(): React.JSX.Element {
  return (
    <header
      className="flex shrink-0 items-center gap-2.5 bg-canvas px-4 select-none [-webkit-app-region:drag]"
      style={{ height: TITLE_BAR_HEIGHT }}
    >
      <AppMark className="size-6" />
      <span className="text-[1.0625rem] font-[660] tracking-[-0.012em] text-ink [font-stretch:112%]">AI Interface</span>
    </header>
  )
}
