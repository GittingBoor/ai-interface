export const howto = {
  searchLabel: 'Kürzel suchen',
  searchPlaceholder: 'Kürzel suchen …',
  sectionAria: 'Kürzel und Tricks',
  clearSearch: 'Suche leeren',
  nothingFound: (query: string): string => `Nichts gefunden für „${query}“.`,
  groups: { speech: 'Spracheingabe', app: 'AI Interface', windows: 'Windows', claude: 'Claude Code' },
  keys: { mic: 'Mikrofon', arrow: 'Pfeil', star: 'Stern' },
  entries: {
    dictate: { title: 'Diktieren', description: 'Klick startet die Aufnahme, zweiter Klick erkennt und fügt den Text ein. Gesendet wird nie automatisch.' },
    discard: { title: 'Aufnahme verwerfen', description: 'Bricht ein laufendes Diktat ab, ohne etwas einzufügen.' },
    dictateKeys: { title: 'Diktat per Tastatur', description: 'Startet/stoppt das Diktat für den Assistenten (mit Fokus) oder das aktive Terminal. Oben einschalten.' },
    switchModel: { title: 'Modell wechseln', description: 'Pfeil neben dem Mikrofon: Schnell, Standard oder Genau.' },
    windowsDictation: { title: 'Windows-Diktat', description: 'Systemweite Spracheingabe in jedes Textfeld, ohne Einrichtung, erkennt schlechter als Whisper.' },
    voiceMode: { title: 'Claude-Code-Sprachmodus', description: 'Falls deine Claude-Code-Version ihn hat: Diktat direkt im Terminal über Anthropics Dienst.' },
    palette: { title: 'Suche / Befehlspalette', description: 'Bereiche, Projekte und Aktionen finden.' },
    assistant: { title: 'Assistent', description: 'KI-Assistent ein- und ausblenden, auch aus dem Terminal.' },
    areas: { title: 'Bereiche', description: (a: string, b: string, c: string): string => `Direkt zu ${a}, ${b}, ${c} … springen (Ziffern siehe Seitenleiste).` },
    newTerminal: { title: 'Neues Terminal', description: 'Im Terminal-Bereich den Startdialog öffnen.' },
    newLine: { title: 'Neue Zeile im Terminal', description: (ctrlEnter: string): string => `Zeilenumbruch in Claude Code statt Absenden (${ctrlEnter} geht auch).` },
    pasteImage: { title: 'Bild ins Terminal', description: 'Bild aus der Zwischenablage wird gespeichert und als Pfad eingefügt.' },
    starSource: {
      title: 'Quelle in die Seitenleiste',
      description: (sources: string, websites: string, ai: string): string =>
        `Unter „${sources}“ eine Webseite mit Stern markieren: Sie steht dann unter „${websites}“. Seiten, die Claude liest, legt die App unter „${ai}“ ab.`
    },
    clipboardHistory: { title: 'Zwischenablage-Verlauf', description: 'Frühere kopierte Texte und Bilder auswählen.' },
    screenshot: { title: 'Bildschirmausschnitt', description: (paste: string): string => `Ausschnitt in die Zwischenablage, danach mit ${paste} ins Terminal.` },
    emoji: { title: 'Emojis und Sonderzeichen', description: 'Emoji-Auswahl in jedem Textfeld.' },
    switchMode: { title: 'Modus wechseln', description: 'Zwischen normal, Auto-Accept und Plan-Modus umschalten.' },
    rewind: { title: 'Zurückspulen', description: 'Zu einer früheren Nachricht zurück und von dort neu ansetzen.' },
    commands: { title: 'Befehle', description: 'Slash-Befehle und Skills, z. B. /help, /clear, /compact.' },
    mention: { title: 'Datei erwähnen', description: 'Dateipfad mit Autovervollständigung in die Nachricht einfügen.' },
    interrupt: { title: 'Antwort unterbrechen', description: 'Laufende Antwort stoppen, Verlauf bleibt.' }
  }
}
