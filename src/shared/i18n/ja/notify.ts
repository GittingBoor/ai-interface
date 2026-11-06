import type { Messages } from '../messages'

export const notify: Messages['notify'] = {
  titles: { permission: '許可が必要です', question: 'Claude からの質問', done: 'Claude が完了しました' },
  defaultMessages: { permission: 'Claude があなたの許可を求めています。', question: 'Claude から質問があります。', done: 'Claude が完了しました。' },
  quotaFreeTitle: '使用枠が回復しました',
  quotaFreeBody: (open) => `${open} 件の実行が再開を待っています。`,
  updatingTitle: 'AI Interface を更新しています',
  updatingBody: '新しいバージョンのビルドが完了しました。まもなくアプリが再起動します。',
  updateFailedTitle: 'アップデートに失敗しました',
  updateFailedBody: 'アプリは古いバージョンのまま動作します。詳細は設定をご覧ください。',
  updateAvailableTitle: 'アップデートがあります',
  updateAvailableBody: 'GitHub に新しいバージョンがあります。サイドバーの「更新」をクリックしてください。'
}
