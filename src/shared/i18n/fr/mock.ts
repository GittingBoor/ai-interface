import type { Messages } from '../messages'

/** Messages de l’app simulés en mode navigateur (`npm run dev:web`). */
export const mock: Messages['mock'] = {
  terminal: {
    connectedTo: (where: string): string => `Connecté à ${where}`,
    sessionResumed: 'session reprise',
    sessionNew: 'nouvelle session',
    echoNote: 'Terminal factice : la saisie est renvoyée telle quelle, « exit » le termine.'
  },
  favoriteExists: { message: 'Ce dossier est déjà un favori.', hint: 'Choisissez un autre dossier ou renommez le favori existant.' },
  reviewDone: 'Vérification d’exemple terminée.',
  browserNoInstall: 'Rien n’est installé en mode navigateur.',
  dictationSample: 'Ceci est un texte d’exemple dicté.',
  pinHint: 'Saisissez à nouveau le code PIN (factice : 1234).',
  assistant: {
    createProject: 'Je crée le projet **Beat Lab** dans `D:\\GitHub\\Projects` : un dossier avec CLAUDE.md, plan, README et .gitignore, puis `git init`.',
    preview: 'Dossier : D:\\GitHub\\Projects\\Beat Lab\nFichiers :\n- CLAUDE.md\n- docs\\PLAN.md\n- README.md\n- .gitignore\nEnsuite : git init -b main',
    done: 'C’est fait. Dois-je aussi ajouter le projet dans l’app ?',
    declined: 'D’accord, je ne crée rien. Que dois-je faire autrement ?',
    quota: 'Votre quota de 5 heures est à **32 %**, le quota hebdomadaire à **84 %**.'
  }
}
