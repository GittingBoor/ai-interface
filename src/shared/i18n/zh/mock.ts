import type { Messages } from '../messages'

/** 浏览器模式（`npm run dev:web`）中模拟的应用消息。 */
export const mock: Messages['mock'] = {
  terminal: {
    connectedTo: (where: string): string => `已连接到 ${where}`,
    sessionResumed: '会话已恢复',
    sessionNew: '新会话',
    echoNote: '模拟终端：输入内容会原样返回，输入“exit”结束。'
  },
  favoriteExists: { message: '此文件夹已经是收藏。', hint: '请选择其他文件夹，或重命名现有收藏。' },
  reviewDone: '示例检查已完成。',
  browserNoInstall: '浏览器模式下不会安装任何内容。',
  dictationSample: '这是一段听写的示例文字。',
  pinHint: '请再次输入 PIN（模拟：1234）。',
  assistant: {
    createProject: '我将在 `D:\\GitHub\\Projects` 下创建项目 **Beat Lab**：包含 CLAUDE.md、计划、README 和 .gitignore 的文件夹，然后执行 `git init`。',
    preview: '文件夹：D:\\GitHub\\Projects\\Beat Lab\n文件：\n- CLAUDE.md\n- docs\\PLAN.md\n- README.md\n- .gitignore\n之后：git init -b main',
    done: '已完成。要我也在应用中添加这个项目吗？',
    declined: '好的，我不会创建任何内容。我应该怎么调整？',
    quota: '你的 5 小时额度为 **32%**，每周额度为 **84%**。'
  }
}
