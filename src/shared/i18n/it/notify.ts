import type { Messages } from '../messages'

export const notify: Messages['notify'] = {
  titles: { permission: 'Serve un’autorizzazione', question: 'Domanda da Claude', done: 'Claude ha finito' },
  defaultMessages: { permission: 'Claude ha bisogno della tua autorizzazione.', question: 'Claude ha una domanda.', done: 'Claude ha finito.' },
  quotaFreeTitle: 'Quota di nuovo disponibile',
  quotaFreeBody: (open) => (open === 1 ? '1 esecuzione è in attesa di essere ripresa.' : `${open} esecuzioni sono in attesa di essere riprese.`),
  updatingTitle: 'AI Interface si sta aggiornando',
  updatingBody: 'La nuova versione è pronta, l’app si riavvia a breve.',
  updateFailedTitle: 'Aggiornamento non riuscito',
  updateFailedBody: 'L’app continua con la versione precedente; dettagli nelle impostazioni.',
  updateAvailableTitle: 'Aggiornamento disponibile',
  updateAvailableBody: 'Nuova versione su GitHub. Fai clic su “Aggiorna” nella barra laterale.'
}
