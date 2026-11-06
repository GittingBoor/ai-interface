import type { Messages } from '../messages'

export const howto: Messages['howto'] = {
  searchLabel: 'ショートカットを検索',
  searchPlaceholder: 'ショートカットを検索 …',
  sectionAria: 'ショートカットとコツ',
  clearSearch: '検索をクリア',
  nothingFound: (query: string): string => `「${query}」に該当するものは見つかりません。`,
  groups: { speech: '音声入力', app: 'AI Interface', windows: 'Windows', claude: 'Claude Code' },
  keys: { mic: 'マイク', arrow: '矢印', star: 'スター' },
  entries: {
    dictate: { title: '音声入力', description: 'クリックで録音を開始し、もう一度クリックすると認識してテキストを挿入します。自動で送信されることはありません。' },
    discard: { title: '録音を破棄', description: '実行中の音声入力を、何も挿入せずに中止します。' },
    dictateKeys: { title: 'キーボードで音声入力', description: 'アシスタント（フォーカス時）またはアクティブなターミナルの音声入力を開始/停止します。上で有効にしてください。' },
    switchModel: { title: 'モデルを切り替え', description: 'マイクの横の矢印：高速、標準、高精度。' },
    windowsDictation: { title: 'Windows 音声入力', description: '設定不要で、あらゆるテキスト欄に使えるシステム全体の音声入力です。認識精度は Whisper より劣ります。' },
    voiceMode: { title: 'Claude Code 音声モード', description: 'お使いの Claude Code のバージョンが対応している場合：Anthropic のサービスでターミナルに直接音声入力できます。' },
    palette: { title: '検索 / コマンドパレット', description: 'エリア、プロジェクト、操作を探します。' },
    assistant: { title: 'アシスタント', description: 'AI アシスタントの表示/非表示を切り替えます。ターミナルからも使えます。' },
    areas: { title: 'エリア', description: (a: string, b: string, c: string): string => `${a}、${b}、${c} などへ直接移動します（番号はサイドバーを参照）。` },
    newTerminal: { title: '新しいターミナル', description: 'ターミナルエリアで開始ダイアログを開きます。' },
    newLine: { title: 'ターミナルで改行', description: (ctrlEnter: string): string => `Claude Code で送信せずに改行します（${ctrlEnter} でも可）。` },
    pasteImage: { title: 'ターミナルに画像を貼り付け', description: 'クリップボードの画像を保存し、パスとして挿入します。' },
    starSource: {
      title: 'ソースをサイドバーに表示',
      description: (sources: string, websites: string, ai: string): string =>
        `「${sources}」でウェブページにスターを付けると、「${websites}」に表示されます。Claude が読んだページはアプリが「${ai}」に保存します。`
    },
    clipboardHistory: { title: 'クリップボードの履歴', description: '以前にコピーしたテキストや画像を選べます。' },
    screenshot: { title: '画面の切り取り', description: (paste: string): string => `切り取りをクリップボードに保存し、${paste} でターミナルに貼り付けます。` },
    emoji: { title: '絵文字と特殊文字', description: 'あらゆるテキスト欄で絵文字パネルを開きます。' },
    switchMode: { title: 'モードを切り替え', description: '通常、自動承認、プランモードを切り替えます。' },
    rewind: { title: '巻き戻し', description: '以前のメッセージに戻り、そこからやり直します。' },
    commands: { title: 'コマンド', description: 'スラッシュコマンドとスキル（例：/help、/clear、/compact）。' },
    mention: { title: 'ファイルを指定', description: 'オートコンプリートでファイルパスをメッセージに挿入します。' },
    interrupt: { title: '返信を中断', description: '実行中の返信を停止します。履歴は残ります。' }
  }
}
