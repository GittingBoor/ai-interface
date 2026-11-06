import type { Locale } from '@shared/i18n/locales'
import { messagesFor, type Messages } from '@shared/i18n/messages'
import { useSettings } from '@renderer/stores/settingsStore'
import { activeLocale, localeOf } from './activeLocale'

export function useLocale(): Locale {
  return useSettings((s) => localeOf(s.settings?.language))
}

export function useT(): Messages {
  return messagesFor(useLocale())
}

/** Außerhalb von Komponenten (Stores, Handler). */
export function currentLocale(): Locale {
  return activeLocale()
}

export function currentT(): Messages {
  return messagesFor(currentLocale())
}
