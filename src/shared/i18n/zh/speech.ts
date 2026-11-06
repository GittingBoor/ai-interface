import type { Messages } from '../messages'

export const speech: Messages['speech'] = {
  title: '语音输入',
  unsupportedDescription: '仅在 Windows 上自动设置。请在此使用 Win+H 或 /voice。',
  description: 'whisper.cpp 在显卡（Vulkan）上本地运行，数据不会离开你的电脑。',
  remove: '移除',
  load: '下载',
  removeAria: (model: string): string => `移除模型 ${model}`,
  loadAria: (model: string): string => `下载模型 ${model}`,
  microphone: '麦克风',
  windowsDefault: 'Windows 默认',
  microphoneUnnamed: '麦克风（首次录音后显示名称）',
  hotkeyLabel: (keys: string): string => `快捷键 ${keys}`,
  hotkeyDescription: '无需鼠标即可开始和停止听写。默认关闭。',
  mic: {
    stop: (shortcut: string): string => `结束录音${shortcut} · Esc 放弃`,
    transcribing: '正在识别 …',
    dictate: (shortcut: string): string => `听写${shortcut}`,
    chooseModel: '选择语音模型',
    modelMenu: '语音模型',
    notLoaded: (mb: number): string => `未下载 · ${mb} MB`
  },
  setup: {
    title: '设置语音输入',
    modelPrefix: '模型',
    downloadInfo: (mb: number): string => `下载约 ${mb} MB，之后完全离线运行。`,
    downloadInfoWithEngine: (mb: number): string => `下载约 ${mb} MB（含支持 Vulkan 的 whisper.cpp），之后完全离线运行。`,
    progressAria: '下载进度',
    progressValue: (percent: number, received: number, total: number): string => `${percent}%，${received} / ${total} MB`,
    progressText: (percent: number, received: number, total: number): string => `${percent}% · ${received} / ${total} MB`,
    later: '稍后',
    download: '下载'
  },
  nothingRecognized: '未识别到内容',
  targetClosed: '终端已关闭，文字已丢弃',
  processingFailed: '无法处理录音',
  recorder: {
    startFailed: '无法开始录音',
    micHint: 'Windows：请检查“设置 > 隐私和安全性 > 麦克风”。',
    denied: '麦克风访问被拒绝',
    notFound: '未找到麦克风',
    notFoundHint: (micHint: string): string => `请在“操作说明”标签页中选择其他麦克风。${micHint}`,
    openFailed: '无法打开麦克风'
  }
}
