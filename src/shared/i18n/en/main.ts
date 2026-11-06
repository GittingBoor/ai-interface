import type { Messages } from '../messages'

export const main: Messages['main'] = {
  defaults: { protocolDir: 'Logs', categories: { coding: 'Coding', work: 'Work', learning: 'Learning' } },
  speechHotkeyKeys: ['Ctrl', 'Shift', 'Space'],
  thisPc: 'This PC',
  deviceFallback: 'Device',
  untitled: 'Untitled',
  quotaReached: 'Quota reached',
  orchestratorTitle: 'Orchestrator',
  taskReviewTitle: 'Task review',
  dialogs: { startScripts: 'Start scripts', allFiles: 'All files' },
  imageTitles: {
    fromUser: (date) => `From you · ${date}`,
    aiImage: (date) => `AI image · ${date}`,
    screenshot: (name, date) => `Screenshot · ${name} · ${date}`
  },
  prerequisites: {
    claudeMissing: 'Without Claude Code there are no terminals, no usage and no assistant.',
    loginLabel: 'Signed in to Claude',
    loginViaKey: (variable) => `API key (${variable})`,
    loginHint: 'Run claude once and sign in via the browser (Pro, Max, Team or API account).',
    gitBashMissing: 'Without Git Bash there are no desktop notifications and no status (working, done, question) in the terminals.'
  },
  speechModels: {
    'small-q5_1': { label: 'Fast', description: 'Small and quick, tends to mishear technical terms.' },
    'large-v3-turbo-q5_0': { label: 'Standard', description: 'Good accuracy, under a second on the GPU.' },
    'large-v3-q5_0': { label: 'Accurate', description: 'Best recognition, much slower.' }
  }
}
