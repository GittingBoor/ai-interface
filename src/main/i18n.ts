import { effectiveLocale, type LanguageSetting, type Locale } from '@shared/i18n/locales'
import { messagesFor, type Messages } from '@shared/i18n/messages'

type SystemLocaleProvider = () => string

let systemLocaleProvider: SystemLocaleProvider = () => Intl.DateTimeFormat().resolvedOptions().locale
let language: LanguageSetting = 'system'

/** Ersetzt die Quelle der Systemsprache (in der App `app.getLocale()`, in Tests ein fester Wert). */
export function setSystemLocaleProvider(provider: SystemLocaleProvider): void {
  systemLocaleProvider = provider
}

export function setMainLanguage(setting: LanguageSetting): void {
  language = setting
}

export function mainLocale(): Locale {
  return effectiveLocale(language, systemLocaleProvider())
}

export function mainT(): Messages {
  return messagesFor(mainLocale())
}
