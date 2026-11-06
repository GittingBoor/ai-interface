import type { Messages } from '../messages'

export const notify: Messages['notify'] = {
  titles: { permission: 'Se necesita permiso', question: 'Pregunta de Claude', done: 'Claude ha terminado' },
  defaultMessages: { permission: 'Claude necesita tu permiso.', question: 'Claude tiene una pregunta.', done: 'Claude ha terminado.' },
  quotaFreeTitle: 'Cuota disponible de nuevo',
  quotaFreeBody: (open) => (open === 1 ? '1 ejecución espera a continuar.' : `${open} ejecuciones esperan a continuar.`),
  updatingTitle: 'AI Interface se está actualizando',
  updatingBody: 'La nueva versión está compilada; la app se reiniciará en breve.',
  updateFailedTitle: 'Falló la actualización',
  updateFailedBody: 'La app sigue con la versión anterior; detalles en los ajustes.',
  updateAvailableTitle: 'Actualización disponible',
  updateAvailableBody: 'Nueva versión en GitHub. Haz clic en «Actualizar» en la barra lateral.'
}
