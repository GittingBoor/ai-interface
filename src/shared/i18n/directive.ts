import type { Locale } from './locales'

/** Englische Sprachnamen für Vorgaben an das Modell (nicht Teil des UI-Wörterbuchs). */
const LANGUAGE_NAMES: Readonly<Record<Locale, string>> = {
  de: 'German',
  en: 'English',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  it: 'Italian',
  es: 'Spanish',
  fr: 'French'
}

/** Sprachvorgabe für Claude-Sitzungen: Antworten und selbst angelegte Dateien in der gewählten Sprache. */
export function languageDirective(locale: Locale): string {
  const name = LANGUAGE_NAMES[locale]
  return `Always respond in ${name}. Write every file you create or fill (CLAUDE.md, docs/PLAN.md, README.md, notes) in ${name}.`
}
