import type { Messages } from '../messages'

export const main: Messages['main'] = {
  defaults: { protocolDir: 'ログ', categories: { coding: 'プログラミング', work: '仕事', learning: '学習' } },
  speechHotkeyKeys: ['Ctrl', 'Shift', 'スペース'],
  thisPc: 'この PC',
  deviceFallback: 'デバイス',
  untitled: '無題',
  quotaReached: '使用枠に達しました',
  orchestratorTitle: 'オーケストレーター',
  taskReviewTitle: 'タスク確認',
  dialogs: { startScripts: '起動スクリプト', allFiles: 'すべてのファイル' },
  imageTitles: {
    fromUser: (date) => `あなたから · ${date}`,
    aiImage: (date) => `AI 画像 · ${date}`,
    screenshot: (name, date) => `スクリーンショット · ${name} · ${date}`
  },
  prerequisites: {
    claudeMissing: 'Claude Code がないと、ターミナル、使用量、アシスタントは動きません。',
    loginLabel: 'Claude にログイン済み',
    loginViaKey: (variable) => `API キー（${variable}）`,
    loginHint: 'claude を一度起動し、ブラウザーでログインしてください（Pro、Max、Team、API アカウント）。',
    gitBashMissing: 'Git Bash がないと、ターミナルのデスクトップ通知とステータス（作業中、完了、質問）が使えません。'
  },
  speechModels: {
    'small-q5_1': { label: '高速', description: '小さくて速いものの、専門用語は聞き間違えやすいです。' },
    'large-v3-turbo-q5_0': { label: '標準', description: '精度が高く、GPU なら 1 秒未満です。' },
    'large-v3-q5_0': { label: '高精度', description: '最も精度が高い代わりに、かなり遅くなります。' }
  }
}
