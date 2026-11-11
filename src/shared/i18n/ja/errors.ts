import type { Messages } from '../messages'

export const errors: Messages['errors'] = {
  hostUnreachable: { message: (host, cause) => `${host} に接続できません: ${cause}`, hint: 'ネットワークと SSH の設定を確認してください。' },
  notFound: (what) => `${what}が見つかりません。`,
  validationHint: '入力を修正して、もう一度お試しください。',
  quotaFormat: { message: (detail) => `使用枠の応答形式が不明です（${detail}）。`, hint: 'Claude Code を更新してください。それまでは誤った値ではなく、何も表示しません。' },
  summaryFailed: {
    message: (name, cause) => `「${name}」の要約に失敗しました: ${cause}`,
    hint: 'Claude Code（ログイン済み、使用枠に空き）を確認してからやり直してください。完了した要約は残ります。'
  },
  claudeCli: { message: (detail) => `Claude Code を実行できませんでした（${detail}）。`, hint: 'Claude Code がインストールされ、ログイン済みか確認してください（ターミナルで claude を実行）。' },
  gitFailed: { message: (action, cause) => `${action}に失敗しました: ${cause}`, hint: 'Git がインストールされ、フォルダーに書き込めるか確認してください。' },
  speechUnsupported: { message: '音声入力は Windows でのみ設定できます。', hint: 'Windows で使うか、Win+H または Claude Code の /voice を使ってください。' },
  whisperNotInstalled: { message: (model) => `音声認識「${model}」は設定されていません。`, hint: '「制御」タブでモデルをダウンロードしてください。' },
  whisperStart: { message: (detail) => `音声認識を起動できませんでした（${detail}）。`, hint: 'グラフィックドライバーを更新するか、「制御」で小さいモデルを選んでください。詳細はログにあります。' },
  transcription: { message: (detail) => `音声認識に失敗しました（${detail}）。`, hint: 'もう一度話してください。繰り返す場合はアプリを再起動してください。' },
  emptyTranscript: { message: '何も認識されませんでした。', hint: 'マイクに近づいて、少し大きな声で話してください。' },
  download: { message: (what, detail) => `${what}のダウンロードに失敗しました（${detail}）。`, hint: 'インターネット接続を確認して、もう一度お試しください。' },
  downloadChecksum: { message: (what) => `${what}のチェックサムが一致しないため、ファイルを削除しました。`, hint: 'もう一度ダウンロードしてください。繰り返す場合、配布元が変更されています。' },
  downloadCancelled: { message: 'ダウンロードをキャンセルしました。' },
  speechBusy: { message: (model) => `「${model}」はすでにダウンロード中です。`, hint: 'ダウンロードが終わるまで待つか、キャンセルしてください。' },
  privacyLocked: { message: 'プライベートモードが有効です。', hint: '設定で PIN を入力して解除してください。' },
  wrongPin: { message: 'PIN が違います。', tooMany: (waitSec) => `失敗が多すぎます。${waitSec} 秒お待ちください。`, hint: 'PIN をもう一度入力してください。' },
  invalidPin: { message: 'PIN は 4～12 桁の数字にしてください。', hint: '数字のみ使えます。' },
  pinRequired: { message: 'プライベートモードの PIN がまだ設定されていません。', hint: '新しい PIN を設定すると、プライベートモードが解除されます。' },
  updateFailed: { message: (step, detail) => `「${step}」でアップデートに失敗しました（${detail}）。`, hint: 'リポジトリで git pull と npm run dist:win を手動で実行してください。詳細はログにあります。' },
  terminalBusy: { message: (terminal) => `${terminal}はまだ作業中です。`, hint: 'ステータス行「[AI Interface] … 完了」を待ってから、もう一度送信してください。' },
  orchestratorUnavailable: {
    message: (detail) => `オーケストレーターを利用できません: ${detail}`,
    hint: '設定の「オーケストレーター」でオンになっているか確認してください。詳細はログにあります。',
    disabled: '設定でオフになっています。'
  },
  agentAssist: {
    message: (detail: string): string => `Claude が使えるエージェント案を返しませんでした: ${detail}`,
    hint: 'アイデアをもう少し具体的に書いて、もう一度試してください。'
  },
  agentExists: {
    message: (name: string): string => `この場所にはすでにエージェント「${name}」があります。`,
    hint: '別の名前を選ぶか、既存のエージェントを編集してください。'
  },
  automationRun: {
    message: (detail: string): string => `実行に失敗しました: ${detail}`,
    hint: '履歴で出力を確認してください。このPCでClaudeはログイン済みで、利用枠に空きがありますか？'
  },
  ipc: { message: (detail: string): string => `バックグラウンドプロセスとの接続に失敗しました：${detail}`, hint: 'アプリを再起動してください。詳細はログにあります。' },
  unknown: '不明なエラー',
  unexpectedHint: '詳細はログにあります（設定 → ログを開く）。',
  hostKeyMismatch: {
    message: (label) => `「${label}」の SSH 鍵が変わったため、接続を拒否しました。`,
    hint: (label) => `「${label}」を再インストールした場合: 設定 → デバイス → フィンガープリントをリセット。`
  },
  todoNotFound: { message: 'この項目は TODO ファイルにもう存在しません。', hint: 'TODO を再読み込みしてください。ファイルが外部で変更されました。' },
  vaultMissing: { message: 'Obsidian の Vault が設定されていません。', hint: '設定の「ノート」で Vault フォルダーを選んでください。' },
  todoConflict: { message: 'TODO ファイルは現在ほかの場所で編集されています。', hint: '少し待ってから、もう一度お試しください。' },
  todoEmpty: 'TODO のテキストは空にできません。',
  todoNewline: 'TODO のテキストに改行は含められません。',
  todoDateInvalid: (due) => `日付「${due}」が無効です。YYYY-MM-DD 形式で入力してください。`,
  what: {
    project: (id) => `プロジェクト ${id}`,
    category: (id) => `種類 ${id}`,
    image: (id) => `画像 ${id}`,
    model: (id) => `モデル ${id}`,
    source: (id) => `ソース ${id}`,
    terminal: 'ターミナル',
    terminalId: (id) => `ターミナル ${id}`,
    entry: (id) => `項目 ${id}`,
    folder: (path) => `フォルダー ${path}`,
    device: (id) => `デバイス「${id}」`,
    gitState: (path) => `${path} の Git の状態`,
    claudeMdOpener: 'CLAUDE.md を開くプログラム'
  },
  hints: {
    createDevice: '設定の「デバイス」で追加するか、プロジェクトを削除してください。',
    gitRepo: 'フォルダーが Git リポジトリか確認してください。',
    checkFavoritePath: 'お気に入りのパスを確認してください。',
    reloadCatalog: 'カタログを再読み込みして、もう一度お試しください。',
    reopenTab: 'タブを閉じて開き直してください。'
  },
  assistant: {
    busy: 'アシスタントはまだ実行中です。お待ちいただくか「停止」を押してください。',
    failed: 'アシスタントがエラーで停止しました。',
    hint: 'Claude Code がログイン済みで、使用枠に空きがあるか確認してください（左下）。',
    invalidInput: (detail) => `入力が正しくありません: ${detail}`,
    pathOutside: (target, root) => `パス ${target} は ${root} の中にありません。`,
    projectNameInvalid: (name) => `プロジェクト名「${name}」は無効です（/ \\ : * ? " < > | などのパス文字は使えません）。`,
    categoryUnknown: (category, root, available) => `カテゴリ「${category}」は ${root} にありません（利用可能: ${available}）。`,
    claudeNotFound: 'Claude Code が見つかりません',
    commandNotFound: (command) => `「${command}」が見つかりません`
  },
  timeout: (seconds) => `${seconds} 秒の制限時間を超えました`,
  favorites: {
    categoryNameEmpty: '種類の名前は空にできません。',
    categoryExists: (name) => `種類「${name}」はすでにあります。`,
    nameAndPathEmpty: '名前とパスは空にできません。',
    folderIsProject: (path) => `フォルダー ${path} はすでにプロジェクトです。`,
    colorInvalid: (color) => `色「${color}」は無効です。#rrggbb または #rgb 形式で指定してください（例: #e08a4f）。`,
    iconInvalid: (icon) => `アイコン「${icon}」は無効です。絵文字か Lucide のアイコン名を選んでください。`
  },
  ssh: {
    disabled: '設定で無効になっています',
    keyPassphrase: (path) => `SSH 鍵 ${path} にはパスフレーズがあります。SSH エージェントを起動してください（ssh-add）`,
    keyMissing: (path) => `SSH 鍵 ${path} がなく、SSH エージェントも動いていません`,
    homeUnknown: 'ホームディレクトリを特定できません',
    commandFailed: (label, code, stderr) => `「${label}」でのコマンドに失敗しました（${code}）: ${stderr}`
  },
  images: {
    extensionUnsupported: (extension, allowed) => `ファイル形式 .${extension} には対応していません（対応: ${allowed}）。`,
    dropTooLarge: (name, limit) => `「${name}」は大きすぎて転送できません（上限 ${limit}）。`,
    dropUnreadable: (name) => `「${name}」を読み込めませんでした。フォルダーはローカルのターミナルにのみドロップできます。`
  },
  models: { nameRequired: 'モデルには名前が必要です。', ollamaNoAnswer: (code) => `Ollama が応答しません（${code}）` },
  minipc: { authMissing: 'デバイスの応答にログイン情報がありません。', gitError: 'エラー' },
  privacy: {
    unknownHost: (host, known) => `不明なコンピューター「${host}」です。使えるもの: ${known}。`,
    pickProjectFolder: 'ドライブやファイルシステムのルートではなく、プロジェクトフォルダーを選んでください。',
    alreadyPrivate: 'このフォルダーはすでにプライベートです。'
  },
  quota: {
    notObject: 'オブジェクトではありません',
    missing: (kind) => `${kind} がありません`,
    utilizationMissing: (kind) => `${kind}.utilization がありません`,
    expiredHint: 'Claude Code を一度起動すると、ログインが更新されます。',
    unavailableHint: '取得元がないため、アプリは値を表示しません。',
    noConnection: 'Anthropic に接続できません。',
    tooManyRequests: 'リクエストが多すぎます（HTTP 429）。後ほど再試行します。',
    loginExpired: 'Claude のログインの有効期限が切れました。',
    requestFailed: (status) => `取得に失敗しました（HTTP ${status}）。`,
    notJson: '応答が JSON ではありませんでした。',
    noLogin: 'Claude のログイン情報が見つかりません。',
    loginUnreadable: 'Claude Code のログインファイルを読み取れません。',
    noSubscription: 'サブスクリプションのログイン（claude.ai）が見つかりません。'
  },
  setup: {
    invalidJson: (detail) => `有効な JSON ではありません: ${detail}`,
    invalidContent: (path, detail) => `「${path}」の内容が無効です: ${detail}`,
    rootPath: 'ルート',
    unknown: '不明',
    folderMissing: (path) => `フォルダー ${path} が存在しません。`,
    connected: (user, host) => `${user}@${host} に接続しました。`,
    pickProjectsRoot: 'プロジェクトフォルダーを選んでください。',
    deviceIdInvalid: (id) => `デバイス ID「${id}」は無効か、重複しています。`
  },
  skills: { emptySummary: '応答が空です', unreadable: (path) => `${path}: 読み取れません` },
  sources: { urlInvalid: 'アドレスは http:// または https:// で始めてください。例: https://ja.wikipedia.org/wiki/フーリエ変換。', targetDuplicate: 'このアドレスは移動先のフォルダーにすでにあります。', duplicate: 'このアドレスはこのフォルダーにすでにあります。' },
  speech: {
    noFreePort: '空いているポートが見つかりません',
    noTextField: '応答に「text」フィールドがありません',
    noServerAnswer: 'whisper-server は GPU でも CPU でも応答しません',
    startCancelled: '音声認識が終了したため、起動を中止しました',
  },
  update: {
    releaseInstall: (url) => `リリース版からインストールされています。新しいバージョンは ${url} にあります`,
    noCommit: 'ビルドにコミット識別子がありません',
    repoMissing: (dir) => `リポジトリ ${dir} がありません`,
    step: '確認',
    nothingNewer: 'GitHub に新しいバージョンはありません',
    notInRemote: (commit, ref) => `インストール済みの ${commit} は ${ref} に含まれていません`,
    wrongBranch: (branch, expected) => `リポジトリは ${expected} ではなくブランチ ${branch} にあります`,
    dirty: 'リポジトリにコミットされていない変更があります',
    exitCode: (code) => `終了コード ${code}`
  },
  vault: { invalidName: (name) => `ファイル名「${name}」は無効です。`, notProtocol: (path) => `「${path}」はログフォルダー内のセッションログではありません。` },
  links: {
    nameRequired: '名前を入力してください。',
    nameTaken: (name) => `「${name}」というリンクはすでにあります。`,
    urlRequired: 'ページのアドレスを入力してください。',
    urlInvalid: 'アドレスは http:// または https:// で始めてください。例: http://192.168.1.20:8123。'
  }
}
