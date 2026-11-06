import type { Locale } from './locales'
import { de } from './de'
import { en } from './en'
import { zh } from './zh'
import { ja } from './ja'
import { it } from './it'
import { es } from './es'
import { fr } from './fr'

export type Messages = typeof de

export const MESSAGES: Readonly<Record<Locale, Messages>> = { de, en, zh, ja, it, es, fr }

export function messagesFor(locale: Locale): Messages {
  return MESSAGES[locale]
}
