import { effectiveLocale, intlTag, type LanguageSetting, type Locale } from '@shared/i18n/locales'

/** Vor dem Laden der Einstellungen gilt die Systemsprache. */
const DEFAULT_LANGUAGE: LanguageSetting = 'system'

let language: LanguageSetting = DEFAULT_LANGUAGE

function systemTag(): string {
  return (globalThis as { readonly navigator?: { readonly language?: string } }).navigator?.language ?? ''
}

/** Wird vom Einstellungs-Store nachgeführt; ohne DOM und Store nutzbar (Formate, Tests). */
export function setActiveLanguage(setting: LanguageSetting | undefined): void {
  language = setting ?? DEFAULT_LANGUAGE
}

export function localeOf(setting: LanguageSetting | undefined): Locale {
  return effectiveLocale(setting ?? DEFAULT_LANGUAGE, systemTag())
}

export function activeLocale(): Locale {
  return localeOf(language)
}

/** Intl-Tag der aktiven Sprache, z. B. für `toLocaleLowerCase` und `localeCompare`. */
export function activeTag(): string {
  return intlTag(activeLocale())
}

/** Legt ein Intl-Objekt je Sprache einmal an und liefert beim Aufruf das der aktiven Sprache. */
export function localized<T>(create: (tag: string) => T): () => T {
  const cache = new Map<string, T>()
  return () => {
    const tag = activeTag()
    const known = cache.get(tag)
    if (known !== undefined) return known
    const created = create(tag)
    cache.set(tag, created)
    return created
  }
}
