export type HowToGroupId = 'speech' | 'app' | 'windows' | 'claude'

export interface HowToGroup {
  readonly id: HowToGroupId
  readonly label: string
}

export interface HowToEntry {
  readonly group: HowToGroupId
  readonly keys: readonly string[]
  readonly title: string
  readonly description: string
}

export const HOWTO_GROUPS: readonly HowToGroup[] = [
  { id: 'speech', label: 'Spracheingabe' },
  { id: 'app', label: 'AI Interface' },
  { id: 'windows', label: 'Windows' },
  { id: 'claude', label: 'Claude Code' }
]

export const HOWTO_ENTRIES: readonly HowToEntry[] = [
  { group: 'speech', keys: ['Mikrofon'], title: 'Diktieren', description: 'Klick startet die Aufnahme, zweiter Klick erkennt und fügt den Text ein. Gesendet wird nie automatisch.' },
  { group: 'speech', keys: ['Esc'], title: 'Aufnahme verwerfen', description: 'Bricht ein laufendes Diktat ab, ohne etwas einzufügen.' },
  { group: 'speech', keys: ['Strg', 'Shift', 'Leertaste'], title: 'Diktat per Tastatur', description: 'Startet/stoppt das Diktat für den Assistenten (mit Fokus) oder das aktive Terminal. Oben einschalten.' },
  { group: 'speech', keys: ['Pfeil'], title: 'Modell wechseln', description: 'Pfeil neben dem Mikrofon: Schnell, Standard oder Genau.' },
  { group: 'speech', keys: ['Win', 'H'], title: 'Windows-Diktat', description: 'Systemweite Spracheingabe in jedes Textfeld, ohne Einrichtung, erkennt schlechter als Whisper.' },
  { group: 'speech', keys: ['/voice'], title: 'Claude-Code-Sprachmodus', description: 'Falls deine Claude-Code-Version ihn hat: Diktat direkt im Terminal über Anthropics Dienst.' },
  { group: 'app', keys: ['Strg', 'K'], title: 'Suche / Befehlspalette', description: 'Bereiche, Projekte und Aktionen finden.' },
  { group: 'app', keys: ['Strg', 'J'], title: 'Assistent', description: 'KI-Assistent ein- und ausblenden, auch aus dem Terminal.' },
  { group: 'app', keys: ['Strg', '1…0'], title: 'Bereiche', description: 'Direkt zu Auswertung, Projekte, Terminal … springen (Ziffern siehe Seitenleiste).' },
  { group: 'app', keys: ['Strg', 'T'], title: 'Neues Terminal', description: 'Im Terminal-Bereich den Startdialog öffnen.' },
  { group: 'app', keys: ['Shift', 'Enter'], title: 'Neue Zeile im Terminal', description: 'Zeilenumbruch in Claude Code statt Absenden (Strg+Enter geht auch).' },
  { group: 'app', keys: ['Strg', 'V'], title: 'Bild ins Terminal', description: 'Bild aus der Zwischenablage wird gespeichert und als Pfad eingefügt.' },
  { group: 'windows', keys: ['Win', 'V'], title: 'Zwischenablage-Verlauf', description: 'Frühere kopierte Texte und Bilder auswählen.' },
  { group: 'windows', keys: ['Win', 'Shift', 'S'], title: 'Bildschirmausschnitt', description: 'Ausschnitt in die Zwischenablage, danach mit Strg+V ins Terminal.' },
  { group: 'windows', keys: ['Win', '.'], title: 'Emojis und Sonderzeichen', description: 'Emoji-Auswahl in jedem Textfeld.' },
  { group: 'claude', keys: ['Shift', 'Tab'], title: 'Modus wechseln', description: 'Zwischen normal, Auto-Accept und Plan-Modus umschalten.' },
  { group: 'claude', keys: ['Esc', 'Esc'], title: 'Zurückspulen', description: 'Zu einer früheren Nachricht zurück und von dort neu ansetzen.' },
  { group: 'claude', keys: ['/'], title: 'Befehle', description: 'Slash-Befehle und Skills, z. B. /help, /clear, /compact.' },
  { group: 'claude', keys: ['@'], title: 'Datei erwähnen', description: 'Dateipfad mit Autovervollständigung in die Nachricht einfügen.' },
  { group: 'claude', keys: ['Esc'], title: 'Antwort unterbrechen', description: 'Laufende Antwort stoppen, Verlauf bleibt.' }
]

export function filterHowTo(entries: readonly HowToEntry[], query: string): readonly HowToEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return entries
  return entries.filter((e) => `${e.title} ${e.description} ${e.keys.join('+')}`.toLowerCase().includes(q))
}
