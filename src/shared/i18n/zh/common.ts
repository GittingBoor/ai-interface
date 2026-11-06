import type { Messages } from '../messages'

export const common: Messages['common'] = {
  save: '保存',
  cancel: '取消',
  delete: '删除',
  close: '关闭',
  retry: '重试',
  loading: '加载中…',
  languageSystem: (name: string): string => `跟随系统（${name}）`
}
