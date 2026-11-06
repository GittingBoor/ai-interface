import type { Messages } from '@shared/i18n/messages'
import { speechHotkeyKeys } from '@shared/speech'

export type HowToGroupId = 'speech' | 'app' | 'windows' | 'claude'
export type HowToEntryId = keyof Messages['howto']['entries']

export interface HowToGroup {
  readonly id: HowToGroupId
  readonly label: string
}

export interface HowToEntry {
  readonly id: HowToEntryId
  readonly group: HowToGroupId
  readonly keys: readonly string[]
  readonly title: string
  readonly description: string
}

const GROUP_IDS: readonly HowToGroupId[] = ['speech', 'app', 'windows', 'claude']
/** Tastennamen, die in allen Sprachen gleich lauten. */
const WIN = 'Win'
const ESC = 'Esc'
const ENTER = 'Enter'
/** Position von Shift in `speechHotkeyKeys` (Strg, Shift, Leertaste). */
const SHIFT_INDEX = 1

export const howToGroups = (t: Messages): readonly HowToGroup[] => GROUP_IDS.map((id) => ({ id, label: t.howto.groups[id] }))

/** Alle Hilfeeinträge in der Sprache von `t`; die Tastennamen folgen der Plattform-Schreibweise der Sprache. */
export function howToEntries(t: Messages): readonly HowToEntry[] {
  const ctrl = t.frame.ctrl
  const shift = speechHotkeyKeys(t)[SHIFT_INDEX] ?? 'Shift'
  const e = t.howto.entries
  const { views } = t.frame
  const entry = (id: HowToEntryId, group: HowToGroupId, keys: readonly string[], description: string): HowToEntry => ({ id, group, keys, title: e[id].title, description })
  return [
    entry('dictate', 'speech', [t.howto.keys.mic], e.dictate.description),
    entry('discard', 'speech', [ESC], e.discard.description),
    entry('dictateKeys', 'speech', speechHotkeyKeys(t), e.dictateKeys.description),
    entry('switchModel', 'speech', [t.howto.keys.arrow], e.switchModel.description),
    entry('windowsDictation', 'speech', [WIN, 'H'], e.windowsDictation.description),
    entry('voiceMode', 'speech', ['/voice'], e.voiceMode.description),
    entry('palette', 'app', [ctrl, 'K'], e.palette.description),
    entry('assistant', 'app', [ctrl, 'J'], e.assistant.description),
    entry('areas', 'app', [ctrl, '1…0'], e.areas.description(views.overview, views.projects, views.terminal)),
    entry('newTerminal', 'app', [ctrl, 'T'], e.newTerminal.description),
    entry('newLine', 'app', [shift, ENTER], e.newLine.description(t.frame.shortcut(ENTER))),
    entry('pasteImage', 'app', [ctrl, 'V'], e.pasteImage.description),
    entry('starSource', 'app', [t.howto.keys.star], e.starSource.description(views.sources, t.nav.groups.websites, t.nav.groups.ai)),
    entry('clipboardHistory', 'windows', [WIN, 'V'], e.clipboardHistory.description),
    entry('screenshot', 'windows', [WIN, shift, 'S'], e.screenshot.description(t.frame.shortcut('V'))),
    entry('emoji', 'windows', [WIN, '.'], e.emoji.description),
    entry('switchMode', 'claude', [shift, 'Tab'], e.switchMode.description),
    entry('rewind', 'claude', [ESC, ESC], e.rewind.description),
    entry('commands', 'claude', ['/'], e.commands.description),
    entry('mention', 'claude', ['@'], e.mention.description),
    entry('interrupt', 'claude', [ESC], e.interrupt.description)
  ]
}

export function filterHowTo(entries: readonly HowToEntry[], query: string): readonly HowToEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return entries
  return entries.filter((e) => `${e.title} ${e.description} ${e.keys.join('+')}`.toLowerCase().includes(q))
}
