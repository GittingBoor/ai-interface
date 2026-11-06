import type { Messages } from '../messages'

export const links: Messages['links'] = {
  fallbackTitle: '快捷方式',
  edit: '编辑',
  openBrowser: '在浏览器中打开',
  back: '返回',
  reload: '重新加载',
  loading: '加载中',
  unreachable: '无法访问该页面',
  unreachableHint: (error: string): string => `${error}。服务是否在运行，网络是否可达（家庭网络或 VPN）？`,
  errorCode: (code: number): string => `错误 ${code}`,
  notFoundTitle: '未找到该快捷方式',
  notFoundBody: (settings: string, group: string): string => `它已被移除。可在${settings} → ${group}中创建快捷方式。`,
  desktopOnlyTitle: '仅限桌面应用',
  desktopOnlyBody: (openBrowser: string): string => `嵌入页面仅在 Electron 中可用。在浏览器模式下请使用“${openBrowser}”。`
}
