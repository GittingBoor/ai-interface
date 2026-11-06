import type { Messages } from '../messages'

export const assistant: Messages['assistant'] = {
  title: 'Assistant',
  plan: 'Opus 5.5 · Abonnement',
  newChat: 'Nouveau chat',
  resizeAria: 'Largeur de l’assistant',
  resizeTitle: 'Faire glisser pour modifier la largeur',
  heading: 'Qu’y a-t-il à faire ?',
  intro: 'L’assistant connaît vos projets, vos TODO et le quota. Avant de créer ou d’écrire quoi que ce soit, il vous demande confirmation.',
  suggestions: ['Créer un nouveau projet', 'Où en est mon quota ?', 'Qu’est-ce qui tourne en ce moment sur mes appareils ?'],
  composer: {
    aria: 'Message à l’assistant',
    placeholder: 'Message à l’assistant',
    running: 'Réponse en cours …',
    stop: 'Arrêter la réponse',
    send: 'Envoyer (Entrée)',
    hint: 'Entrée envoie · Maj+Entrée nouvelle ligne · Le microphone dicte'
  },
  typing: 'L’assistant répond …',
  confirm: { waiting: 'En attente de vous', preview: 'Aperçu', run: 'Exécuter', deny: 'Refuser', allowed: 'Autorisé', denied: 'Refusé' },
  toolLabels: {
    list_projects: 'Lit les projets',
    list_categories: 'Lit les types de projet',
    list_project_folders: 'Lit les dossiers de projets',
    usage_summary: 'Analyse la consommation',
    quota: 'Vérifie le quota',
    list_todos: 'Lit les TODO',
    devices_status: 'Interroge les appareils',
    list_skills: 'Lit les skills',
    app_settings: 'Lit les paramètres',
    create_project_folder: 'Crée le dossier du projet',
    write_obsidian_note: 'Écrit une note Obsidian',
    add_project: 'Ajoute le projet',
    create_category: 'Crée le type',
    add_todo: 'Ajoute un TODO'
  },
  previews: {
    folder: (dir: string): string => `Dossier : ${dir}`,
    files: 'Fichiers :',
    gitInit: 'Ensuite : git init -b main',
    note: (path: string): string => `Note : ${path}`,
    project: (name: string, host: string, path: string, category: string, color: string, icon: string): string =>
      `Projet « ${name} » (${host}) → ${path}
Type : ${category || 'aucun'} · Couleur ${color}${icon ? ` · Icône ${icon}` : ''}`,
    category: (name: string, color: string, icon: string): string => `Nouveau type « ${name} » · Couleur ${color}${icon ? ` · Icône ${icon}` : ''}`,
    todo: (section: string, text: string): string => `TODO dans « ${section} » : ${text}`
  },
  confirmTitles: {
    create_project_folder: 'Créer le dossier du projet',
    write_obsidian_note: 'Écrire une note Obsidian',
    add_project: 'Ajouter le projet',
    create_category: 'Créer le type',
    add_todo: 'Ajouter un TODO'
  }
}
