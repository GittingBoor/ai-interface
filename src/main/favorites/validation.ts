import { isHexColor, isValidIcon } from '@shared/projectIcon'
import { ValidationError } from '../errors'

export function assertColor(color: string): void {
  if (!isHexColor(color)) throw new ValidationError(`Farbe „${color}“ ist ungültig, erwartet wird #rrggbb oder #rgb (z. B. #e08a4f).`)
}

export function assertIcon(icon: string | null): void {
  if (icon !== null && !isValidIcon(icon)) throw new ValidationError(`Symbol „${icon}“ ist ungültig: ein Emoji oder ein Lucide-Icon-Name wählen.`)
}
