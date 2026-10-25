# AI Interface einrichten – Auftrag für Claude

> **So nutzt du diese Datei:** Öffne Claude Code in einem beliebigen Ordner und schreib:
> „Lies `docs/CLAUDE-TEMPLATE.md` aus dem AI-Interface-Repository und richte mir das AI Interface danach ein.“
> Oder kopiere alles ab der Linie unten direkt in den Chat.
>
> Claude prüft dann deinen Rechner, fragt bei Unklarem nach und schreibt einen Einrichtungsvorschlag.
> Beim ersten Start übernimmt die App diesen Vorschlag automatisch; du bestätigst ihn nur noch.

---

## Deine Aufgabe

Du richtest für mich das **AI Interface** ein, eine Desktop-App (Electron) für die Arbeit mit Claude Code:
Verbrauch und Kontingent, Projekte mit eingebautem Terminal, optional TODOs und Protokolle aus Obsidian
und optional weitere Rechner per SSH.

Am Ende steht eine Datei **`ai-interface-setup.json` in meinem Home-Ordner**
(Windows: `%USERPROFILE%\ai-interface-setup.json`, Linux/macOS: `~/ai-interface-setup.json`).
Der Einrichtungsassistent der App liest sie beim ersten Start und füllt damit alle Schritte vor.

### Regeln

- Frag mich, bevor du etwas installierst, klonst oder baust. Lesen und Suchen darfst du ohne Rückfrage.
- Keine Passwörter, Tokens oder privaten Schlüssel in die Datei. Nur **Pfade** zu Schlüsseldateien.
- Ändere nichts an meinen Projekten, Notizen oder SSH-Einstellungen.
- Wenn du etwas nicht sicher erkennst: nachfragen statt raten.
- Antworte auf Deutsch, kurz.

### Schritt 1: Voraussetzungen prüfen

Prüfe und melde mir das Ergebnis in einer kurzen Liste:

| Was | Prüfen mit | Mindestens |
|---|---|---|
| Claude Code | `claude --version` (angemeldet?) | aktuell |
| Windows: Git Bash | `C:\Program Files\Git\bin\bash.exe` vorhanden (nicht das WSL-`bash.exe`) | für Meldungen aus Terminals |
| Node.js | `node --version` | 22, nur zum Bauen aus dem Quellcode |
| Git | `git --version` | nur zum Bauen aus dem Quellcode |

Fehlt etwas, nenn mir den Installationsbefehl (Windows: `winget install Git.Git`, zum Bauen zusätzlich
`winget install OpenJS.NodeJS.LTS`) und warte, bis ich ihn ausgeführt habe.

### Schritt 2: App installieren (nur nach Rückfrage)

**Windows, fertiger Installer (Standard):** Lade die neueste Version von
https://github.com/GittingBoor/ai-interface/releases/latest/download/AI-Interface-Setup.exe herunter (z. B. mit
`gh release download -R GittingBoor/ai-interface -p "AI-Interface-Setup.exe"` oder im Browser) und lass sie mich starten.
Der Installer ist nicht signiert; Windows fragt evtl. nach („Weitere Informationen“ → „Trotzdem ausführen“).

**Linux oder auf Wunsch aus dem Quellcode:** Frag mich, wohin das Repository soll (Vorschlag: mein Projektordner
aus Schritt 3). Dann:

```bash
git clone https://github.com/GittingBoor/ai-interface.git
cd ai-interface
npm install
npm run dist:win     # Windows: Installer unter release/
npm run dist:linux   # Linux: AppImage unter release/
```

Unter Windows den Installer `release\AI Interface Setup <version>.exe` starten lassen (ich klicke selbst).
Ist die App schon installiert, diesen Schritt überspringen.

### Schritt 3: Rechner ansehen

Sammle, ohne etwas zu ändern:

1. **Projektordner:** Wo liegen meine Code-Projekte? Typisch: `~/projects`, `~/Projects`, `~/GitHub`,
   `~/source/repos`, unter Windows auch `D:\GitHub`, `D:\Projects`. Nimm den Ordner mit den meisten
   Git-Repositories. Bei mehreren Kandidaten frag mich.
2. **Projekte:** Unterordner des Projektordners, die ein Git-Repository sind oder eine `CLAUDE.md` haben
   (eine Ebene tief; reine Sammelordner wie `Uni/` eine Ebene weiter). Lass `node_modules`, `.venv` usw. weg.
   Zusätzlich die Ordner aus `~/.claude/projects/` (dort steht je Ordner, in dem Claude Code lief, ein
   kodierter Pfad) – das sind Projekte, an denen ich wirklich arbeite.
3. **Obsidian-Vault:** Ordner mit einem Unterordner `.obsidian` (Home, Dokumente, OneDrive, iCloud, Dropbox).
   Wenn gefunden: TODO-Dateien (`TODO*.md`) und Ordner, die mit „Protokoll“ beginnen. Gibt es mehrere
   TODO-Dateien, frag, welche die App verwalten soll.
4. **Weitere Rechner:** Einträge in `~/.ssh/config` (Host, HostName, User, Port, IdentityFile) und vorhandene
   Schlüssel `~/.ssh/id_ed25519`, `id_ecdsa`, `id_rsa`. Frag mich, welche Rechner die App anzeigen soll.
   Teste die Verbindung mit `ssh -o BatchMode=yes <user>@<host> echo ok` (nur lesen). Klappt sie nicht,
   erklär mir kurz die Einrichtung aus `docs/EINRICHTUNG.md`, Abschnitt „Gerät per SSH anbinden“.

### Schritt 4: Vorschlag mit mir abstimmen

Zeig mir eine kurze Übersicht:

- Projektordner
- Projekte (Name, Pfad, Rechner) mit Vorschlag für **Arten** (z. B. Programmieren, Uni, Arbeit, Privat)
  und je ein passendes Symbol
- Vault, TODO-Datei, Protokollordner (oder „kein Obsidian“)
- Geräte (Name, Adresse, Benutzer, Projektordner auf dem Gerät)

Ich korrigiere, dann schreibst du die Datei.

### Schritt 5: `ai-interface-setup.json` schreiben

Format (alle Felder außer den markierten sind optional; unbekannte Felder werden ignoriert):

```jsonc
{
  "projectsRoot": "C:\\Users\\Alex\\Projects",        // Ordner mit den Projekten
  "vault": {                                           // null = kein Obsidian
    "path": "C:\\Users\\Alex\\Documents\\Notizen",    // Pflicht, wenn vault gesetzt
    "todoFile": "TODO.md",                             // relativ zum Vault
    "protocolDir": "Protokolle",                       // relativ zum Vault
    "notesDir": "Projekte"                             // Mappe mit einem Ordner je Projekt, "" = Vault-Wurzel
  },
  "devices": [
    {
      "id": "server",                                  // optional, sonst aus dem Namen: a-z, 0-9, "-"
      "name": "Server",                                // Pflicht
      "host": "192.168.1.20",                          // Pflicht: IP oder Hostname
      "user": "alex",                                  // Pflicht
      "port": 22,
      "privateKeyPath": "C:\\Users\\Alex\\.ssh\\id_ed25519",
      "projectsDir": "~/projects",                     // Projektordner auf dem Gerät
      "color": "#5fb37a",
      "icon": "lucide:server"                          // "lucide:<name>" oder "emoji:<Emoji>"
    }
  ],
  "categories": [
    { "name": "Programmieren", "color": "#e08a4f", "icon": "lucide:code" }
  ],
  "projects": [
    {
      "path": "C:\\Users\\Alex\\Projects\\webshop",   // Pflicht
      "name": "Webshop",
      "device": "local",                               // "local" oder id/name eines Geräts
      "category": "Programmieren",                     // Name einer Art
      "color": "#e08a4f",
      "icon": "emoji:🛒",
      "starred": true                                  // oben angepinnt
    }
  ]
}
```

Wichtig:

- Echtes JSON ohne Kommentare schreiben; die Kommentare oben dienen nur der Erklärung.
- Unter Windows Backslashes verdoppeln (`"C:\\Users\\..."`).
- Farben als `#rrggbb`. Symbole: Lucide-Namen in Kleinbuchstaben mit Bindestrich (`lucide:graduation-cap`)
  oder ein einzelnes Emoji (`emoji:🎵`).
- Ein vollständiges Beispiel liegt in `docs/ai-interface-setup.example.json`.

Prüfe die Datei danach, z. B. mit `node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" <datei>`.

### Schritt 6: Abschluss

Sag mir:

1. Wo die Datei liegt.
2. Dass ich jetzt das AI Interface starte. Beim ersten Start erscheint der Einrichtungsassistent mit
   „Vorschlag gefunden und übernommen“; ich klicke mich durch und bestätige.
3. Ist die App schon eingerichtet: **Einstellungen → System → Einrichtung starten**, dann wird der
   Vorschlag ebenfalls übernommen. Vorhandene Projekte und Geräte bleiben erhalten, doppelte werden übersprungen.
4. Was offen ist (z. B. SSH-Schlüssel, die ich noch auf ein Gerät kopieren muss).
5. Mit Obsidian: Die Startseite zeigt offene Aufgaben aus Projekt-Protokollen. Zeig mir den Protokoll-Block aus
   `docs/EINRICHTUNG.md` (Abschnitt „Obsidian verbinden“) und frag, ob du ihn in meine `CLAUDE.md` aufnehmen sollst.

Die Datei kann danach liegen bleiben oder gelöscht werden; die App braucht sie nur während der Einrichtung.
