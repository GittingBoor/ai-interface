import type { Messages } from '../messages'

export const links: Messages['links'] = {
  fallbackTitle: 'Acceso',
  edit: 'Editar',
  openBrowser: 'Abrir en el navegador',
  back: 'Atrás',
  reload: 'Recargar',
  loading: 'cargando',
  unreachable: 'Página no accesible',
  unreachableHint: (error: string): string => `${error}. ¿Está activo el servicio y hay acceso a la red (red doméstica o VPN)?`,
  errorCode: (code: number): string => `Error ${code}`,
  notFoundTitle: 'Acceso no encontrado',
  notFoundBody: (settings: string, group: string): string => `Se eliminó. Los accesos se crean en ${settings} → ${group}.`,
  desktopOnlyTitle: 'Solo en la app de escritorio',
  desktopOnlyBody: (openBrowser: string): string => `Las páginas incrustadas solo existen en Electron. En el modo navegador, usa «${openBrowser}».`
}
