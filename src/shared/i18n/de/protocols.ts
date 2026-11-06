export const protocols = {
  description: 'Markdown-Protokolle aus deinem Obsidian-Vault',
  reload: 'Neu laden',
  subtitleNone: 'Protokollordner der Projekte im Vault, nur lesen',
  subtitleCount: (n: number): string => `Protokollordner aus ${n} ${n === 1 ? 'Projekt' : 'Projekten'} im Vault, nur lesen`,
  navLabel: 'Protokolle',
  searchLabel: 'Protokolle durchsuchen',
  searchPlaceholder: 'Datum oder Titel',
  noMatches: 'Keine Treffer.',
  noFolders: 'Keine Protokollordner gefunden. Angezeigt werden Ordner namens „Protokoll“ in Projekten, die im Obsidian-Vault liegen.',
  modified: (date: string): string => `geändert ${date}`,
  emptyTitle: 'Kein Protokoll ausgewählt',
  emptyBody: 'Protokolle liegen als Markdown im Vault und werden hier nur gelesen. Bearbeitet werden sie in Obsidian.'
}
