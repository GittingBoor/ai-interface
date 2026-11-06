import type { Messages } from '../messages'

export const protocols: Messages['protocols'] = {
  description: 'Registros en Markdown de tu vault de Obsidian',
  reload: 'Recargar',
  subtitleNone: 'Carpetas de registros de los proyectos en el vault, solo lectura',
  subtitleCount: (n: number): string => `Carpetas de registros de ${n} ${n === 1 ? 'proyecto' : 'proyectos'} en el vault, solo lectura`,
  navLabel: 'Registros',
  searchLabel: 'Buscar en los registros',
  searchPlaceholder: 'Fecha o título',
  noMatches: 'Sin resultados.',
  noFolders: 'No se encontraron carpetas de registros. Se muestran las carpetas llamadas «Protokoll» dentro de proyectos que están en el vault de Obsidian.',
  modified: (date: string): string => `modificado ${date}`,
  emptyTitle: 'Ningún registro seleccionado',
  emptyBody: 'Los registros son archivos Markdown del vault y aquí solo se leen. Se editan en Obsidian.'
}
