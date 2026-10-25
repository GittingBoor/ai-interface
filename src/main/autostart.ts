import { app } from 'electron'
import { AUTOSTART_FLAG } from './update/startupUpdate'

/** Autostart nur im installierten Build, sonst würde das Dev-Electron registriert. */
export function applyAutostart(enabled: boolean): void {
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: enabled, args: [AUTOSTART_FLAG] })
}
