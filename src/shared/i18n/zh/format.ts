import type { Messages } from '../messages'

export const format: Messages['format'] = {
  justNow: '刚刚',
  lessThanMinute: '不足 1 分钟',
  unitSecond: '秒',
  unitMinute: '分钟',
  unitHour: '小时',
  unitDay: '天',
  overdueDays: (days: number): string => `已逾期 ${days} 天`,
  linkStates: { UP: '已连接', DOWN: '已断开', UNKNOWN: '未知', DORMANT: '休眠', LOWERLAYERDOWN: '无链路' },
  dockerStates: {
    running: '运行中',
    exited: '已停止',
    restarting: '重启中',
    paused: '已暂停',
    created: '已创建',
    dead: '已失效',
    removing: '移除中'
  },
  dockerUnits: { second: '秒', minute: '分钟', hour: '小时', day: '天', week: '周', month: '个月', year: '年' },
  dockerHealth: { healthy: '正常', unhealthy: '异常', 'health: starting': '检查中' },
  dockerAbout: (span: string): string => `约 1 ${span}`,
  dockerLessThan: (span: string): string => `不足 1 ${span}`,
  dockerUp: (span: string): string => `已运行 ${span}`,
  dockerUpHealthy: (span: string, health: string): string => `已运行 ${span} · ${health}`,
  dockerExited: (span: string, code: string): string => `${span}前退出（代码 ${code}）`
}
