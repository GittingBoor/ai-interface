import type { Messages } from '../messages'

export const links: Messages['links'] = {
  fallbackTitle: 'Raccourci',
  edit: 'Modifier',
  openBrowser: 'Ouvrir dans le navigateur',
  back: 'Retour',
  reload: 'Recharger',
  loading: 'chargement',
  unreachable: 'Page inaccessible',
  unreachableHint: (error: string): string => `${error}. Le service fonctionne-t-il et le réseau est-il joignable (réseau domestique ou VPN) ?`,
  errorCode: (code: number): string => `Erreur ${code}`,
  notFoundTitle: 'Raccourci introuvable',
  notFoundBody: (settings: string, group: string): string => `Il a été supprimé. Les raccourcis se créent dans ${settings} → ${group}.`,
  desktopOnlyTitle: 'Uniquement dans l’app de bureau',
  desktopOnlyBody: (openBrowser: string): string => `Les pages intégrées n’existent que dans Electron. En mode navigateur, utilisez « ${openBrowser} ».`
}
