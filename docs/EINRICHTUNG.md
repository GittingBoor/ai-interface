# Einrichtung Schritt für Schritt

Diese Anleitung führt von null bis zur fertig eingerichteten App. Rechne mit 15 Minuten, davon die meiste Zeit
für `npm install` und den Build.

**Abkürzung:** Gib Claude Code die Datei [`CLAUDE-TEMPLATE.md`](CLAUDE-TEMPLATE.md). Claude prüft die
Voraussetzungen, sieht sich deine Ordner an und schreibt einen Vorschlag, den die App beim ersten Start übernimmt.
Die Schritte unten sind dann nur noch zum Nachlesen.

## Inhalt

1. [Voraussetzungen](#1-voraussetzungen)
2. [Bauen und installieren](#2-bauen-und-installieren)
3. [Der Einrichtungsassistent](#3-der-einrichtungsassistent)
4. [Gerät per SSH anbinden](#4-gerät-per-ssh-anbinden) (optional)
5. [Obsidian verbinden](#5-obsidian-verbinden) (optional)
6. [Anpassen: Seitenleiste und Seiten](#6-anpassen-seitenleiste-und-seiten)
7. [Updates](#7-updates)
8. [Probleme lösen](#8-probleme-lösen)

## 1. Voraussetzungen

| Was | Wozu | Prüfen |
|---|---|---|
| **Claude Code**, angemeldet | Terminals, Verbrauch, Kontingent, Assistent | `claude --version`, einmal `claude` starten und anmelden |
| **Node.js 22** oder neuer | Bauen der App | `node --version` |
| **Git** | Klonen, Updates, Git-Stand | `git --version` |
| Windows: **Git Bash** (kommt mit Git) | Benachrichtigungen aus Claude-Terminals | `where bash` |

Windows (PowerShell):

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
irm https://claude.ai/install.ps1 | iex   # falls Claude Code noch fehlt
```

Linux (Debian/Ubuntu): Node 22 über [nodesource](https://github.com/nodesource/distributions) oder `nvm`,
dann `sudo apt install git` und `curl -fsSL https://claude.ai/install.sh | bash`.
Weitere Wege (Homebrew, WinGet, npm): [Claude-Code-Installation](https://code.claude.com/docs/en/setup).

Claude Code braucht ein Pro-, Max-, Team- oder Enterprise-Abo oder ein API-Konto. Danach einmal `claude` starten
und im Browser anmelden.

## 2. Bauen und installieren

```bash
git clone https://github.com/GittingBoor/ai-interface.git
cd ai-interface
npm install
```

Dann je nach System:

| System | Befehl | Ergebnis |
|---|---|---|
| Windows | `npm run dist:win` | `release\AI Interface Setup <version>.exe` ausführen; legt eine Desktop-Verknüpfung an |
| Linux | `npm run dist:linux` | `release/AI Interface-<version>.AppImage`, ausführbar machen und starten |
| ohne Installation | `npm run build && npm start` | startet die gebaute App direkt aus dem Ordner |

Native Module (Terminal, SQLite) bringen fertige Builds mit; Visual Studio oder Compiler sind nicht nötig.
Lass den geklonten Ordner liegen: Die installierte Windows-Version holt sich beim Anmelden neue Stände von dort
(siehe [Updates](#7-updates)).

## 3. Der Einrichtungsassistent

Beim ersten Start (noch keine Daten auf diesem Rechner) öffnet sich statt der normalen Oberfläche der
Einrichtungsassistent. Jeder Schritt lässt sich später unter **Einstellungen** ändern.

1. **Willkommen.** Die App hat schon gesucht: Projektordner, Obsidian-Vaults, SSH-Schlüssel. Liegt eine
   `ai-interface-setup.json` im Home-Ordner (z. B. von Claude geschrieben), steht hier
   „Vorschlag gefunden und übernommen“, und alle folgenden Schritte sind vorausgefüllt.
2. **Projekte.** Wähle den Ordner, in dem deine Code-Projekte liegen (Vorschläge stehen darunter).
   „Ordner einlesen“ listet die Unterordner; Git-Repositories und Ordner mit `CLAUDE.md` sind vorausgewählt.
   Sammelordner ohne eigenes Repository (z. B. `Uni/`) werden eine Ebene tiefer gelesen.
   Ausgewählte Ordner werden zu Projekten; weitere kannst du jederzeit unter **Projekte** eintragen.
3. **Notizen** (optional). Schalte „Obsidian-Vault verbinden“ ein und wähle den Vault. Die App schlägt
   TODO-Dateien und Protokollordner aus dem Vault vor. Ohne Obsidian einfach überspringen; nur TODOs und
   Protokolle bleiben dann leer.
4. **Geräte** (optional). Weitere Rechner per SSH, siehe [Abschnitt 4](#4-gerät-per-ssh-anbinden).
   „Verbindung testen“ prüft Adresse, Benutzer und Schlüssel sofort.
5. **Fertig.** Zusammenfassung, „Beim Anmelden starten“ an oder aus, dann „Einrichtung abschließen“.

Den Assistenten kannst du jederzeit erneut starten: **Einstellungen → System → Einrichtung starten**.
Vorhandene Projekte, Arten und Geräte bleiben dabei erhalten; doppelte werden übersprungen.

> **Update von einer älteren Version:** Die frühere feste Mini-PC-Verbindung wird automatisch zum Gerät
> „Mini-PC“; Projekte, Verbrauch und Bilder bleiben ihm zugeordnet. Vault-Pfad, TODO-Datei und Projektordner
> haben keine fest eingebauten Standardwerte mehr. Waren sie nicht ausdrücklich gespeichert, erscheint einmal der
> Assistent als „Einrichtung prüfen“, vorausgefüllt mit dem, was die App findet. Vorhandene Daten bleiben.

## 4. Gerät per SSH anbinden

Ein Gerät ist jeder Rechner, den du per SSH erreichst: Server, Mini-PC, NAS, Raspberry Pi, ein zweiter Laptop.
Die App liest dort den Claude-Verbrauch, Systemwerte (CPU, RAM, Temperaturen, Docker), den Git-Stand der
Projekte und öffnet Terminals. Auf dem Gerät muss nichts installiert werden außer einem SSH-Server
(Linux; für Claude-Terminals auch Claude Code).

**Schlüssel anlegen** (einmalig, auf dem Rechner mit der App):

```powershell
ssh-keygen -t ed25519            # Enter für Standardpfad; Passphrase optional
```

**Schlüssel auf das Gerät kopieren:**

```powershell
# Windows (PowerShell)
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh <benutzer>@<adresse> "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

```bash
# Linux/macOS
ssh-copy-id <benutzer>@<adresse>
```

**Prüfen:** `ssh <benutzer>@<adresse> echo ok` muss ohne Passwortabfrage `ok` ausgeben.

**In der App:** Einstellungen → Geräte → „Gerät hinzufügen“ (oder im Assistenten Schritt 4):

| Feld | Beispiel | Hinweis |
|---|---|---|
| Name | Server | so heißt der Eintrag in der Seitenleiste |
| Farbe, Symbol | grün, Server-Icon | kennzeichnen das Gerät in Diagrammen und Listen |
| Adresse, Port | `192.168.1.20`, `22` | IP oder Hostname |
| Benutzer | `alex` | Benutzer auf dem Gerät |
| Privater Schlüssel | `~/.ssh/id_ed25519` | Datei auf diesem PC; ohne Datei nutzt die App den SSH-Agent |
| Projektordner auf dem Gerät | `~/projects` | für Ordnerliste und Git-Stand |

Schlüssel mit Passphrase: SSH-Agent starten und `ssh-add` ausführen (Windows: Dienst „OpenSSH Authentication
Agent“ aktivieren). Beim ersten Verbinden speichert die App den Fingerabdruck des Geräts. Ändert er sich (etwa nach
einer Neuinstallation), verweigert sie die Verbindung; dann in der Geräteliste „SSH-Fingerabdruck zurücksetzen“.

Jedes eingeschaltete Gerät bekommt einen Eintrag in der Gruppe **Geräte** der Seitenleiste. Mit dem Auge in der
Geräteliste heftest du es an oder blendest es aus. Strg+9 öffnet das erste Gerät.

## 5. Obsidian verbinden

Einstellungen → **Ordner und Notizen**:

| Feld | Bedeutung |
|---|---|
| Obsidian-Vault | Ordner mit `.obsidian` darin; leer = kein Obsidian |
| Vault liegt auf | dieser PC oder ein Gerät (erscheint nur mit Geräten) |
| TODO-Datei | relativ zum Vault, z. B. `TODO.md`; „TODO-Datei anlegen“ in der App erstellt sie |
| Protokollordner | relativ zum Vault; Markdown-Dateien darin erscheinen unter **Protokolle** |
| Projektnotizen | Mappe mit einem Unterordner je Projekt (z. B. `Projekte`). Liegt dort `Projekte/<Projektname>/Protokoll`, ordnet die App diese Protokolle dem Projekt zu |

Die App schreibt nur die TODO-Datei, und zwar verlustfrei: Alle Zeilen außer den geänderten Aufgaben bleiben
unverändert. Format (Obsidian Tasks):

```markdown
## Server
- [ ] Backup prüfen ⏫ 📅 2026-10-01
- [x] Updates eingespielt ✅ 2026-09-20
```

**Offene Aufgaben auf der Startseite:** Die App liest im neuesten Protokoll eines Projekts den letzten
`## `-Abschnitt und darin das Feld `**Offen:**` mit einer Liste darunter. Abhaken in der App merkt sie sich, die
Datei bleibt unverändert. Damit Claude solche Protokolle schreibt, nimm eine Anweisung in die `CLAUDE.md` des
Projekts (oder in `~/.claude/CLAUDE.md`) auf, z. B.:

```markdown
## Protokoll nach jeder Sitzung
In Obsidian `Projekte/<Projektname>/Protokoll/JJJJ-MM-TT.md`, eine Datei pro Tag, je Sitzung ein Abschnitt:

    ## <kurzer Titel>
    **Anliegen:** …
    **Ergebnis:** …
    **Offen:**
    - [ ] was noch aussteht
```

## 6. Anpassen: Seitenleiste und Seiten

- **Seitenleiste:** Klick auf eine Gruppenüberschrift klappt sie ein. Unter „Seitenleiste anpassen“
  (unten in der Leiste, oder Einstellungen → Seitenleiste) benennst du Gruppen um, legst neue an, ziehst Einträge
  zwischen Gruppen oder blendest sie aus. „Standard wiederherstellen“ setzt alles zurück.
- **Auswertung:** Zeitraum, Rechner, Aufteilung, Darstellung und Projekte im Panel links; die Auswahl bleibt
  gespeichert. Ein Klick auf eine Kennzahl oder einen Balken im Ranking ändert alle Diagramme.
- **Geräteseite:** „Anpassen“ oben rechts. Abschnitte per Ziehen oder mit den Pfeilen verschieben,
  Breite umschalten (ganz, zwei Drittel, halb, ein Drittel), ausblenden. Ausgeblendetes steht unten zum
  Wiedereinblenden. „Standard“ setzt die Seite zurück.
- **Projekte:** Arten (Kategorien), Farben, Symbole und Stern zum Anpinnen direkt unter **Projekte**.

## 7. Updates

- **Windows, installierte Version:** Beim Start prüft die App, ob GitHub einen neueren Stand hat. Unter
  Einstellungen → Updates wählst du, was dann passiert:
  - **Manuell (Standard):** Hinweis „Update verfügbar“ in der Seitenleiste; ein Klick auf „Aktualisieren“ baut den
    Stand im geklonten Ordner und installiert ihn. Die App startet danach neu.
  - **Automatisch beim Anmelden:** Mit „Beim Anmelden starten“ baut und installiert die App neue Stände nach der
    Anmeldung selbst.
- Übersprungen wird, wenn der geklonte Ordner uncommittete Änderungen hat oder nicht auf `main` steht; der Grund
  steht unter Einstellungen → Updates.
- **Von Hand:** im geklonten Ordner `git pull`, `npm install`, dann wieder `npm run dist:win` bzw. `dist:linux`.

## 8. Probleme lösen

| Problem | Lösung |
|---|---|
| Gerät „nicht erreichbar“ | `ssh <benutzer>@<adresse> echo ok` im Terminal prüfen; Adresse, Port, Benutzer, Schlüsselpfad in den Einstellungen vergleichen; ist das Gerät im selben Netz? |
| „SSH-Schlüssel … hat eine Passphrase“ | SSH-Agent starten und `ssh-add` ausführen |
| „Der SSH-Schlüssel von … hat sich geändert“ | Nur wenn das Gerät neu aufgesetzt wurde: Einstellungen → Geräte → Fingerabdruck zurücksetzen |
| Kontingent zeigt nichts | einmal `claude` im Terminal starten und anmelden; die App liest nur dessen Anmeldung |
| TODOs leer | Einstellungen → Ordner und Notizen: Vault und TODO-Datei prüfen |
| Keine Benachrichtigungen (Windows) | Git Bash installiert? Benachrichtigungen unter Einstellungen eingeschaltet? |
| Vorschlagsdatei wird nicht übernommen | Der Assistent zeigt den Fehler mit Feldname; JSON prüfen (Backslashes verdoppelt?), dann „Einrichtung starten“ |
| Etwas anderes | Einstellungen → App → „Log öffnen“ |
