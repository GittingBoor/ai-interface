import type { Messages } from '../messages'

export const common: Messages['common'] = {
  save: 'Guardar',
  cancel: 'Cancelar',
  delete: 'Eliminar',
  close: 'Cerrar',
  retry: 'Reintentar',
  loading: 'Cargando…',
  languageSystem: (name: string): string => `Sistema (${name})`
}
