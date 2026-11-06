import type { Messages } from '../messages'

export const howto: Messages['howto'] = {
  searchLabel: 'Search shortcuts',
  searchPlaceholder: 'Search shortcuts …',
  sectionAria: 'Shortcuts and tricks',
  clearSearch: 'Clear search',
  nothingFound: (query: string): string => `Nothing found for “${query}”.`,
  groups: { speech: 'Voice input', app: 'AI Interface', windows: 'Windows', claude: 'Claude Code' },
  keys: { mic: 'Microphone', arrow: 'Arrow', star: 'Star' },
  entries: {
    dictate: { title: 'Dictate', description: 'One click starts recording, a second click recognizes the speech and inserts the text. Nothing is ever sent automatically.' },
    discard: { title: 'Discard recording', description: 'Cancels a running dictation without inserting anything.' },
    dictateKeys: { title: 'Dictate by keyboard', description: 'Starts/stops dictation for the assistant (when focused) or the active terminal. Turn it on above.' },
    switchModel: { title: 'Switch model', description: 'Arrow next to the microphone: Fast, Standard or Accurate.' },
    windowsDictation: { title: 'Windows dictation', description: 'System-wide voice input into any text field, no setup, recognizes less accurately than Whisper.' },
    voiceMode: { title: 'Claude Code voice mode', description: 'If your Claude Code version has it: dictate directly in the terminal via Anthropic’s service.' },
    palette: { title: 'Search / command palette', description: 'Find areas, projects and actions.' },
    assistant: { title: 'Assistant', description: 'Show or hide the AI assistant, also from the terminal.' },
    areas: { title: 'Areas', description: (a: string, b: string, c: string): string => `Jump straight to ${a}, ${b}, ${c} … (numbers are shown in the sidebar).` },
    newTerminal: { title: 'New terminal', description: 'Open the start dialog in the Terminal area.' },
    newLine: { title: 'New line in terminal', description: (ctrlEnter: string): string => `Line break in Claude Code instead of sending (${ctrlEnter} works too).` },
    pasteImage: { title: 'Image into terminal', description: 'An image from the clipboard is saved and inserted as a path.' },
    starSource: {
      title: 'Source in the sidebar',
      description: (sources: string, websites: string, ai: string): string =>
        `Star a web page under “${sources}”: it then appears under “${websites}”. Pages that Claude reads are filed by the app under “${ai}”.`
    },
    clipboardHistory: { title: 'Clipboard history', description: 'Pick from previously copied texts and images.' },
    screenshot: { title: 'Screen snip', description: (paste: string): string => `Copies a snip to the clipboard, then paste it into the terminal with ${paste}.` },
    emoji: { title: 'Emoji and symbols', description: 'Emoji picker in any text field.' },
    switchMode: { title: 'Switch mode', description: 'Toggle between normal, auto-accept and plan mode.' },
    rewind: { title: 'Rewind', description: 'Go back to an earlier message and continue from there.' },
    commands: { title: 'Commands', description: 'Slash commands and skills, e.g. /help, /clear, /compact.' },
    mention: { title: 'Mention a file', description: 'Insert a file path into the message with autocomplete.' },
    interrupt: { title: 'Interrupt reply', description: 'Stop the running reply; the history stays.' }
  }
}
