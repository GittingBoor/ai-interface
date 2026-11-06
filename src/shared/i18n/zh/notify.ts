import type { Messages } from '../messages'

export const notify: Messages['notify'] = {
  titles: { permission: '需要授权', question: 'Claude 的提问', done: 'Claude 已完成' },
  defaultMessages: { permission: 'Claude 需要你的授权。', question: 'Claude 有一个问题。', done: 'Claude 已完成。' },
  quotaFreeTitle: '额度已恢复',
  quotaFreeBody: (open) => `${open} 个运行正在等待继续。`,
  updatingTitle: 'AI Interface 正在更新',
  updatingBody: '新版本已准备就绪，应用即将重启。',
  updateFailedTitle: '更新失败',
  updateFailedBody: '应用将继续使用旧版本运行；详情见设置。',
  updateAvailableTitle: '有可用更新',
  updateAvailableBody: 'GitHub 上有新版本。请点击侧边栏中的“更新”。'
}
