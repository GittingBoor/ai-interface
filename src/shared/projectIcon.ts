/** Symbol eines Projekts oder einer Art: Emoji oder Name eines Lucide-Icons (kebab-case). */
export type ProjectIcon = { readonly kind: 'emoji'; readonly value: string } | { readonly kind: 'lucide'; readonly name: string }

const EMOJI_PREFIX = 'emoji:'
const LUCIDE_PREFIX = 'lucide:'
/** Genug für zusammengesetzte Emoji (Familie, Hautfarbe), zu wenig für Text. */
const MAX_EMOJI_CODE_UNITS = 16
const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const LUCIDE_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/
const EMOJI_CHARS = /^[\p{Extended_Pictographic}\p{Emoji_Component}\p{Regional_Indicator}‍️]+$/u
const EMOJI_PICTURE = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u

export const isHexColor = (value: string): boolean => HEX_COLOR.test(value)

export function parseIcon(raw: string | null): ProjectIcon | null {
  if (raw?.startsWith(EMOJI_PREFIX)) return { kind: 'emoji', value: raw.slice(EMOJI_PREFIX.length) }
  if (raw?.startsWith(LUCIDE_PREFIX)) return { kind: 'lucide', name: raw.slice(LUCIDE_PREFIX.length) }
  return null
}

export const formatIcon = (icon: ProjectIcon): string => (icon.kind === 'emoji' ? `${EMOJI_PREFIX}${icon.value}` : `${LUCIDE_PREFIX}${icon.name}`)

export function isValidIcon(raw: string): boolean {
  const icon = parseIcon(raw)
  if (!icon) return false
  if (icon.kind === 'lucide') return LUCIDE_NAME.test(icon.name)
  return icon.value.length > 0 && icon.value.length <= MAX_EMOJI_CODE_UNITS && EMOJI_CHARS.test(icon.value) && EMOJI_PICTURE.test(icon.value)
}
