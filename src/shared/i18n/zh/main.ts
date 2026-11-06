import type { Messages } from '../messages'

export const main: Messages['main'] = {
  defaults: { protocolDir: '日志', categories: { coding: '编程', work: '工作', learning: '学习' } },
  speechHotkeyKeys: ['Ctrl', 'Shift', '空格'],
  thisPc: '这台电脑',
  deviceFallback: '设备',
  untitled: '无标题',
  quotaReached: '已达到额度上限',
  orchestratorTitle: '编排器',
  taskReviewTitle: '任务检查',
  dialogs: { startScripts: '启动脚本', allFiles: '所有文件' },
  imageTitles: {
    fromUser: (date) => `来自你 · ${date}`,
    aiImage: (date) => `AI 图片 · ${date}`,
    screenshot: (name, date) => `截图 · ${name} · ${date}`
  },
  prerequisites: {
    claudeMissing: '没有 Claude Code，就没有终端、用量统计和助手。',
    loginLabel: '已登录 Claude',
    loginViaKey: (variable) => `API 密钥（${variable}）`,
    loginHint: '运行一次 claude 并在浏览器中登录（Pro、Max、Team 或 API 账户）。',
    gitBashMissing: '没有 Git Bash，终端中就没有桌面通知和状态（工作中、已完成、提问）。'
  },
  speechModels: {
    'small-q5_1': { label: '快速', description: '体积小、速度快，对专业术语容易听错。' },
    'large-v3-turbo-q5_0': { label: '标准', description: '识别效果好，在 GPU 上不到一秒。' },
    'large-v3-q5_0': { label: '精确', description: '识别效果最佳，但明显更慢。' }
  }
}
