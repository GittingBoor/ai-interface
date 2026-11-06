/** Agents: Übersicht, Detail, Builder, Anleitung, Qualitäts-Check, Vorlagen und Meldungen des Hauptprozesses. */
export const agents = {
  title: 'Agents',
  viewLabel: 'Ansicht',
  modeBrowse: 'Übersicht',
  modeGuide: 'Anleitung',
  reload: 'Neu laden',
  build: 'Agent bauen',
  buildFirst: 'Ersten Agent bauen',
  subtitle: (count: number, hosts: number): string => `${count} Agents auf ${hosts === 1 ? 'einem Rechner' : `${hosts} Rechnern`} · Spezialisten, an die Claude Aufgaben abgibt`,
  subtitleIdle: 'Spezialisten, an die Claude Aufgaben abgibt',
  emptyTitle: 'Noch keine Agents',
  emptyBody: 'Ein Agent ist ein Spezialist mit eigener Aufgabe, eigenen Tools und eigenem Kontext. Gesucht wird in ~/.claude/agents, in den Projekten und in Plugins.',
  noMatchTitle: 'Kein Agent passt',
  noMatchBody: 'Gesucht wird in Name, Beschreibung, Zusammenfassung, Tools und Skills.',
  clearSearch: 'Suche leeren',
  detailsAria: 'Agent-Details',
  pickTitle: 'Agent auswählen',
  pickBody: 'Links einen Agent wählen: was er macht, wann Claude ihn einsetzt, Tools, Skills und Anweisungen.',
  searchLabel: 'Agents durchsuchen',
  searchPlaceholder: 'Name, Aufgabe, Tool oder Skill',

  groups: {
    user: 'Eigene',
    userHint: 'in allen Projekten verfügbar',
    project: 'Projekt',
    projectHint: 'nur in diesem Projekt',
    plugin: 'Plugin',
    pluginHint: 'aus einem Plugin, nur lesbar',
    other: 'Weitere'
  },
  list: {
    noDescription: 'Ohne Beschreibung',
    tools: (n: number): string => `${n} Tools`,
    allTools: 'alle Tools',
    skills: (n: number): string => (n === 1 ? '1 Skill' : `${n} Skills`),
    proactive: 'von selbst',
    proactiveTitle: 'Claude setzt diesen Agent von sich aus ein'
  },
  inheritModel: 'Wie Hauptsitzung',

  settingRows: {
    model: 'Modell',
    effort: 'Denkaufwand',
    permission: 'Rechte',
    maxTurns: 'Max. Runden',
    memory: 'Gedächtnis',
    isolation: 'Isolation',
    background: 'Hintergrund',
    modelInherited: 'Wie Hauptsitzung',
    modelInheritedExplain: 'Kein Modell festgelegt: Claude nimmt das Modell der laufenden Sitzung.',
    modelCustomExplain: 'Eigene Modell-ID.',
    sessionValue: 'Wie Sitzung',
    effortInheritedExplain: 'Übernimmt den Denkaufwand der Sitzung.',
    permissionInheritedExplain: 'Übernimmt den Rechte-Modus der Sitzung, aus der er gestartet wird.',
    unlimited: 'Unbegrenzt',
    turnsUnlimitedExplain: 'Arbeitet, bis die Aufgabe erledigt ist.',
    turnsLimitedExplain: 'Hört nach so vielen Schritten auf und meldet ein Teilergebnis.',
    memoryOff: 'Aus',
    memoryOffExplain: 'Startet jedes Mal ohne Erinnerung an frühere Läufe.',
    isolationWorktree: 'Eigener Worktree',
    isolationProject: 'Im Projektordner',
    isolationWorktreeExplain: 'Arbeitet in einer Git-Kopie und stört parallele Arbeit nicht.',
    isolationProjectExplain: 'Ändert Dateien direkt im Projekt.',
    yes: 'Ja',
    no: 'Nein',
    backgroundYesExplain: 'Läuft im Hintergrund weiter, während Claude anderes tut.',
    backgroundNoExplain: 'Claude wartet auf sein Ergebnis.'
  },

  detail: {
    origin: { user: 'Eigener Agent', project: 'Projekt-Agent', plugin: 'Plugin-Agent', synced: 'Synchronisiert', disabled: 'Deaktiviert' } as Record<string, string>,
    pluginOrigin: (name: string): string => `Plugin ${name}`,
    projectOrigin: (name: string): string => `Projekt ${name}`,
    editCopy: 'Als Kopie bearbeiten',
    edit: 'Bearbeiten',
    automate: 'Automatisieren',
    delete: 'Agent löschen',
    whatItDoes: 'Was er macht',
    noSummary: 'Noch keine Zusammenfassung. Claude Haiku liest die Datei und erklärt sie in zwei Sätzen.',
    explain: 'Erklären',
    whenUsed: 'Wann Claude ihn einsetzt',
    noDescription: 'Keine Beschreibung: Claude kann nicht erkennen, wann er passt.',
    proactiveYes: 'Claude gibt passende Aufgaben von sich aus an ihn ab.',
    proactiveNo: 'Claude nutzt ihn, wenn die Aufgabe zur Beschreibung passt oder du ihn nennst.',
    callText: (name: string): string => `Gezielt aufrufen: \`@agent-${name}\` im Chat, als ganze Sitzung \`claude --agent ${name}\`.`,
    settings: 'Einstellungen',
    tools: 'Tools',
    toolsInheritAll: 'Keine Einschränkung: er darf alles, was die Sitzung darf, inklusive MCP-Tools.',
    toolMcp: 'Tool eines MCP-Servers.',
    toolCustom: 'Eigenes oder eingeschränktes Tool.',
    blocked: 'Gesperrt:',
    skills: 'Skills',
    noSkills: 'Lädt keine Skills vor und erwähnt keine.',
    skillPreloadedTitle: 'Wird beim Start komplett geladen',
    skillMentionedTitle: 'Wird in den Anweisungen erwähnt',
    preloaded: 'vorgeladen',
    mentioned: 'erwähnt',
    skillMissingTitle: 'Skill ist auf diesem Rechner nicht installiert',
    skillMissing: (name: string): string => `${name} · fehlt`,
    automations: 'Automatisierungen',
    onlyWhenCalled: 'Läuft nur, wenn Claude ihn aufruft.',
    runBySchedule: 'Nach Zeitplan laufen lassen',
    scheduleOff: 'aus',
    quality: 'Qualitäts-Check',
    qualityClean: 'Keine Hinweise. Klar beschrieben, passend eingeschränkt, mit Vorgaben zur Ausgabe.',
    instructions: 'Anweisungen',
    showLess: 'Weniger zeigen',
    showAll: 'Alles zeigen',
    instructionsEmpty: 'Leer: der Agent arbeitet nur mit dem, was Claude ihm als Aufgabe mitgibt.',
    fileAria: 'Datei',
    showInFolder: 'Im Ordner zeigen',
    preservedKeys: (keys: string): string => `Weitere Felder in der Datei, die beim Bearbeiten erhalten bleiben: ${keys}`
  },

  finding: { tip: 'Tipp', warn: 'Warnung', error: 'Fehler' },
  score: {
    great: 'Sehr gut gebaut',
    fair: 'Brauchbar, mit Luft nach oben',
    gaps: 'Lückenhaft',
    incomplete: 'Unvollständig',
    meter: 'Qualität'
  },

  builder: {
    back: 'Zurück zur Übersicht',
    editTitle: (name: string): string => `${name || 'Agent'} bearbeiten`,
    copyTitle: (name: string): string => `Kopie von ${name}`,
    newTitle: 'Neuer Agent',
    unsaved: 'Ungespeicherte Änderungen',
    saved: 'Alles gespeichert',
    notSaved: 'Noch nicht gespeichert',
    cancel: 'Abbrechen',
    save: 'Speichern',
    saveTitle: 'Speichern (Strg+S)',
    toolsTitle: 'Werkzeuge',
    toolsExplain: 'Was der Agent tun darf. Weniger ist besser: ein Prüfer braucht keine Schreibrechte, ein Rechercheur keine Shell.',
    sideAria: 'Prüfung und Vorschau',
    chooseProject: 'Projekt wählen',
    nameFallback: 'name',
    sections: { start: 'Mit KI starten', identity: 'Name und Einsatz', place: 'Speicherort', model: 'Modell und Denken', tools: 'Werkzeuge', skills: 'Skills', rights: 'Rechte und Verhalten', prompt: 'Anweisungen' },

    startNew: 'Mit KI starten',
    startImprove: 'Mit KI verbessern',
    startNewExplain: 'Beschreib in eigenen Worten, was der Agent können soll. Claude Sonnet wählt Name, Tools, Modell und Rechte und schreibt die Anweisungen. Danach kannst du alles anpassen.',
    startImproveExplain: 'Claude schärft Beschreibung, Tools und Anweisungen nach den Regeln für gute Agents. Optional sagst du, was besser werden soll.',
    ideaLabel: 'Idee für den Agent',
    improveLabel: 'Wunsch zur Verbesserung',
    ideaExample: 'z. B. „Prüft jeden Morgen, ob in meinen Projekten Tests fehlschlagen, und schreibt eine kurze Liste mit Ursache und Datei.“',
    improveExample: 'z. B. „Er soll kürzer antworten und nie Dateien ändern.“',
    createDraft: 'Entwurf erstellen',
    improve: 'Verbessern',
    drafting: 'Claude entwirft den Agent, das dauert meist 15–40 Sekunden.',
    revising: 'Claude überarbeitet den Agent, das dauert meist 15–40 Sekunden.',
    shortcut: 'Strg+Enter',
    whyChosen: 'Warum Claude so gewählt hat',
    orTemplate: 'Oder mit einer Vorlage beginnen:',

    identityTitle: 'Name und Einsatz',
    identityExplain: 'Die Beschreibung ist das Wichtigste am ganzen Agent: an ihr entscheidet Claude, ob eine Aufgabe zu ihm passt.',
    nameLabel: 'Name',
    nameHint: 'Kleinbuchstaben und Bindestriche. Wird zum Dateinamen und zum Aufruf (@agent-name).',
    colorLabel: 'Farbe',
    whenLabel: 'Wann soll Claude ihn einsetzen?',
    whenHint: (chars: number): string => `Was er tut und wann er passt, in 1–3 Sätzen. Gut: „Prüft Code-Änderungen auf Fehler. Use when …“ · ${chars} Zeichen`,
    whenPlaceholder: 'Prüft frische Code-Änderungen auf Fehler und Sicherheitslücken. Use when Code geändert wurde, bevor committet wird.',
    proactiveLabel: 'Von selbst einsetzen',
    proactiveDescription: 'Hängt „Use proactively.“ an: Claude gibt passende Aufgaben ungefragt ab. Aus: nur wenn die Aufgabe eindeutig passt oder du ihn nennst.',

    placeTitle: 'Speicherort',
    placeExplain: 'Eigene Agents gelten in allen Projekten auf dem Rechner. Projekt-Agents liegen im Projekt, wandern mit Git mit und gewinnen bei gleichem Namen.',
    host: 'Rechner',
    appliesTo: 'Gilt für',
    allProjects: 'Alle Projekte',
    oneProject: 'Ein Projekt',
    project: 'Projekt',
    noProjects: (host: string): string => `Keine Projekte auf ${host}`,

    modelTitle: 'Modell und Denken',
    modelExplain: 'Günstige Modelle für einfache, große Mengen; starke Modelle nur, wo echtes Nachdenken gebraucht wird.',
    modelLabel: 'Modell',
    modelInheritExplain: 'Kein eigenes Modell: nimmt, womit du Claude gerade nutzt.',
    customModel: 'Eigene Modell-ID in der Datei:',
    customModelReplace: 'Eine Auswahl oben ersetzt sie.',
    effortLabel: 'Denkaufwand',
    sessionLabel: 'Wie Sitzung',
    effortInheritExplain: 'Übernimmt den Denkaufwand der laufenden Sitzung.',

    skillsTitle: 'Skills vorladen',
    skillsExplain: 'Agents sehen deine Skills nicht automatisch. Vorgeladene Skills kommen beim Start komplett in seinen Kontext, also nur das, was er fast immer braucht.',
    skillsChosen: (n: number): string => `${n} gewählt`,

    rightsTitle: 'Rechte und Verhalten',
    rightsExplain: 'Wie viel er ohne Rückfrage darf und wie er arbeitet. Für Prüfer ist „Nur planen“ der sichere Standard.',
    rightsLabel: 'Rechte',
    rightsInheritExplain: 'Übernimmt die Rechte der Sitzung, aus der er gestartet wird.',
    memoryLabel: 'Gedächtnis',
    memoryOff: 'Aus',
    memoryOffExplain: 'Startet jedes Mal ohne Erinnerung.',
    maxTurnsLabel: 'Höchstens Runden',
    unlimitedPlaceholder: 'unbegrenzt',
    maxTurnsHint: 'Bremse gegen Endlosschleifen. Danach liefert er ein Teilergebnis.',
    worktreeLabel: 'Eigener Worktree',
    worktreeDescription: 'Arbeitet in einer Git-Kopie; gut, wenn mehrere Agents parallel ändern.',
    backgroundLabel: 'Im Hintergrund',
    backgroundDescription: 'Claude wartet nicht auf ihn und arbeitet weiter.',

    promptTitle: 'Anweisungen',
    promptExplain: 'Sein System-Prompt. Er kennt euer Gespräch nicht, sondern nur das hier und die Aufgabe, die Claude ihm gibt. Rolle, Vorgehen, Form der Antwort und Grenzen.',
    insertOutline: 'Gliederung einfügen',
    promptChars: (n: number): string => `${n} Zeichen · Markdown`,
    initialLabel: 'Erste Nachricht als Hauptagent',
    initialPlaceholder: 'optional, z. B. „Starte mit git status“',
    initialHint: 'Nur bei claude --agent: wird als erste Nachricht automatisch geschickt.',

    sideQuality: 'Qualitäts-Check',
    noFindings: 'Keine Hinweise.',
    sectionsNav: 'Abschnitte',
    filePreviewAria: 'Vorschau der Datei',
    filePreview: 'So wird die Datei',
    alsoPreserved: (keys: string): string => `Bleibt zusätzlich erhalten: ${keys}`
  },

  fields: {
    colorGroup: 'Farbe',
    noColor: 'Keine Farbe',
    presets: 'Schnellauswahl',
    inheritAllNote: 'Keine Auswahl heißt: der Agent erbt **alle** Tools der Sitzung. Hake Tools an, um ihn einzuschränken.',
    moreTools: 'Weitere Tools',
    moreToolsPlaceholder: 'z. B. mcp__github__get_issue, Bash(git diff *)',
    moreToolsHint: 'MCP-Tools und Muster mit Komma trennen. Tippfehler ignoriert Claude still, der Qualitäts-Check meldet sie.',
    filterSkills: 'Skills filtern',
    searchSkill: 'Skill suchen',
    noSkillMatch: 'Kein Skill passt zur Suche.',
    noSkillsFound: 'Keine Skills gefunden. Der Katalog lädt Skills aus ~/.claude/skills und Plugins.'
  },

  toolGroups: { read: 'Lesen', write: 'Schreiben', exec: 'Ausführen', web: 'Web', meta: 'Steuerung' },
  tools: {
    Read: { label: 'Dateien lesen', explain: 'Öffnet Dateien, auch Bilder und PDFs.' },
    Grep: { label: 'Inhalte suchen', explain: 'Sucht Text in vielen Dateien gleichzeitig.' },
    Glob: { label: 'Dateien finden', explain: 'Findet Dateien über Muster wie **/*.ts.' },
    Edit: { label: 'Dateien ändern', explain: 'Ersetzt gezielt Stellen in bestehenden Dateien.' },
    Write: { label: 'Dateien anlegen', explain: 'Schreibt Dateien neu oder komplett über.' },
    NotebookEdit: { label: 'Notebooks ändern', explain: 'Bearbeitet Zellen in Jupyter-Notebooks.' },
    Bash: { label: 'Befehle ausführen', explain: 'Führt Shell-Befehle aus: Tests, Git, Builds. Das mächtigste Tool.' },
    PowerShell: { label: 'PowerShell', explain: 'Führt PowerShell-Befehle aus (Windows).' },
    WebSearch: { label: 'Im Web suchen', explain: 'Sucht im Internet nach aktuellen Informationen.' },
    WebFetch: { label: 'Webseiten lesen', explain: 'Lädt eine Adresse und liest den Inhalt.' },
    Agent: { label: 'Weitere Agents starten', explain: 'Darf selbst Unter-Agents beauftragen.' },
    Skill: { label: 'Skills nutzen', explain: 'Darf Skills laden und befolgen.' },
    TodoWrite: { label: 'Aufgabenliste', explain: 'Führt eine eigene Checkliste für lange Aufgaben.' }
  },
  presets: {
    read: { label: 'Nur lesen', explain: 'Sicher für Prüfer und Recherche im Code' },
    edit: { label: 'Lesen und ändern', explain: 'Für Agents, die Code schreiben, ohne Befehle' },
    dev: { label: 'Entwickeln', explain: 'Ändern plus Tests und Git über die Shell' },
    web: { label: 'Web-Recherche', explain: 'Suchen und Lesen im Internet, Notizen schreiben' },
    all: { label: 'Alle erben', explain: 'Keine Einschränkung, inklusive MCP-Tools' }
  },
  options: {
    model: {
      inherit: { label: 'Wie Hauptsitzung', explain: 'Nimmt das Modell, mit dem du Claude gerade nutzt.' },
      haiku: { label: 'Haiku', explain: 'Schnell und günstig. Gut für Suchen, Zusammenfassen, einfache Prüfungen.' },
      sonnet: { label: 'Sonnet', explain: 'Ausgewogen. Guter Standard für die meisten Agents.' },
      opus: { label: 'Opus', explain: 'Stark bei schwierigen Aufgaben, langsamer und teurer.' },
      fable: { label: 'Fable', explain: 'Das größte Modell, für sehr anspruchsvolle Arbeit.' }
    },
    effort: {
      low: { label: 'Niedrig', explain: 'Wenig Nachdenken, schnelle Antworten.' },
      medium: { label: 'Mittel', explain: 'Etwas Abwägen vor dem Handeln.' },
      high: { label: 'Hoch', explain: 'Gründliches Nachdenken, gut für Reviews und Planung.' },
      xhigh: { label: 'Sehr hoch', explain: 'Für knifflige Fehler und Architekturfragen.' },
      max: { label: 'Maximum', explain: 'So viel Denken wie möglich, langsam und teuer.' }
    },
    permission: {
      default: { label: 'Nachfragen', explain: 'Fragt vor Änderungen und Befehlen. Ohne Zuschauer werden solche Schritte abgelehnt.' },
      acceptEdits: { label: 'Änderungen erlaubt', explain: 'Darf Dateien ohne Nachfrage ändern, fragt bei Befehlen.' },
      auto: { label: 'Automatisch', explain: 'Claude entscheidet mit einer Sicherheitsprüfung selbst, was erlaubt ist.' },
      dontAsk: { label: 'Nicht fragen', explain: 'Fragt nie; was nicht freigegeben ist, wird abgelehnt.' },
      plan: { label: 'Nur planen', explain: 'Liest und plant, ändert nichts. Gut für Prüfer.' },
      bypassPermissions: { label: 'Alles erlaubt', explain: 'Keine Rückfragen und keine Sperren. Nur in sicheren Ordnern verwenden.' }
    },
    memory: {
      user: { label: 'Für mich', explain: 'Merkt sich Dinge projektübergreifend in deinem Benutzerordner.' },
      project: { label: 'Im Projekt', explain: 'Gedächtnis liegt im Projekt und wandert mit Git mit.' },
      local: { label: 'Nur lokal', explain: 'Gedächtnis im Projekt, aber nicht in Git.' }
    }
  },

  lint: {
    nameMissing: 'Name fehlt. Claude ruft den Agent über diesen Namen auf.',
    nameFormat: 'Name nur aus Kleinbuchstaben, Ziffern und Bindestrichen, z. B. „code-reviewer“.',
    descriptionMissing: 'Beschreibung fehlt. Ohne sie weiß Claude nicht, wann der Agent passt.',
    descriptionShort: 'Beschreibung sehr kurz. Sag konkret, wofür und wann Claude ihn einsetzen soll.',
    descriptionLong: 'Beschreibung lang. Sie wird in jeder Sitzung mitgeladen; Details gehören in die Anweisungen.',
    noTrigger: 'Kein Auslöser erkennbar. Formuliere „Use when …“ bzw. „Einsetzen, wenn …“.',
    notProactive: 'Soll Claude ihn von selbst einsetzen, ergänze „Use proactively …“. Sonst nur, wenn du ihn nennst.',
    promptMissing: 'Anweisungen fehlen. Der Agent startet ohne Vorwissen; hier steht, wie er arbeitet.',
    promptShort: 'Anweisungen sehr knapp. Beschreibe Rolle, Vorgehen und die Form der Antwort.',
    promptLong: 'Anweisungen sehr lang. Wiederkehrendes Wissen eignet sich als Skill, den der Agent vorlädt.',
    noOutput: 'Keine Vorgabe zur Ausgabe. Sag, was zurückkommen soll (z. B. „Liste mit Datei:Zeile, höchstens 200 Wörter“), sonst flutet er den Hauptkontext.',
    noLimits: 'Keine Grenzen genannt. Ein Abschnitt „Grenzen“ verhindert ungewollte Änderungen.',
    inheritsAllTools: 'Erbt alle Tools. Weniger Tools machen den Agent sicherer und zielstrebiger.',
    manyTools: 'Viele Tools. Gib nur, was der Agent für seine Aufgabe braucht.',
    unknownTools: (names: string): string => `Unbekannte Tools: ${names}. Tippfehler werden still ignoriert.`,
    reviewWrites: 'Klingt nach Prüfen oder Suchen, darf aber ändern. „Nur lesen“ oder Modus „Nur planen“ wäre sicherer.',
    bypass: '„Alles erlaubt“ schaltet alle Sicherheitsabfragen ab. Nur in Ordnern nutzen, in denen nichts kaputtgehen kann.',
    haikuTip: 'Reine Suche läuft mit Haiku schneller und günstiger.',
    manySkills: 'Jeder vorgeladene Skill kommt komplett in den Kontext. Nur das Nötigste vorladen.'
  },

  service: {
    notMarkdown: (path: string): string => `„${path}“ ist keine Markdown-Datei.`,
    pluginCopyOnly: 'Dieser Agent gehört zu einem Plugin und lässt sich nur als Kopie speichern.',
    deleteOnlyOwn: 'Nur eigene Agents aus einem .claude/agents-Ordner lassen sich löschen.',
    fileLabel: (path: string): string => `Agent-Datei ${path}`,
    reloadHint: 'Liste neu laden.',
    ideaTooShort: 'Beschreibe in ein, zwei Sätzen, was der Agent tun soll.',
    currentMissing: 'Zum Verbessern fehlt der aktuelle Agent.',
    pickProject: 'Projekt auswählen: Projekt-Agents liegen im Ordner eines Projekts aus der Projektliste.',
    noJson: 'Die Antwort enthielt kein JSON-Objekt',
    unreadableJson: (detail: string): string => `JSON nicht lesbar: ${detail}`,
    notObject: 'Die Antwort war kein Objekt',
    incompleteAnswer: 'Name, Beschreibung oder Anweisungen fehlen in der Antwort'
  },

  store: {
    discardTitle: 'Änderungen verwerfen?',
    discardMessage: 'Der Agent ist noch nicht gespeichert.',
    discard: 'Verwerfen',
    saved: (name: string): string => `Agent „${name}“ gespeichert`,
    deleteTitle: (name: string): string => `Agent „${name}“ löschen?`,
    deleteMessage: (path: string): string => `Die Datei ${path} wird entfernt. Automatisierungen mit diesem Agent laufen danach nicht mehr.`,
    delete: 'Löschen',
    deleted: (name: string): string => `Agent „${name}“ gelöscht`
  },

  promptOutline: [
    'Du bist <Rolle in einem Satz>.',
    '',
    '## Aufgabe',
    '<Was du erledigst und was am Ende vorliegen soll.>',
    '',
    '## Vorgehen',
    '1. <Erster Schritt>',
    '2. <Zweiter Schritt>',
    '3. <Prüfen, ob das Ergebnis stimmt>',
    '',
    '## Ausgabe',
    '<Form der Antwort an den Hauptagenten: z. B. kurze Liste mit Datei:Zeile, höchstens 200 Wörter.>',
    '',
    '## Grenzen',
    '- <Was du nie tust, z. B. nichts committen, keine Dateien außerhalb von src/ ändern>'
  ].join('\n'),

  templates: {
    reviewer: {
      label: 'Code-Prüfer',
      explain: 'Liest Änderungen und meldet Fehler, ändert nichts',
      description: 'Prüft frische Code-Änderungen auf Fehler, Sicherheitslücken und unklare Stellen. Use proactively nach größeren Änderungen, bevor committet wird.',
      prompt: [
        'Du bist ein erfahrener Code-Prüfer. Du änderst nichts, du findest Probleme.',
        '',
        '## Vorgehen',
        '1. Hole dir die Änderungen mit `git diff` (und `git diff --staged`).',
        '2. Lies die betroffenen Dateien im Zusammenhang, nicht nur die geänderten Zeilen.',
        '3. Suche nach echten Fehlern: falsche Logik, fehlende Fehlerbehandlung, Sicherheitslücken, Randfälle.',
        '4. Prüfe jeden Fund, bevor du ihn meldest. Keine Vermutungen als Fakten.',
        '',
        '## Ausgabe',
        'Eine Liste, schwerste zuerst. Je Fund: `Datei:Zeile`, ein Satz zum Problem, ein Satz zur Lösung.',
        'Keine Stilfragen, kein Lob. Findest du nichts Ernstes, sag genau das in einem Satz.',
        '',
        '## Grenzen',
        '- Keine Dateien ändern, nichts committen.'
      ].join('\n')
    },
    researcher: {
      label: 'Code-Erkunder',
      explain: 'Sucht schnell im Projekt und fasst zusammen',
      description: 'Findet heraus, wo und wie etwas im Code umgesetzt ist, und liefert eine kurze Zusammenfassung mit Fundstellen. Use proactively, wenn viele Dateien durchsucht werden müssen.',
      prompt: [
        'Du durchsuchst Code und berichtest knapp, was du gefunden hast.',
        '',
        '## Vorgehen',
        '1. Suche breit mit Glob und Grep, dann lies nur die relevanten Stellen.',
        '2. Folge Aufrufen bis zur eigentlichen Umsetzung.',
        '',
        '## Ausgabe',
        'Höchstens 150 Wörter plus eine Liste `Datei:Zeile – was dort passiert`. Keine ganzen Dateien zurückgeben.'
      ].join('\n')
    },
    tester: {
      label: 'Test-Schreiber',
      explain: 'Schreibt und startet Tests für neuen Code',
      description: 'Schreibt fehlende Tests für neuen oder geänderten Code und führt sie aus. Use when neue Funktionen ohne Tests entstanden sind.',
      prompt: [
        'Du schreibst Tests im Stil des Projekts.',
        '',
        '## Vorgehen',
        '1. Finde heraus, welches Test-Framework und welche Muster das Projekt nutzt (vorhandene Tests lesen).',
        '2. Schreibe Tests für das Verhalten, nicht für Implementierungsdetails. Randfälle zuerst.',
        '3. Führe die Tests aus. Schlägt ein Test fehl, prüfe, ob der Test oder der Code falsch ist.',
        '',
        '## Ausgabe',
        'Welche Tests du angelegt hast, das Ergebnis des Testlaufs und gefundene Fehler im Code.',
        '',
        '## Grenzen',
        '- Produktionscode nicht ändern, nur melden.'
      ].join('\n')
    },
    web: {
      label: 'Web-Rechercheur',
      explain: 'Recherchiert im Internet mit Quellen',
      description: 'Recherchiert eine Frage im Internet und liefert eine belegte Antwort mit Quellen. Use when aktuelle Informationen, Preise oder Dokumentation gebraucht werden.',
      prompt: [
        'Du recherchierst gründlich und erfindest nichts.',
        '',
        '## Vorgehen',
        '1. Suche mit mehreren Formulierungen, deutsch und englisch.',
        '2. Lies die besten Treffer selbst. Bevorzuge offizielle Quellen und aktuelle Daten.',
        '3. Widersprechen sich Quellen, nenne beide.',
        '',
        '## Ausgabe',
        'Antwort in höchstens 200 Wörtern, danach die Quellen als Liste mit Link und Datum.',
        '',
        '## Grenzen',
        '- Nur Links nennen, die du wirklich geöffnet hast.'
      ].join('\n')
    },
    docs: {
      label: 'Doku-Schreiber',
      explain: 'Hält README und Doku aktuell',
      description: 'Aktualisiert README und Dokumentation passend zum aktuellen Code. Use when Funktionen, Befehle oder Einstellungen geändert wurden.',
      prompt: [
        'Du hältst die Dokumentation eines Projekts aktuell.',
        '',
        '## Vorgehen',
        '1. Lies README und vorhandene Doku, dann den Code, um den sie geht.',
        '2. Korrigiere, was nicht mehr stimmt. Ergänze nur, was wirklich fehlt.',
        '3. Behalte Ton, Sprache und Aufbau der bestehenden Doku bei.',
        '',
        '## Ausgabe',
        'Liste der geänderten Dateien mit einem Satz je Änderung.',
        '',
        '## Grenzen',
        '- Keinen Code ändern. Keine neuen Doku-Dateien ohne Grund.'
      ].join('\n')
    }
  },

  guide: {
    navAria: 'Inhalt',
    toc: { what: 'Was ein Agent ist', compare: 'Agent, Skill, Befehl', decide: 'Wie Claude entscheidet', anatomy: 'Aufbau einer Datei', rules: 'Regeln für gute Agents', settings: 'Alle Einstellungen', automate: 'Automatisieren' },
    what: {
      p1: 'Ein Agent (in Claude Code „Subagent“) ist ein **Spezialist mit eigenem Kontextfenster**. Claude gibt ihm eine Teilaufgabe, er arbeitet sie mit seinen eigenen Anweisungen, Tools und seinem Modell ab und liefert nur das Ergebnis zurück. Die Zwischenschritte, also hunderte gelesene Dateien oder lange Logs, bleiben bei ihm.',
      p2: 'Dadurch bleibt die Hauptsitzung kurz und klar. Agents eignen sich für Aufgaben, die viel lesen und wenig zurückgeben: Code durchsuchen, Änderungen prüfen, Tests laufen lassen, im Web recherchieren.'
    },
    compare: {
      colWhat: 'Was es ist',
      colWhen: 'Wann nutzen',
      rows: [
        ['Agent', 'Eigener Mitarbeiter mit eigenem Kontext, Tools und Modell', 'Abgeschlossene Teilaufgabe, deren Zwischenschritte niemand sehen muss'],
        ['Skill', 'Wissen und Anleitung, die Claude bei Bedarf selbst lädt', 'Wiederkehrendes Vorgehen, das Claude im selben Gespräch befolgen soll'],
        ['Befehl', 'Gespeicherter Prompt, den du mit /name startest', 'Etwas, das du selbst regelmäßig anstößt']
      ] as readonly (readonly [string, string, string])[]
    },
    decide: {
      auto: '**Automatisch:** Claude kennt Name und Beschreibung aller Agents. Passt eine Aufgabe zur Beschreibung, gibt Claude sie ab. Mit „Use proactively“ in der Beschreibung tut er das deutlich eher.',
      targeted: '**Gezielt:** Du schreibst `@agent-name` oder „Nutze den Agent code-reviewer für …“.',
      session: '**Als ganze Sitzung:** `claude --agent name` startet Claude direkt als dieser Agent, mit seinen Tools und Anweisungen.',
      precedence: 'Liegen zwei Agents mit gleichem Namen vor, gewinnt der aus dem Projekt vor dem eigenen und der eigene vor dem aus einem Plugin.'
    },
    anatomy: {
      intro: 'Ein Agent ist eine Markdown-Datei in `~/.claude/agents/` (für alle Projekte) oder `<Projekt>/.claude/agents/`. Oben steht das Frontmatter mit den Einstellungen, darunter die Anweisungen.',
      parts: [
        { code: '---\nname: code-reviewer', title: 'Name', text: 'Eindeutig, Kleinbuchstaben und Bindestriche. Darüber rufst du ihn auf: @agent-code-reviewer.' },
        {
          code: 'description: "Prüft Code-Änderungen auf Fehler.\n  Use proactively nach größeren Änderungen."',
          title: 'Beschreibung',
          text: 'Der Auslöser. Claude liest nur diese Zeile, um zu entscheiden, ob er passt. Was und wann, nicht wie.'
        },
        { code: 'tools: Read, Grep, Glob, Bash', title: 'Tools', text: 'Erlaubte Werkzeuge. Fehlt die Zeile, erbt er alle. Ein Prüfer braucht kein Write.' },
        { code: 'model: sonnet\neffort: high\npermissionMode: plan\n---', title: 'Modell und Rechte', text: 'Optional. Ohne Angabe übernimmt er, was die Sitzung nutzt.' },
        {
          code: 'Du bist ein erfahrener Code-Prüfer.\n\n## Vorgehen\n1. git diff lesen …\n\n## Ausgabe\nListe mit Datei:Zeile …\n\n## Grenzen\n- Nichts ändern.',
          title: 'Anweisungen',
          text: 'Sein System-Prompt. Er sieht euer Gespräch nicht, nur das hier und die Aufgabe, die Claude ihm mitgibt.'
        }
      ] as readonly { readonly code: string; readonly title: string; readonly text: string }[]
    },
    rules: {
      items: [
        { title: 'Eine Aufgabe pro Agent', text: '„Prüft Code“ und „schreibt Doku“ sind zwei Agents. Allzweck-Agents werden nie zuverlässig ausgewählt.' },
        { title: 'Die Beschreibung ist ein Auslöser', text: 'Formuliere, wann er passt: „Use when …“, „Use proactively nach …“. Details zum Vorgehen gehören in die Anweisungen, denn die Beschreibung wird in jeder Sitzung mitgeladen.' },
        { title: 'So wenige Tools wie möglich', text: 'Least Privilege: Leser bekommen Read, Grep, Glob. Weniger Tools heißt weniger Risiko und zielstrebigeres Arbeiten.' },
        { title: 'Die Antwort festlegen', text: 'Sag genau, was zurückkommt: „Liste mit Datei:Zeile, höchstens 200 Wörter“. Sonst flutet er den Kontext des Hauptagenten, und genau das soll ein Agent verhindern.' },
        { title: 'Alles Nötige mitgeben', text: 'Er startet ohne Vorwissen. Projektregeln, Pfade und Befehle stehen in den Anweisungen oder in einem vorgeladenen Skill.' },
        { title: 'Das passende Modell', text: 'Haiku für Suchen und Zusammenfassen, Sonnet als Standard, Opus nur für schwere Denkarbeit. Das spart Kontingent.' },
        { title: 'Grenzen nennen', text: 'Was er nie tut: committen, pushen, Dateien außerhalb eines Ordners ändern. Für Prüfer zusätzlich „Nur planen“.' }
      ] as readonly { readonly title: string; readonly text: string }[],
      note: 'Der Qualitäts-Check im Builder prüft die meisten dieser Regeln live mit.'
    },
    settings: {
      colField: 'Feld',
      colMeaning: 'Bedeutung',
      colAdvice: 'Empfehlung',
      rows: [
        ['name', 'Name und Aufruf', 'Pflicht. Kurz, beschreibt die Rolle.'],
        ['description', 'Wann Claude ihn einsetzt', 'Pflicht. 1–3 Sätze mit Auslöser.'],
        ['tools', 'Erlaubte Tools', 'Weglassen erbt alle; sonst Liste.'],
        ['disallowedTools', 'Gesperrte Tools', 'Wenn fast alles erlaubt sein soll, außer z. B. Write.'],
        ['model', 'Modell', 'haiku, sonnet, opus, fable oder inherit.'],
        ['effort', 'Denkaufwand', 'low bis max; hoch für Prüfen und Planen.'],
        ['permissionMode', 'Rechte ohne Rückfrage', 'plan für Prüfer, acceptEdits für Schreiber.'],
        ['maxTurns', 'Höchstzahl an Schritten', 'Bremse gegen Endlosschleifen.'],
        ['skills', 'Vorgeladene Skills', 'Nur, was er fast immer braucht.'],
        ['memory', 'Gedächtnis über Läufe', 'project, wenn er aus früheren Läufen lernen soll.'],
        ['isolation', 'Eigener Git-Worktree', 'worktree, wenn mehrere Agents parallel ändern.'],
        ['background', 'Läuft im Hintergrund', 'Für lange Aufgaben, auf die Claude nicht warten soll.'],
        ['color', 'Farbe in der Oberfläche', 'Nur Anzeige.'],
        ['hooks, mcpServers', 'Hooks und eigene MCP-Server', 'Für Fortgeschrittene; der Builder lässt sie unverändert.']
      ] as readonly (readonly [string, string, string])[]
    },
    automate: {
      p1: 'Jeder Agent kann ohne dich laufen. Im Bereich **Automatisierung** legst du fest, welcher Agent wann in welchem Projekt welchen Auftrag bekommt, etwa werktags um 8 Uhr „Prüfe die Änderungen von gestern“. Die App startet ihn dann mit `claude -p --agent name` auf dem gewählten Rechner, speichert das Ergebnis und meldet sich, wenn er fertig ist. n8n oder andere Zusatzprogramme brauchst du dafür nicht.',
      p2: 'Geplante Läufe starten, solange die App geöffnet ist. Ist das Kontingent im 5-Stunden-Fenster fast aufgebraucht, werden sie übersprungen statt es leerzufahren.',
      toAutomations: 'Zur Automatisierung'
    }
  }
}
