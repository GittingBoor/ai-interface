import type { Messages } from '../messages'

export const protocols: Messages['protocols'] = {
  description: 'Log Markdown dal tuo vault di Obsidian',
  reload: 'Ricarica',
  subtitleNone: 'Cartelle dei log dei progetti nel vault, sola lettura',
  subtitleCount: (n: number): string => `Cartelle dei log di ${n} ${n === 1 ? 'progetto' : 'progetti'} nel vault, sola lettura`,
  navLabel: 'Log',
  searchLabel: 'Cerca nei log',
  searchPlaceholder: 'Data o titolo',
  noMatches: 'Nessun risultato.',
  noFolders: 'Nessuna cartella di log trovata. Vengono mostrate le cartelle chiamate “Protokoll” nei progetti che si trovano nel vault di Obsidian.',
  modified: (date: string): string => `modificato ${date}`,
  emptyTitle: 'Nessun log selezionato',
  emptyBody: 'I log sono file Markdown nel vault e qui vengono solo letti. Si modificano in Obsidian.'
}
