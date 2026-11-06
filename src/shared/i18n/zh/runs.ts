import type { Messages } from '../messages'

export const runs: Messages['runs'] = {
  description: '因额度用尽而中断的运行',
  quotaFree: '额度可用',
  quotaFreeBody: (percent: string): string => `5 小时窗口已用 ${percent}。可以继续。`,
  quotaFull: '额度已满',
  quotaFullUntil: (time: string, countdown: string): string => `至 ${time}（${countdown}后）。在此之前继续会立即再次中断。`,
  quotaFullUnknown: '重置时间未知。',
  quotaUnknown: '额度未知',
  quotaLoading: '正在查询 …',
  quotaNoSource: '暂无最新来源，见左下角。',
  abortedAgo: (age: string): string => `${age}中断`,
  noPrompt: '未记录最后一次输入。',
  quoted: (text: string): string => `“${text}”`,
  resumedNote: '已在终端中继续 · Claude 再次回复后自动消失。',
  dismiss: '已处理',
  dismissTitle: '从列表中移除，不继续运行',
  resume: '继续',
  reopen: '重新打开',
  resumeTitle: (name: string): string => `在 ${name} 中执行 claude --resume`,
  resumeAll: '全部继续',
  resumeAllCount: (n: number): string => `全部继续（${n}）`,
  emptyTitle: '没有待处理项 – 所有运行均已完成',
  emptyBody: '如果 Claude 因额度用尽而中断，该运行会出现在这里。额度恢复后，点一下即可继续。',
  runCount: (n: number): string => `${n} 次运行`
}
