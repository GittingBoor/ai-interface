import type { Messages } from '../messages'

export const howto: Messages['howto'] = {
  searchLabel: '搜索快捷键',
  searchPlaceholder: '搜索快捷键 …',
  sectionAria: '快捷键与技巧',
  clearSearch: '清除搜索',
  nothingFound: (query: string): string => `未找到与“${query}”相关的内容。`,
  groups: { speech: '语音输入', app: 'AI Interface', windows: 'Windows', claude: 'Claude Code' },
  keys: { mic: '麦克风', arrow: '箭头', star: '星标' },
  entries: {
    dictate: { title: '听写', description: '点击开始录音，再次点击识别并插入文字。绝不会自动发送。' },
    discard: { title: '放弃录音', description: '中止正在进行的听写，不插入任何内容。' },
    dictateKeys: { title: '键盘听写', description: '为助手（获得焦点时）或当前终端开始/停止听写。需在上方开启。' },
    switchModel: { title: '切换模型', description: '麦克风旁的箭头：快速、标准或精确。' },
    windowsDictation: { title: 'Windows 听写', description: '系统级语音输入，可用于任意文本框，无需设置，识别效果不如 Whisper。' },
    voiceMode: { title: 'Claude Code 语音模式', description: '如果你的 Claude Code 版本支持：通过 Anthropic 的服务直接在终端中听写。' },
    palette: { title: '搜索 / 命令面板', description: '查找区域、项目和操作。' },
    assistant: { title: '助手', description: '显示或隐藏 AI 助手，在终端中也可使用。' },
    areas: { title: '区域', description: (a: string, b: string, c: string): string => `直接跳转到${a}、${b}、${c} …（数字见侧边栏）。` },
    newTerminal: { title: '新建终端', description: '在终端区域打开启动对话框。' },
    newLine: { title: '终端中换行', description: (ctrlEnter: string): string => `在 Claude Code 中换行而不是发送（${ctrlEnter} 同样可用）。` },
    pasteImage: { title: '将图片粘贴到终端', description: '剪贴板中的图片会被保存，并以路径的形式插入。' },
    starSource: {
      title: '将来源加入侧边栏',
      description: (sources: string, websites: string, ai: string): string =>
        `在“${sources}”中给网页加星标：它就会出现在“${websites}”下。Claude 读取过的页面，应用会归入“${ai}”。`
    },
    clipboardHistory: { title: '剪贴板历史', description: '选择之前复制的文字和图片。' },
    screenshot: { title: '屏幕截取', description: (paste: string): string => `将截图放入剪贴板，然后用 ${paste} 粘贴到终端。` },
    emoji: { title: '表情符号与特殊字符', description: '在任意文本框中打开表情符号选择器。' },
    switchMode: { title: '切换模式', description: '在普通、自动接受和计划模式之间切换。' },
    rewind: { title: '回退', description: '回到之前的某条消息，并从那里重新开始。' },
    commands: { title: '命令', description: '斜杠命令和技能，例如 /help、/clear、/compact。' },
    mention: { title: '提及文件', description: '通过自动补全将文件路径插入消息。' },
    interrupt: { title: '中断回复', description: '停止正在进行的回复，历史记录保留。' }
  }
}
