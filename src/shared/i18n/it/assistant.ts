import type { Messages } from '../messages'

export const assistant: Messages['assistant'] = {
  title: 'Assistente',
  plan: 'Opus 5.5 · Abbonamento',
  newChat: 'Nuova chat',
  resizeAria: 'Larghezza dell’assistente',
  resizeTitle: 'Trascina per cambiare la larghezza',
  heading: 'Cosa c’è da fare?',
  intro: 'L’assistente conosce i tuoi progetti, i TODO e la quota. Prima di creare o scrivere qualcosa, ti chiede conferma.',
  suggestions: ['Crea un nuovo progetto', 'A che punto è la mia quota?', 'Cosa sta girando ora sui miei dispositivi?'],
  composer: {
    aria: 'Messaggio all’assistente',
    placeholder: 'Messaggio all’assistente',
    running: 'Risposta in corso …',
    stop: 'Ferma la risposta',
    send: 'Invia (Invio)',
    hint: 'Invio per inviare · Maiusc+Invio per andare a capo · Il microfono detta'
  },
  typing: 'L’assistente sta rispondendo …',
  confirm: { waiting: 'In attesa di te', preview: 'Anteprima', run: 'Esegui', deny: 'Rifiuta', allowed: 'Approvato', denied: 'Rifiutato' },
  toolLabels: {
    list_projects: 'Legge i progetti',
    list_categories: 'Legge i tipi di progetto',
    list_project_folders: 'Legge le cartelle dei progetti',
    usage_summary: 'Analizza l’utilizzo',
    quota: 'Controlla la quota',
    list_todos: 'Legge i TODO',
    devices_status: 'Interroga i dispositivi',
    list_skills: 'Legge le skill',
    app_settings: 'Legge le impostazioni',
    create_project_folder: 'Crea la cartella del progetto',
    write_obsidian_note: 'Scrive una nota Obsidian',
    add_project: 'Aggiunge il progetto',
    create_category: 'Crea il tipo',
    add_todo: 'Aggiunge un TODO'
  },
  previews: {
    folder: (dir: string): string => `Cartella: ${dir}`,
    files: 'File:',
    gitInit: 'Poi: git init -b main',
    note: (path: string): string => `Nota: ${path}`,
    project: (name: string, host: string, path: string, category: string, color: string, icon: string): string =>
      `Progetto «${name}» (${host}) → ${path}
Tipo: ${category || 'nessuno'} · Colore ${color}${icon ? ` · Icona ${icon}` : ''}`,
    category: (name: string, color: string, icon: string): string => `Nuovo tipo «${name}» · Colore ${color}${icon ? ` · Icona ${icon}` : ''}`,
    todo: (section: string, text: string): string => `TODO in «${section}»: ${text}`
  },
  confirmTitles: {
    create_project_folder: 'Crea la cartella del progetto',
    write_obsidian_note: 'Scrivi una nota Obsidian',
    add_project: 'Aggiungi il progetto',
    create_category: 'Crea il tipo',
    add_todo: 'Aggiungi un TODO'
  }
}
