export const errors = {
  hostUnreachable: { message: (host: string, cause: string): string => `${host} ist nicht erreichbar: ${cause}`, hint: 'Netzwerk und SSH-Einstellungen prüfen.' },
  notFound: (what: string): string => `${what} wurde nicht gefunden.`,
  validationHint: 'Eingabe korrigieren und erneut versuchen.',
  quotaFormat: {
    message: (detail: string): string => `Format der Kontingent-Antwort unbekannt (${detail}).`,
    hint: 'Claude Code aktualisieren; bis dahin zeigt die App keine Werte statt falscher.'
  },
  summaryFailed: {
    message: (name: string, cause: string): string => `Zusammenfassung für „${name}“ fehlgeschlagen: ${cause}`,
    hint: 'Claude Code prüfen (angemeldet, Kontingent frei) und erneut starten; fertige Zusammenfassungen bleiben erhalten.'
  },
  claudeCli: {
    message: (detail: string): string => `Claude Code konnte nicht ausgeführt werden (${detail}).`,
    hint: 'Prüfen, ob Claude Code installiert und angemeldet ist (claude im Terminal starten).'
  },
  gitFailed: { message: (action: string, cause: string): string => `${action} fehlgeschlagen: ${cause}`, hint: 'Prüfen, ob Git installiert ist und der Ordner beschreibbar ist.' },
  speechUnsupported: { message: 'Spracheingabe ist nur unter Windows eingerichtet.', hint: 'Unter Windows nutzen oder Win+H bzw. /voice in Claude Code verwenden.' },
  whisperNotInstalled: { message: (model: string): string => `Spracherkennung „${model}“ ist nicht eingerichtet.`, hint: 'Im Tab Steuerung das Modell herunterladen.' },
  whisperStart: {
    message: (detail: string): string => `Spracherkennung konnte nicht gestartet werden (${detail}).`,
    hint: 'Grafiktreiber aktualisieren oder in Steuerung ein kleineres Modell wählen; Details im Log.'
  },
  transcription: { message: (detail: string): string => `Spracherkennung fehlgeschlagen (${detail}).`, hint: 'Noch einmal sprechen; tritt es wieder auf, App neu starten.' },
  emptyTranscript: { message: 'Nichts erkannt.', hint: 'Näher ans Mikrofon gehen und etwas lauter sprechen.' },
  download: { message: (what: string, detail: string): string => `Download von ${what} fehlgeschlagen (${detail}).`, hint: 'Internetverbindung prüfen und erneut versuchen.' },
  downloadChecksum: {
    message: (what: string): string => `Prüfsumme von ${what} stimmt nicht, Datei wurde gelöscht.`,
    hint: 'Erneut herunterladen; bei Wiederholung ist die Quelle geändert worden.'
  },
  downloadCancelled: { message: 'Download abgebrochen.' },
  speechBusy: { message: (model: string): string => `Es wird bereits „${model}“ heruntergeladen.`, hint: 'Warten, bis der Download fertig ist, oder ihn abbrechen.' },
  privacyLocked: { message: 'Der Privatmodus ist aktiv.', hint: 'In den Einstellungen mit der PIN entsperren.' },
  wrongPin: { message: 'PIN falsch.', tooMany: (waitSec: number): string => `Zu viele Fehlversuche, bitte ${waitSec} s warten.`, hint: 'PIN erneut eingeben.' },
  invalidPin: { message: 'Die PIN muss aus 4 bis 12 Ziffern bestehen.', hint: 'Nur Ziffern verwenden.' },
  pinRequired: { message: 'Für den Privatmodus ist noch keine PIN festgelegt.', hint: 'Neue PIN festlegen, das entsperrt den Privatmodus.' },
  updateFailed: {
    message: (step: string, detail: string): string => `Update fehlgeschlagen bei „${step}“ (${detail}).`,
    hint: 'Im Repo manuell git pull und npm run dist:win ausführen; Details im Log.'
  },
  terminalBusy: { message: (terminal: string): string => `${terminal} arbeitet noch.`, hint: 'Warte auf die Statuszeile „[AI Interface] … fertig“ und sende dann erneut.' },
  orchestratorUnavailable: {
    message: (detail: string): string => `Orchestrator nicht verfügbar: ${detail}`,
    hint: 'In den Einstellungen unter „Orchestrator“ prüfen, ob er eingeschaltet ist; Details stehen im Log.',
    disabled: 'in den Einstellungen ausgeschaltet.'
  },
  agentAssist: {
    message: (detail: string): string => `Claude hat keinen brauchbaren Agent-Entwurf geliefert: ${detail}`,
    hint: 'Idee etwas genauer beschreiben und erneut versuchen.'
  },
  agentExists: {
    message: (name: string): string => `An diesem Ort gibt es schon einen Agent „${name}“.`,
    hint: 'Anderen Namen wählen oder den bestehenden Agent bearbeiten.'
  },
  automationRun: {
    message: (detail: string): string => `Lauf fehlgeschlagen: ${detail}`,
    hint: 'Im Verlauf die Ausgabe prüfen; läuft Claude auf dem Rechner (angemeldet, Kontingent frei)?'
  },
  ipc: { message: (detail: string): string => `Verbindung zum Hintergrundprozess fehlgeschlagen: ${detail}`, hint: 'App neu starten; Details stehen im Log.' },
  unknown: 'Unbekannter Fehler',
  unexpectedHint: 'Details stehen im Log (Einstellungen → Log öffnen).',
  hostKeyMismatch: {
    message: (label: string): string => `Der SSH-Schlüssel von „${label}“ hat sich geändert, Verbindung abgelehnt.`,
    hint: (label: string): string => `Wenn „${label}“ neu installiert wurde: Einstellungen → Geräte → Fingerabdruck zurücksetzen.`
  },
  todoNotFound: { message: 'Der Eintrag existiert in der TODO-Datei nicht mehr.', hint: 'TODOs neu laden, die Datei wurde extern geändert.' },
  vaultMissing: { message: 'Es ist kein Obsidian-Vault eingerichtet.', hint: 'In den Einstellungen unter „Notizen“ einen Vault-Ordner wählen.' },
  todoConflict: { message: 'Die TODO-Datei wird gerade woanders bearbeitet.', hint: 'Kurz warten und erneut versuchen.' },
  todoEmpty: 'Der TODO-Text darf nicht leer sein.',
  todoNewline: 'Der TODO-Text darf keinen Zeilenumbruch enthalten.',
  todoDateInvalid: (due: string): string => `Ungültiges Datum „${due}“, erwartet JJJJ-MM-TT.`,
  what: {
    project: (id: number): string => `Projekt ${id}`,
    category: (id: number): string => `Art ${id}`,
    image: (id: number): string => `Bild ${id}`,
    model: (id: number): string => `Modell ${id}`,
    source: (id: number): string => `Quelle ${id}`,
    terminal: 'Terminal',
    terminalId: (id: string): string => `Terminal ${id}`,
    entry: (id: string): string => `Eintrag ${id}`,
    folder: (path: string): string => `Der Ordner ${path}`,
    device: (id: string): string => `Gerät „${id}“`,
    gitState: (path: string): string => `Git-Stand für ${path}`,
    claudeMdOpener: 'Ein Programm zum Öffnen der CLAUDE.md'
  },
  hints: {
    createDevice: 'In den Einstellungen unter Geräte anlegen oder das Projekt entfernen.',
    gitRepo: 'Prüfen, ob der Ordner ein Git-Repository ist.',
    checkFavoritePath: 'Pfad des Favoriten prüfen.',
    reloadCatalog: 'Katalog neu laden und erneut versuchen.',
    reopenTab: 'Tab schließen und neu öffnen.'
  },
  assistant: {
    busy: 'Der Assistent läuft noch. Warten oder „Stopp“ drücken.',
    failed: 'Der Assistent hat mit einem Fehler aufgehört.',
    hint: 'Prüfen, ob Claude Code angemeldet ist und das Kontingent frei ist (unten links).',
    invalidInput: (detail: string): string => `Eingabe fehlerhaft: ${detail}`,
    pathOutside: (target: string, root: string): string => `Der Pfad ${target} liegt nicht innerhalb von ${root}.`,
    projectNameInvalid: (name: string): string => `Projektname „${name}“ ist ungültig (keine Pfadzeichen wie / \\ : * ? " < > |).`,
    categoryUnknown: (category: string, root: string, available: string): string => `Kategorie „${category}“ gibt es in ${root} nicht (vorhanden: ${available}).`,
    claudeNotFound: 'Claude Code wurde nicht gefunden',
    commandNotFound: (command: string): string => `„${command}“ nicht gefunden`
  },
  timeout: (seconds: number): string => `Zeitlimit von ${seconds} s überschritten`,
  favorites: {
    categoryNameEmpty: 'Der Name der Art darf nicht leer sein.',
    categoryExists: (name: string): string => `Die Art „${name}“ gibt es schon.`,
    nameAndPathEmpty: 'Name und Pfad dürfen nicht leer sein.',
    folderIsProject: (path: string): string => `Der Ordner ${path} ist bereits ein Projekt.`,
    colorInvalid: (color: string): string => `Farbe „${color}“ ist ungültig, erwartet wird #rrggbb oder #rgb (z. B. #e08a4f).`,
    iconInvalid: (icon: string): string => `Symbol „${icon}“ ist ungültig: ein Emoji oder ein Lucide-Icon-Name wählen.`
  },
  ssh: {
    disabled: 'in den Einstellungen deaktiviert',
    keyPassphrase: (path: string): string => `SSH-Schlüssel ${path} hat eine Passphrase; bitte den SSH-Agent starten (ssh-add)`,
    keyMissing: (path: string): string => `SSH-Schlüssel ${path} fehlt und kein SSH-Agent läuft`,
    homeUnknown: 'Home-Verzeichnis nicht ermittelbar',
    commandFailed: (label: string, code: number, stderr: string): string => `Befehl auf „${label}“ fehlgeschlagen (${code}): ${stderr}`
  },
  images: {
    extensionUnsupported: (extension: string, allowed: string): string => `Dateityp .${extension} wird nicht unterstützt (erlaubt: ${allowed}).`,
    pasteUnsupported: (extension: string, allowed: string): string => `Bildformat „${extension}“ wird nicht unterstützt; erlaubt: ${allowed}`
  },
  models: {
    nameRequired: 'Das Modell braucht einen Namen.',
    ollamaNoAnswer: (code: number): string => `Ollama antwortet nicht (${code})`
  },
  minipc: { authMissing: 'Antwort des Geräts ohne Anmeldedaten.', gitError: 'Fehler' },
  privacy: {
    unknownHost: (host: string, known: string): string => `Unbekannter Rechner „${host}“, erwartet: ${known}.`,
    pickProjectFolder: 'Bitte einen Projektordner wählen, keine Laufwerks- oder Dateisystemwurzel.',
    alreadyPrivate: 'Dieser Ordner ist bereits privat.'
  },
  quota: {
    notObject: 'kein Objekt',
    missing: (kind: string): string => `${kind} fehlt`,
    utilizationMissing: (kind: string): string => `${kind}.utilization fehlt`,
    expiredHint: 'Claude Code einmal starten, dann wird die Anmeldung erneuert.',
    unavailableHint: 'Ohne Quelle zeigt die App keine Werte an.',
    noConnection: 'Keine Verbindung zu Anthropic.',
    tooManyRequests: 'Zu viele Abfragen (HTTP 429), nächster Versuch später.',
    loginExpired: 'Die Claude-Anmeldung ist abgelaufen.',
    requestFailed: (status: number): string => `Abfrage fehlgeschlagen (HTTP ${status}).`,
    notJson: 'Antwort war kein JSON.',
    noLogin: 'Keine Claude-Anmeldung gefunden.',
    loginUnreadable: 'Anmeldedatei von Claude Code ist unlesbar.',
    noSubscription: 'Keine Abo-Anmeldung (claude.ai) gefunden.'
  },
  setup: {
    invalidJson: (detail: string): string => `Kein gültiges JSON: ${detail}`,
    invalidContent: (path: string, detail: string): string => `Ungültiger Inhalt bei „${path}“: ${detail}`,
    rootPath: 'Wurzel',
    unknown: 'unbekannt',
    folderMissing: (path: string): string => `Der Ordner ${path} existiert nicht.`,
    connected: (user: string, host: string): string => `Verbunden mit ${user}@${host}.`,
    pickProjectsRoot: 'Bitte einen Projektordner wählen.',
    deviceIdInvalid: (id: string): string => `Geräte-ID „${id}“ ist ungültig oder doppelt.`
  },
  skills: { emptySummary: 'leere Antwort', unreadable: (path: string): string => `${path}: nicht lesbar` },
  sources: { urlInvalid: 'Die Adresse muss mit http:// oder https:// beginnen, z. B. https://de.wikipedia.org/wiki/Fourier-Transformation.', targetDuplicate: 'Diese Adresse steht im Zielordner schon.', duplicate: 'Diese Adresse steht in diesem Ordner schon.' },
  speech: {
    noFreePort: 'Kein freier Port gefunden',
    noTextField: 'Antwort ohne Feld „text“',
    noServerAnswer: 'whisper-server antwortet weder mit GPU noch mit CPU',
    startCancelled: 'Start abgebrochen, weil die Spracherkennung beendet wurde',
  },
  update: {
    releaseInstall: (url: string): string => `Installiert aus einem Release: neue Versionen unter ${url}`,
    noCommit: 'Build enthält keine Commit-Kennung',
    repoMissing: (dir: string): string => `Repo ${dir} fehlt`,
    step: 'Prüfung',
    nothingNewer: 'kein neuerer Stand auf GitHub',
    notInRemote: (commit: string, ref: string): string => `installierter Stand ${commit} liegt nicht in ${ref}`,
    wrongBranch: (branch: string, expected: string): string => `Repo steht auf Branch ${branch} statt ${expected}`,
    dirty: 'Repo hat uncommittete Änderungen',
    exitCode: (code: number): string => `Exit-Code ${code}`
  },
  vault: {
    invalidName: (name: string): string => `Ungültiger Dateiname „${name}“.`,
    notProtocol: (path: string): string => `„${path}“ ist kein Protokoll aus einem Protokollordner.`
  },
  links: {
    nameRequired: 'Bitte einen Namen eingeben.',
    nameTaken: (name: string): string => `Eine Verknüpfung namens „${name}“ gibt es schon.`,
    urlRequired: 'Bitte die Adresse der Seite eingeben.',
    urlInvalid: 'Die Adresse muss mit http:// oder https:// beginnen, z. B. http://192.168.1.20:8123.'
  }
}
