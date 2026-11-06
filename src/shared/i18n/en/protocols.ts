import type { Messages } from '../messages'

export const protocols: Messages['protocols'] = {
  description: 'Markdown logs from your Obsidian vault',
  reload: 'Reload',
  subtitleNone: 'Log folders of the projects in the vault, read-only',
  subtitleCount: (n: number): string => `Log folders from ${n} ${n === 1 ? 'project' : 'projects'} in the vault, read-only`,
  navLabel: 'Logs',
  searchLabel: 'Search logs',
  searchPlaceholder: 'Date or title',
  noMatches: 'No matches.',
  noFolders: 'No log folders found. Folders named “Protokoll” inside projects in the Obsidian vault are shown.',
  modified: (date: string): string => `modified ${date}`,
  emptyTitle: 'No log selected',
  emptyBody: 'Logs are Markdown files in the vault and are only read here. Edit them in Obsidian.'
}
