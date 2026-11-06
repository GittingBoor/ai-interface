import type { Messages } from '../messages'

export const common: Messages['common'] = {
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  close: 'Close',
  retry: 'Retry',
  loading: 'Loading…',
  languageSystem: (name: string): string => `System (${name})`
}
