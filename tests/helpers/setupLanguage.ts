import { setMainLanguage } from '../../src/main/i18n'
import { setActiveLanguage } from '../../src/renderer/src/i18n/activeLocale'

/** Alle Tests laufen standardmäßig auf Deutsch; Sprachtests setzen die Sprache selbst. */
setMainLanguage('de')
setActiveLanguage('de')
