import { LOCALES, LOCALE_NAMES, resolveLocale, type LanguageSetting } from '@shared/i18n/locales'
import type { Settings } from '@shared/types'
import { Field } from '@renderer/components/Controls'
import { useT } from '@renderer/i18n/useT'
import { useSettings } from '@renderer/stores/settingsStore'

const SYSTEM_OPTION: LanguageSetting = 'system'

function isLanguageSetting(value: string): value is LanguageSetting {
  return value === SYSTEM_OPTION || (LOCALES as readonly string[]).includes(value)
}

/** Auswahl der Anzeigesprache; wird sofort gespeichert. */
export function LanguageSection({ settings }: { readonly settings: Settings }): React.JSX.Element {
  const t = useT()
  const update = useSettings((s) => s.update)
  const onChange = (value: string): void => {
    if (isLanguageSetting(value)) void update({ language: value })
  }
  return (
    <Field label={t.settings.languageLabel}>
      {(id) => (
        <select id={id} value={settings.language} onChange={(e) => onChange(e.target.value)} className="field text-[0.8125rem]">
          <option value={SYSTEM_OPTION}>{t.common.languageSystem(LOCALE_NAMES[resolveLocale(navigator.language)])}</option>
          {LOCALES.map((code) => (
            <option key={code} value={code}>
              {LOCALE_NAMES[code]}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}
