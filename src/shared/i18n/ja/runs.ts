import type { Messages } from '../messages'

export const runs: Messages['runs'] = {
  description: '利用枠が満杯で中断された実行',
  quotaFree: '利用枠に空きあり',
  quotaFreeBody: (percent: string): string => `5 時間枠は ${percent} 使用中。再開できます。`,
  quotaFull: '利用枠が満杯',
  quotaFullUntil: (time: string, countdown: string): string => `${time} まで（あと ${countdown}）。それまで再開してもすぐにまた中断されます。`,
  quotaFullUnknown: 'リセット時刻は不明です。',
  quotaUnknown: '利用枠は不明',
  quotaLoading: '取得中 …',
  quotaNoSource: '最新の取得元がありません。左下を参照してください。',
  abortedAgo: (age: string): string => `${age}に中断`,
  noPrompt: '最後の入力は記録されていません。',
  quoted: (text: string): string => `「${text}」`,
  resumedNote: 'ターミナルで再開済み · Claude が再び応答すると消えます。',
  dismiss: '完了',
  dismissTitle: '再開せずに一覧から外す',
  resume: '再開',
  reopen: '再度開く',
  resumeTitle: (name: string): string => `${name} で claude --resume を実行`,
  resumeAll: 'すべて再開',
  resumeAllCount: (n: number): string => `すべて再開（${n}）`,
  emptyTitle: '保留中の実行はありません – すべて完了しています',
  emptyBody: '利用枠が満杯で Claude が中断すると、その実行がここに入ります。利用枠が回復したら、ワンクリックで再開できます。',
  runCount: (n: number): string => `${n} 件の実行`
}
