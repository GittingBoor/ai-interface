export const assistant = {
  title: 'Assistent',
  plan: 'Opus 5.5 · Abo',
  newChat: 'Neuer Chat',
  resizeAria: 'Breite des Assistenten',
  resizeTitle: 'Ziehen zum Ändern der Breite',
  heading: 'Was steht an?',
  intro: 'Der Assistent kennt deine Projekte, TODOs und das Kontingent. Bevor er etwas anlegt oder schreibt, fragt er nach.',
  suggestions: ['Neues Projekt anlegen', 'Wie steht mein Kontingent?', 'Was läuft gerade auf meinen Geräten?'] as readonly string[],
  composer: {
    aria: 'Nachricht an den Assistenten',
    placeholder: 'Nachricht an den Assistenten',
    running: 'Antwort läuft …',
    stop: 'Antwort stoppen',
    send: 'Senden (Enter)',
    hint: 'Enter senden · Shift+Enter neue Zeile · Mikrofon diktiert'
  },
  typing: 'Der Assistent antwortet …',
  confirm: { waiting: 'Wartet auf dich', preview: 'Vorschau', run: 'Ausführen', deny: 'Ablehnen', allowed: 'Freigegeben', denied: 'Abgelehnt' },
  toolLabels: {
    list_projects: 'Liest Projekte',
    list_categories: 'Liest Projektarten',
    list_project_folders: 'Liest Projektordner',
    usage_summary: 'Wertet Verbrauch aus',
    quota: 'Prüft Kontingent',
    list_todos: 'Liest TODOs',
    devices_status: 'Fragt die Geräte ab',
    list_skills: 'Liest Skills',
    app_settings: 'Liest Einstellungen',
    create_project_folder: 'Legt Projektordner an',
    write_obsidian_note: 'Schreibt Obsidian-Notiz',
    add_project: 'Trägt Projekt ein',
    create_category: 'Legt Art an',
    add_todo: 'Fügt TODO hinzu'
  } as Readonly<Record<string, string>>,
  previews: {
    folder: (dir: string): string => `Ordner: ${dir}`,
    files: 'Dateien:',
    gitInit: 'Danach: git init -b main',
    note: (path: string): string => `Notiz: ${path}`,
    project: (name: string, host: string, path: string, category: string, color: string, icon: string): string =>
      `Projekt „${name}“ (${host}) → ${path}
Art: ${category || 'ohne'} · Farbe ${color}${icon ? ` · Symbol ${icon}` : ''}`,
    category: (name: string, color: string, icon: string): string => `Neue Art „${name}“ · Farbe ${color}${icon ? ` · Symbol ${icon}` : ''}`,
    todo: (section: string, text: string): string => `TODO in „${section}“: ${text}`
  },
  confirmTitles: {
    create_project_folder: 'Projektordner anlegen',
    write_obsidian_note: 'Obsidian-Notiz schreiben',
    add_project: 'Projekt eintragen',
    create_category: 'Art anlegen',
    add_todo: 'TODO hinzufügen'
  } as Readonly<Record<string, string>>
}
