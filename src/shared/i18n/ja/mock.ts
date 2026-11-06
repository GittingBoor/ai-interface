import type { Messages } from '../messages'

/** ブラウザーモード（`npm run dev:web`）で擬似的に表示するアプリのメッセージ。 */
export const mock: Messages['mock'] = {
  terminal: {
    connectedTo: (where: string): string => `${where} に接続しました`,
    sessionResumed: 'セッションを再開',
    sessionNew: '新しいセッション',
    echoNote: 'モックターミナル：入力はそのまま返され、「exit」で終了します。'
  },
  favoriteExists: { message: 'このフォルダーはすでにお気に入りです。', hint: '別のフォルダーを選ぶか、既存のお気に入りの名前を変更してください。' },
  reviewDone: 'サンプルの確認が完了しました。',
  browserNoInstall: 'ブラウザーモードでは何もインストールされません。',
  dictationSample: 'これは音声入力のサンプルテキストです。',
  pinHint: 'PIN をもう一度入力してください（モック：1234）。',
  assistant: {
    createProject: '`D:\\GitHub\\Projects` にプロジェクト **Beat Lab** を作成します。CLAUDE.md、プラン、README、.gitignore を含むフォルダーを作り、その後 `git init` を実行します。',
    preview: 'フォルダー：D:\\GitHub\\Projects\\Beat Lab\nファイル：\n- CLAUDE.md\n- docs\\PLAN.md\n- README.md\n- .gitignore\nその後：git init -b main',
    done: '完了しました。このプロジェクトをアプリにも登録しますか？',
    declined: '了解しました。何も作成しません。どう変えればよいですか？',
    quota: '5 時間の利用枠は **32%**、週の利用枠は **84%** です。'
  }
}
