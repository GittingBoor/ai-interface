import type { Messages } from '../messages'

export const assistant: Messages['assistant'] = {
  title: '助手',
  plan: 'Opus 5.5 · 订阅',
  newChat: '新对话',
  resizeAria: '助手宽度',
  resizeTitle: '拖动以调整宽度',
  heading: '有什么要做的？',
  intro: '助手了解你的项目、待办和额度。在创建或写入任何内容之前，它都会先询问你。',
  suggestions: ['新建项目', '我的额度还剩多少？', '我的设备上现在在运行什么？'],
  composer: {
    aria: '发送给助手的消息',
    placeholder: '发送给助手的消息',
    running: '正在回复 …',
    stop: '停止回复',
    send: '发送（Enter）',
    hint: 'Enter 发送 · Shift+Enter 换行 · 麦克风用于听写'
  },
  typing: '助手正在回复 …',
  confirm: { waiting: '等待你确认', preview: '预览', run: '执行', deny: '拒绝', allowed: '已允许', denied: '已拒绝' },
  toolLabels: {
    list_projects: '读取项目',
    list_categories: '读取项目类型',
    list_project_folders: '读取项目文件夹',
    usage_summary: '分析用量',
    quota: '检查额度',
    list_todos: '读取待办',
    devices_status: '查询设备',
    list_skills: '读取技能',
    app_settings: '读取设置',
    create_project_folder: '创建项目文件夹',
    write_obsidian_note: '写入 Obsidian 笔记',
    add_project: '添加项目',
    create_category: '创建类型',
    add_todo: '添加待办'
  },
  previews: {
    folder: (dir: string): string => `文件夹：${dir}`,
    files: '文件：',
    gitInit: '然后：git init -b main',
    note: (path: string): string => `笔记：${path}`,
    project: (name: string, host: string, path: string, category: string, color: string, icon: string): string =>
      `项目“${name}”（${host}）→ ${path}
类型：${category || '无'} · 颜色 ${color}${icon ? ` · 图标 ${icon}` : ''}`,
    category: (name: string, color: string, icon: string): string => `新类型“${name}” · 颜色 ${color}${icon ? ` · 图标 ${icon}` : ''}`,
    todo: (section: string, text: string): string => `“${section}”中的待办：${text}`
  },
  confirmTitles: {
    create_project_folder: '创建项目文件夹',
    write_obsidian_note: '写入 Obsidian 笔记',
    add_project: '添加项目',
    create_category: '创建类型',
    add_todo: '添加待办'
  }
}
