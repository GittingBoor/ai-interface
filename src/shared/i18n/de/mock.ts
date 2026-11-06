/** Nachgestellte App-Meldungen des Browser-Modus (`npm run dev:web`). */
export const mock = {
  terminal: {
    connectedTo: (where: string): string => `Verbunden mit ${where}`,
    sessionResumed: 'Sitzung fortgesetzt',
    sessionNew: 'neue Sitzung',
    echoNote: 'Mock-Terminal: Eingaben werden zurückgegeben, „exit“ beendet.'
  },
  favoriteExists: { message: 'Dieser Ordner ist bereits ein Favorit.', hint: 'Wähle einen anderen Ordner oder benenne den vorhandenen Favoriten um.' },
  reviewDone: 'Beispiel-Prüfung beendet.',
  browserNoInstall: 'Im Browser-Modus wird nichts installiert.',
  dictationSample: 'Das ist ein diktierter Beispieltext.',
  pinHint: 'PIN erneut eingeben (Mock: 1234).',
  assistant: {
    createProject: 'Ich lege das Projekt **Beat Lab** unter `D:\\GitHub\\Projects` an: Ordner mit CLAUDE.md, Plan, README und .gitignore, danach `git init`.',
    preview: 'Ordner: D:\\GitHub\\Projects\\Beat Lab\nDateien:\n- CLAUDE.md\n- docs\\PLAN.md\n- README.md\n- .gitignore\nDanach: git init -b main',
    done: 'Erledigt. Soll ich das Projekt auch in der App eintragen?',
    declined: 'Okay, ich lege nichts an. Was soll ich anders machen?',
    quota: 'Dein 5-Stunden-Kontingent liegt bei **32 %**, das Wochenkontingent bei **84 %**.'
  }
}
