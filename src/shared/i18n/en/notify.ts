import type { Messages } from '../messages'

export const notify: Messages['notify'] = {
  titles: { permission: 'Permission needed', question: 'Question from Claude', done: 'Claude is done' },
  defaultMessages: { permission: 'Claude needs your permission.', question: 'Claude has a question.', done: 'Claude is done.' },
  quotaFreeTitle: 'Quota available again',
  quotaFreeBody: (open) => (open === 1 ? '1 run is waiting to be resumed.' : `${open} runs are waiting to be resumed.`),
  updatingTitle: 'AI Interface is updating',
  updatingBody: 'The new version is ready, the app restarts shortly.',
  updateFailedTitle: 'Update failed',
  updateFailedBody: 'The app keeps running with the old version; details in the settings.',
  updateAvailableTitle: 'Update available',
  updateAvailableBody: 'New version on GitHub. Click “Update” in the sidebar.'
}
