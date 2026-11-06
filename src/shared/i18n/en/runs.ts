import type { Messages } from '../messages'

export const runs: Messages['runs'] = {
  description: 'Runs that stopped when the quota was full',
  quotaFree: 'Quota available',
  quotaFreeBody: (percent: string): string => `5-hour window at ${percent}. You can resume.`,
  quotaFull: 'Quota full',
  quotaFullUntil: (time: string, countdown: string): string => `until ${time} (in ${countdown}). Resuming will stop again right away until then.`,
  quotaFullUnknown: 'The reset time is unknown.',
  quotaUnknown: 'Quota unknown',
  quotaLoading: 'checking …',
  quotaNoSource: 'no current source, see bottom left.',
  abortedAgo: (age: string): string => `stopped ${age}`,
  noPrompt: 'Last input not recorded.',
  quoted: (text: string): string => `“${text}”`,
  resumedNote: 'Resumed in the terminal · disappears as soon as Claude answers again.',
  dismiss: 'Done',
  dismissTitle: 'Remove from the list without resuming',
  resume: 'Resume',
  reopen: 'Open again',
  resumeTitle: (name: string): string => `claude --resume in ${name}`,
  resumeAll: 'Resume all',
  resumeAllCount: (n: number): string => `Resume all (${n})`,
  emptyTitle: 'Nothing open – all runs are finished',
  emptyBody: 'If Claude stops because the quota is full, the run lands here. Once the quota is available again, you resume it with one click.',
  runCount: (n: number): string => (n === 1 ? '1 run' : `${n} runs`)
}
