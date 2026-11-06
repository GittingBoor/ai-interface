import type { Messages } from '../messages'

/** Simulated app messages of the browser mode (`npm run dev:web`). */
export const mock: Messages['mock'] = {
  terminal: {
    connectedTo: (where: string): string => `Connected to ${where}`,
    sessionResumed: 'session resumed',
    sessionNew: 'new session',
    echoNote: 'Mock terminal: input is echoed back, “exit” ends it.'
  },
  favoriteExists: { message: 'This folder is already a favorite.', hint: 'Pick another folder or rename the existing favorite.' },
  reviewDone: 'Sample review finished.',
  browserNoInstall: 'Nothing is installed in browser mode.',
  dictationSample: 'This is a dictated sample text.',
  pinHint: 'Enter the PIN again (mock: 1234).',
  assistant: {
    createProject: 'I’ll create the project **Beat Lab** in `D:\\GitHub\\Projects`: a folder with CLAUDE.md, plan, README and .gitignore, then `git init`.',
    preview: 'Folder: D:\\GitHub\\Projects\\Beat Lab\nFiles:\n- CLAUDE.md\n- docs\\PLAN.md\n- README.md\n- .gitignore\nThen: git init -b main',
    done: 'Done. Shall I also add the project in the app?',
    declined: 'Okay, I won’t create anything. What should I do differently?',
    quota: 'Your 5-hour quota is at **32%**, the weekly quota at **84%**.'
  }
}
