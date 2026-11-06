export const links = {
  fallbackTitle: 'Verknüpfung',
  edit: 'Bearbeiten',
  openBrowser: 'Im Browser öffnen',
  back: 'Zurück',
  reload: 'Neu laden',
  loading: 'lädt',
  unreachable: 'Seite nicht erreichbar',
  unreachableHint: (error: string): string => `${error}. Läuft der Dienst, und ist das Netz erreichbar (Heimnetz oder VPN)?`,
  errorCode: (code: number): string => `Fehler ${code}`,
  notFoundTitle: 'Verknüpfung nicht gefunden',
  notFoundBody: (settings: string, group: string): string => `Sie wurde entfernt. Unter ${settings} → ${group} legst du Verknüpfungen an.`,
  desktopOnlyTitle: 'Nur in der Desktop-App',
  desktopOnlyBody: (openBrowser: string): string => `Eingebettete Seiten gibt es nur in Electron. Im Browser-Modus über „${openBrowser}“.`
}
