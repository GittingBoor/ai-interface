import type { Messages } from '../messages'

export const links: Messages['links'] = {
  fallbackTitle: 'Collegamento',
  edit: 'Modifica',
  openBrowser: 'Apri nel browser',
  back: 'Indietro',
  reload: 'Ricarica',
  loading: 'caricamento',
  unreachable: 'Pagina non raggiungibile',
  unreachableHint: (error: string): string => `${error}. Il servizio è attivo e la rete è raggiungibile (rete domestica o VPN)?`,
  errorCode: (code: number): string => `Errore ${code}`,
  notFoundTitle: 'Collegamento non trovato',
  notFoundBody: (settings: string, group: string): string => `È stato rimosso. I collegamenti si creano in ${settings} → ${group}.`,
  desktopOnlyTitle: 'Solo nell’app desktop',
  desktopOnlyBody: (openBrowser: string): string => `Le pagine incorporate esistono solo in Electron. In modalità browser usa “${openBrowser}”.`
}
