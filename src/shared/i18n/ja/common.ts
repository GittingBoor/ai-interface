import type { Messages } from '../messages'

export const common: Messages['common'] = {
  save: '保存',
  cancel: 'キャンセル',
  delete: '削除',
  close: '閉じる',
  retry: '再試行',
  loading: '読み込み中…',
  languageSystem: (name: string): string => `システム（${name}）`
}
