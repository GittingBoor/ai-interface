import type { Messages } from '../messages'

export const speech: Messages['speech'] = {
  title: '音声入力',
  unsupportedDescription: 'Windows でのみ自動的にセットアップされます。ここでは Win+H または /voice を使ってください。',
  description: 'whisper.cpp はグラフィックスカード（Vulkan）上でローカルに動作します。データは PC の外に出ません。',
  remove: '削除',
  load: 'ダウンロード',
  removeAria: (model: string): string => `モデル ${model} を削除`,
  loadAria: (model: string): string => `モデル ${model} をダウンロード`,
  microphone: 'マイク',
  windowsDefault: 'Windows の既定',
  microphoneUnnamed: 'マイク（最初の録音後に名前が表示されます）',
  hotkeyLabel: (keys: string): string => `ショートカット ${keys}`,
  hotkeyDescription: 'マウスなしで音声入力を開始・停止します。既定ではオフです。',
  mic: {
    stop: (shortcut: string): string => `録音を終了${shortcut} · Esc で破棄`,
    transcribing: '認識中 …',
    dictate: (shortcut: string): string => `音声入力${shortcut}`,
    chooseModel: '音声モデルを選択',
    modelMenu: '音声モデル',
    notLoaded: (mb: number): string => `未ダウンロード · ${mb} MB`
  },
  setup: {
    title: '音声入力のセットアップ',
    modelPrefix: 'モデル',
    downloadInfo: (mb: number): string => `ダウンロード約 ${mb} MB。その後は完全にオフラインで動作します。`,
    downloadInfoWithEngine: (mb: number): string => `ダウンロード約 ${mb} MB（Vulkan 対応の whisper.cpp を含む）。その後は完全にオフラインで動作します。`,
    progressAria: 'ダウンロードの進行状況',
    progressValue: (percent: number, received: number, total: number): string => `${percent}%、${received} / ${total} MB`,
    progressText: (percent: number, received: number, total: number): string => `${percent}% · ${received} / ${total} MB`,
    later: '後で',
    download: 'ダウンロード'
  },
  nothingRecognized: '認識できませんでした',
  targetClosed: 'ターミナルが閉じているため、テキストを破棄しました',
  processingFailed: '録音を処理できませんでした',
  recorder: {
    startFailed: '録音を開始できませんでした',
    micHint: 'Windows：「設定 > プライバシーとセキュリティ > マイク」を確認してください。',
    denied: 'マイクへのアクセスが拒否されました',
    notFound: 'マイクが見つかりません',
    notFoundHint: (micHint: string): string => `「操作ガイド」タブで別のマイクを選んでください。${micHint}`,
    openFailed: 'マイクを開けませんでした'
  }
}
