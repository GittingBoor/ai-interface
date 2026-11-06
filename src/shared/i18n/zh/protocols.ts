import type { Messages } from '../messages'

export const protocols: Messages['protocols'] = {
  description: '来自 Obsidian 库的 Markdown 日志',
  reload: '重新加载',
  subtitleNone: '库中各项目的日志文件夹，只读',
  subtitleCount: (n: number): string => `库中 ${n} 个项目的日志文件夹，只读`,
  navLabel: '日志',
  searchLabel: '搜索日志',
  searchPlaceholder: '日期或标题',
  noMatches: '没有匹配项。',
  noFolders: '未找到日志文件夹。这里显示 Obsidian 库中项目内名为“Protokoll”的文件夹。',
  modified: (date: string): string => `修改于 ${date}`,
  emptyTitle: '未选择日志',
  emptyBody: '日志以 Markdown 形式存放在库中，这里只能阅读。请在 Obsidian 中编辑。'
}
