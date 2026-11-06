import type { Messages } from '../messages'

export const links: Messages['links'] = {
  fallbackTitle: 'Shortcut',
  edit: 'Edit',
  openBrowser: 'Open in browser',
  back: 'Back',
  reload: 'Reload',
  loading: 'loading',
  unreachable: 'Page unreachable',
  unreachableHint: (error: string): string => `${error}. Is the service running, and is the network reachable (home network or VPN)?`,
  errorCode: (code: number): string => `Error ${code}`,
  notFoundTitle: 'Shortcut not found',
  notFoundBody: (settings: string, group: string): string => `It was removed. You create shortcuts under ${settings} → ${group}.`,
  desktopOnlyTitle: 'Desktop app only',
  desktopOnlyBody: (openBrowser: string): string => `Embedded pages are only available in Electron. In browser mode, use “${openBrowser}”.`
}
