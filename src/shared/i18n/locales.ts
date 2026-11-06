export const LOCALES = ['de', 'en', 'zh', 'ja', 'it', 'es', 'fr'] as const

export type Locale = (typeof LOCALES)[number]
export type LanguageSetting = 'system' | Locale

export const FALLBACK_LOCALE: Locale = 'en'

export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  de: 'Deutsch',
  en: 'English',
  zh: '中文',
  ja: '日本語',
  it: 'Italiano',
  es: 'Español',
  fr: 'Français'
}

const INTL_TAGS: Readonly<Partial<Record<Locale, string>>> = { zh: 'zh-CN' }

function isLocale(code: string): code is Locale {
  return (LOCALES as readonly string[]).includes(code)
}

/** Ordnet ein Sprach-Tag (z. B. `de-DE`) einer unterstützten Sprache zu, sonst Englisch. */
export function resolveLocale(tag: string | null | undefined): Locale {
  const code = (tag ?? '').trim().toLowerCase().split(/[-_]/)[0] ?? ''
  return isLocale(code) ? code : FALLBACK_LOCALE
}

export function effectiveLocale(setting: LanguageSetting, systemTag: string): Locale {
  return setting === 'system' ? resolveLocale(systemTag) : setting
}

export function intlTag(locale: Locale): string {
  return INTL_TAGS[locale] ?? locale
}
