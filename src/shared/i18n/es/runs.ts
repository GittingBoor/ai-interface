import type { Messages } from '../messages'

export const runs: Messages['runs'] = {
  description: 'Ejecuciones interrumpidas por cuota agotada',
  quotaFree: 'Cuota disponible',
  quotaFreeBody: (percent: string): string => `Ventana de 5 horas al ${percent}. Puedes reanudar.`,
  quotaFull: 'Cuota agotada',
  quotaFullUntil: (time: string, countdown: string): string => `hasta las ${time} (en ${countdown}). Si reanudas antes, se interrumpirá de inmediato otra vez.`,
  quotaFullUnknown: 'Se desconoce la hora de reinicio.',
  quotaUnknown: 'Cuota desconocida',
  quotaLoading: 'consultando …',
  quotaNoSource: 'sin fuente actual, mira abajo a la izquierda.',
  abortedAgo: (age: string): string => `interrumpida ${age}`,
  noPrompt: 'Última entrada no registrada.',
  quoted: (text: string): string => `«${text}»`,
  resumedNote: 'Reanudada en el terminal · desaparece en cuanto Claude vuelva a responder.',
  dismiss: 'Hecho',
  dismissTitle: 'Quitar de la lista sin reanudar',
  resume: 'Reanudar',
  reopen: 'Abrir de nuevo',
  resumeTitle: (name: string): string => `claude --resume en ${name}`,
  resumeAll: 'Reanudar todas',
  resumeAllCount: (n: number): string => `Reanudar todas (${n})`,
  emptyTitle: 'Nada pendiente – todas las ejecuciones han terminado',
  emptyBody: 'Si Claude se interrumpe por cuota agotada, la ejecución aparece aquí. Cuando la cuota vuelva a estar libre, la reanudas con un clic.',
  runCount: (n: number): string => (n === 1 ? '1 ejecución' : `${n} ejecuciones`)
}
