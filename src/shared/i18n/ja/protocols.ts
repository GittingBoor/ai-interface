import type { Messages } from '../messages'

export const protocols: Messages['protocols'] = {
  description: 'Obsidian Vault の Markdown ログ',
  reload: '再読み込み',
  subtitleNone: 'Vault 内のプロジェクトのログフォルダー（読み取り専用）',
  subtitleCount: (n: number): string => `Vault 内の ${n} 件のプロジェクトのログフォルダー（読み取り専用）`,
  navLabel: 'ログ',
  searchLabel: 'ログを検索',
  searchPlaceholder: '日付またはタイトル',
  noMatches: '該当なし。',
  noFolders: 'ログフォルダーが見つかりません。Obsidian Vault 内のプロジェクトにある「Protokoll」という名前のフォルダーが表示されます。',
  modified: (date: string): string => `更新 ${date}`,
  emptyTitle: 'ログが選択されていません',
  emptyBody: 'ログは Vault 内の Markdown ファイルで、ここでは読み取りのみです。編集は Obsidian で行います。'
}
