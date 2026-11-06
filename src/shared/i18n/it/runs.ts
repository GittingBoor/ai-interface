import type { Messages } from '../messages'

export const runs: Messages['runs'] = {
  description: 'Esecuzioni interrotte per quota esaurita',
  quotaFree: 'Quota disponibile',
  quotaFreeBody: (percent: string): string => `Finestra di 5 ore al ${percent}. Puoi riprendere.`,
  quotaFull: 'Quota esaurita',
  quotaFullUntil: (time: string, countdown: string): string => `fino alle ${time} (tra ${countdown}). Fino ad allora, riprendere si interrompe subito di nuovo.`,
  quotaFullUnknown: 'L’orario di reset è sconosciuto.',
  quotaUnknown: 'Quota sconosciuta',
  quotaLoading: 'interrogazione in corso …',
  quotaNoSource: 'nessuna fonte aggiornata, vedi in basso a sinistra.',
  abortedAgo: (age: string): string => `interrotta ${age}`,
  noPrompt: 'Ultimo input non registrato.',
  quoted: (text: string): string => `«${text}»`,
  resumedNote: 'Ripresa nel terminale · scompare appena Claude risponde di nuovo.',
  dismiss: 'Fatto',
  dismissTitle: 'Rimuovi dall’elenco senza riprendere',
  resume: 'Riprendi',
  reopen: 'Riapri',
  resumeTitle: (name: string): string => `claude --resume in ${name}`,
  resumeAll: 'Riprendi tutte',
  resumeAllCount: (n: number): string => `Riprendi tutte (${n})`,
  emptyTitle: 'Nulla in sospeso – tutte le esecuzioni sono concluse',
  emptyBody: 'Se Claude si interrompe per quota esaurita, l’esecuzione finisce qui. Quando la quota torna disponibile, la riprendi con un clic.',
  runCount: (n: number): string => (n === 1 ? '1 esecuzione' : `${n} esecuzioni`)
}
