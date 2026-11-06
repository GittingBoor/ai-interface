import type { Messages } from '../messages'

/** Mensajes de la app simulados en el modo navegador (`npm run dev:web`). */
export const mock: Messages['mock'] = {
  terminal: {
    connectedTo: (where: string): string => `Conectado a ${where}`,
    sessionResumed: 'sesión reanudada',
    sessionNew: 'sesión nueva',
    echoNote: 'Terminal simulado: la entrada se devuelve tal cual y «exit» lo termina.'
  },
  favoriteExists: { message: 'Esta carpeta ya es un favorito.', hint: 'Elige otra carpeta o cambia el nombre del favorito existente.' },
  reviewDone: 'Revisión de ejemplo terminada.',
  browserNoInstall: 'En el modo navegador no se instala nada.',
  dictationSample: 'Este es un texto de ejemplo dictado.',
  pinHint: 'Vuelve a introducir el PIN (simulado: 1234).',
  assistant: {
    createProject: 'Voy a crear el proyecto **Beat Lab** en `D:\\GitHub\\Projects`: una carpeta con CLAUDE.md, plan, README y .gitignore, y después `git init`.',
    preview: 'Carpeta: D:\\GitHub\\Projects\\Beat Lab\nArchivos:\n- CLAUDE.md\n- docs\\PLAN.md\n- README.md\n- .gitignore\nDespués: git init -b main',
    done: 'Hecho. ¿Quieres que también añada el proyecto en la app?',
    declined: 'De acuerdo, no creo nada. ¿Qué debería hacer de otra forma?',
    quota: 'Tu cuota de 5 horas está al **32 %** y la semanal al **84 %**.'
  }
}
