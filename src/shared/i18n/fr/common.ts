import type { Messages } from '../messages'

export const common: Messages['common'] = {
  save: 'Enregistrer',
  cancel: 'Annuler',
  delete: 'Supprimer',
  close: 'Fermer',
  retry: 'Réessayer',
  loading: 'Chargement…',
  languageSystem: (name: string): string => `Système (${name})`
}
