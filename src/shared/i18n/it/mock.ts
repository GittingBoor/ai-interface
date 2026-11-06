import type { Messages } from '../messages'

/** Messaggi dell’app simulati nella modalità browser (`npm run dev:web`). */
export const mock: Messages['mock'] = {
  terminal: {
    connectedTo: (where: string): string => `Connesso a ${where}`,
    sessionResumed: 'sessione ripresa',
    sessionNew: 'nuova sessione',
    echoNote: 'Terminale fittizio: l’input viene restituito, “exit” termina.'
  },
  favoriteExists: { message: 'Questa cartella è già un preferito.', hint: 'Scegli un’altra cartella o rinomina il preferito esistente.' },
  reviewDone: 'Verifica di esempio terminata.',
  browserNoInstall: 'In modalità browser non viene installato nulla.',
  dictationSample: 'Questo è un testo di esempio dettato.',
  pinHint: 'Inserisci di nuovo il PIN (mock: 1234).',
  assistant: {
    createProject: 'Creo il progetto **Beat Lab** in `D:\\GitHub\\Projects`: una cartella con CLAUDE.md, piano, README e .gitignore, poi `git init`.',
    preview: 'Cartella: D:\\GitHub\\Projects\\Beat Lab\nFile:\n- CLAUDE.md\n- docs\\PLAN.md\n- README.md\n- .gitignore\nPoi: git init -b main',
    done: 'Fatto. Vuoi che aggiunga il progetto anche nell’app?',
    declined: 'Ok, non creo nulla. Cosa devo fare diversamente?',
    quota: 'La tua quota di 5 ore è al **32%**, quella settimanale all’**84%**.'
  }
}
