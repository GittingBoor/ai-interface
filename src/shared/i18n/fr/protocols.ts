import type { Messages } from '../messages'

export const protocols: Messages['protocols'] = {
  description: 'Journaux Markdown de votre coffre Obsidian',
  reload: 'Recharger',
  subtitleNone: 'Dossiers de journaux des projets dans le coffre, lecture seule',
  subtitleCount: (n: number): string => `Dossiers de journaux de ${n} ${n < 2 ? 'projet' : 'projets'} dans le coffre, lecture seule`,
  navLabel: 'Journaux',
  searchLabel: 'Rechercher dans les journaux',
  searchPlaceholder: 'Date ou titre',
  noMatches: 'Aucun résultat.',
  noFolders: 'Aucun dossier de journaux trouvé. Les dossiers nommés « Protokoll » dans les projets du coffre Obsidian sont affichés.',
  modified: (date: string): string => `modifié ${date}`,
  emptyTitle: 'Aucun journal sélectionné',
  emptyBody: 'Les journaux sont des fichiers Markdown du coffre et ne sont que lus ici. Ils se modifient dans Obsidian.'
}
