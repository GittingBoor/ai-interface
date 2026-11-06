import type { Messages } from '../messages'

export const common: Messages['common'] = {
  save: 'Salva',
  cancel: 'Annulla',
  delete: 'Elimina',
  close: 'Chiudi',
  retry: 'Riprova',
  loading: 'Caricamento…',
  languageSystem: (name: string): string => `Sistema (${name})`
}
