import { mainT } from '../i18n'
import { isHexColor, isValidIcon } from '@shared/projectIcon'
import { ValidationError } from '../errors'

export function assertColor(color: string): void {
  if (!isHexColor(color)) throw new ValidationError(mainT().errors.favorites.colorInvalid(color))
}

export function assertIcon(icon: string | null): void {
  if (icon !== null && !isValidIcon(icon)) throw new ValidationError(mainT().errors.favorites.iconInvalid(icon))
}
