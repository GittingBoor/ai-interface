import type { Messages } from '../messages'

export const format: Messages['format'] = {
  justNow: 'たった今',
  lessThanMinute: '1 分未満',
  unitSecond: '秒',
  unitMinute: '分',
  unitHour: '時間',
  unitDay: '日',
  overdueDays: (days: number): string => `${days} 日超過`,
  linkStates: { UP: '接続中', DOWN: '切断', UNKNOWN: '不明', DORMANT: '休止中', LOWERLAYERDOWN: 'リンクなし' },
  dockerStates: {
    running: '実行中',
    exited: '停止',
    restarting: '再起動中',
    paused: '一時停止',
    created: '作成済み',
    dead: '異常終了',
    removing: '削除中'
  },
  dockerUnits: { second: '秒', minute: '分', hour: '時間', day: '日', week: '週間', month: 'か月', year: '年' },
  dockerHealth: { healthy: '正常', unhealthy: '異常', 'health: starting': '確認中' },
  dockerAbout: (span: string): string => `約 1 ${span}`,
  dockerLessThan: (span: string): string => `1 ${span}未満`,
  dockerUp: (span: string): string => `${span}稼働`,
  dockerUpHealthy: (span: string, health: string): string => `${span}稼働 · ${health}`,
  dockerExited: (span: string, code: string): string => `${span}前に終了（コード ${code}）`
}
