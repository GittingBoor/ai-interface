import type { Messages } from '../messages'

export const assistant: Messages['assistant'] = {
  title: 'Assistant',
  plan: 'Opus 5.5 · Subscription',
  newChat: 'New chat',
  resizeAria: 'Assistant width',
  resizeTitle: 'Drag to change the width',
  heading: 'What’s up?',
  intro: 'The assistant knows your projects, TODOs and quota. It asks before it creates or writes anything.',
  suggestions: ['Create a new project', 'How is my quota?', 'What is running on my devices right now?'],
  composer: {
    aria: 'Message to the assistant',
    placeholder: 'Message to the assistant',
    running: 'Replying …',
    stop: 'Stop reply',
    send: 'Send (Enter)',
    hint: 'Enter sends · Shift+Enter new line · Microphone dictates'
  },
  typing: 'The assistant is replying …',
  confirm: { waiting: 'Waiting for you', preview: 'Preview', run: 'Run', deny: 'Decline', allowed: 'Approved', denied: 'Declined' },
  toolLabels: {
    list_projects: 'Reading projects',
    list_categories: 'Reading project types',
    list_project_folders: 'Reading project folders',
    usage_summary: 'Analyzing usage',
    quota: 'Checking quota',
    list_todos: 'Reading TODOs',
    devices_status: 'Querying devices',
    list_skills: 'Reading skills',
    app_settings: 'Reading settings',
    create_project_folder: 'Creating project folder',
    write_obsidian_note: 'Writing Obsidian note',
    add_project: 'Adding project',
    create_category: 'Creating type',
    add_todo: 'Adding TODO'
  },
  previews: {
    folder: (dir: string): string => `Folder: ${dir}`,
    files: 'Files:',
    gitInit: 'Then: git init -b main',
    note: (path: string): string => `Note: ${path}`,
    project: (name: string, host: string, path: string, category: string, color: string, icon: string): string =>
      `Project “${name}” (${host}) → ${path}
Type: ${category || 'none'} · Color ${color}${icon ? ` · Icon ${icon}` : ''}`,
    category: (name: string, color: string, icon: string): string => `New type “${name}” · Color ${color}${icon ? ` · Icon ${icon}` : ''}`,
    todo: (section: string, text: string): string => `TODO in “${section}”: ${text}`
  },
  confirmTitles: {
    create_project_folder: 'Create project folder',
    write_obsidian_note: 'Write Obsidian note',
    add_project: 'Add project',
    create_category: 'Create type',
    add_todo: 'Add TODO'
  }
}
