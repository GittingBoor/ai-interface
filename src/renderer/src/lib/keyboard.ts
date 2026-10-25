/** Minimale Form eines DOM-Elements, damit die Prüfung ohne DOM testbar bleibt. */
interface ClosestCapable {
  closest(selector: string): unknown
}

/** true, wenn der Fokus im Terminal liegt; dort gehören Tastenkürzel wie Strg+K der Shell bzw. Claude. */
export const isTerminalTarget = (target: ClosestCapable | null): boolean => Boolean(target?.closest('.xterm'))
