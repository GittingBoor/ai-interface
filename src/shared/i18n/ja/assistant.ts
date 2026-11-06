import type { Messages } from '../messages'

export const assistant: Messages['assistant'] = {
  title: 'アシスタント',
  plan: 'Opus 5.5 · サブスクリプション',
  newChat: '新しいチャット',
  resizeAria: 'アシスタントの幅',
  resizeTitle: 'ドラッグして幅を変更',
  heading: '今日は何をしますか？',
  intro: 'アシスタントはプロジェクト、TODO、利用枠を把握しています。何かを作成したり書き込んだりする前に、必ず確認します。',
  suggestions: ['新しいプロジェクトを作成', '利用枠の残りは？', '今、各デバイスで何が動いていますか？'],
  composer: {
    aria: 'アシスタントへのメッセージ',
    placeholder: 'アシスタントへのメッセージ',
    running: '返信中 …',
    stop: '返信を停止',
    send: '送信（Enter）',
    hint: 'Enter で送信 · Shift+Enter で改行 · マイクで音声入力'
  },
  typing: 'アシスタントが返信中 …',
  confirm: { waiting: '確認待ち', preview: 'プレビュー', run: '実行', deny: '拒否', allowed: '許可済み', denied: '拒否済み' },
  toolLabels: {
    list_projects: 'プロジェクトを読み込み中',
    list_categories: 'プロジェクトの種類を読み込み中',
    list_project_folders: 'プロジェクトフォルダーを読み込み中',
    usage_summary: '使用量を集計中',
    quota: '利用枠を確認中',
    list_todos: 'TODO を読み込み中',
    devices_status: 'デバイスを照会中',
    list_skills: 'スキルを読み込み中',
    app_settings: '設定を読み込み中',
    create_project_folder: 'プロジェクトフォルダーを作成中',
    write_obsidian_note: 'Obsidian ノートを書き込み中',
    add_project: 'プロジェクトを追加中',
    create_category: '種類を作成中',
    add_todo: 'TODO を追加中'
  },
  previews: {
    folder: (dir: string): string => `フォルダ: ${dir}`,
    files: 'ファイル:',
    gitInit: 'その後: git init -b main',
    note: (path: string): string => `ノート: ${path}`,
    project: (name: string, host: string, path: string, category: string, color: string, icon: string): string =>
      `プロジェクト「${name}」(${host}) → ${path}
種類: ${category || 'なし'} · 色 ${color}${icon ? ` · アイコン ${icon}` : ''}`,
    category: (name: string, color: string, icon: string): string => `新しい種類「${name}」· 色 ${color}${icon ? ` · アイコン ${icon}` : ''}`,
    todo: (section: string, text: string): string => `「${section}」の TODO: ${text}`
  },
  confirmTitles: {
    create_project_folder: 'プロジェクトフォルダーを作成',
    write_obsidian_note: 'Obsidian ノートを書き込む',
    add_project: 'プロジェクトを追加',
    create_category: '種類を作成',
    add_todo: 'TODO を追加'
  }
}
