import type { Messages } from '../messages'

export const links: Messages['links'] = {
  fallbackTitle: 'ショートカット',
  edit: '編集',
  openBrowser: 'ブラウザーで開く',
  back: '戻る',
  reload: '再読み込み',
  loading: '読み込み中',
  unreachable: 'ページにアクセスできません',
  unreachableHint: (error: string): string => `${error}。サービスは動作していますか？ ネットワーク（ホームネットワークまたは VPN）に接続できていますか？`,
  errorCode: (code: number): string => `エラー ${code}`,
  notFoundTitle: 'ショートカットが見つかりません',
  notFoundBody: (settings: string, group: string): string => `削除されました。ショートカットは ${settings} → ${group} で作成できます。`,
  desktopOnlyTitle: 'デスクトップアプリ限定',
  desktopOnlyBody: (openBrowser: string): string => `埋め込みページは Electron でのみ利用できます。ブラウザーモードでは「${openBrowser}」を使ってください。`
}
