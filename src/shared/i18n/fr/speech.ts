import type { Messages } from '../messages'

export const speech: Messages['speech'] = {
  title: 'Saisie vocale',
  unsupportedDescription: 'Configurée automatiquement sous Windows uniquement. Ici, utilisez Win+H ou /voice.',
  description: 'whisper.cpp s’exécute en local sur la carte graphique (Vulkan). Rien ne quitte votre PC.',
  remove: 'Supprimer',
  load: 'Télécharger',
  removeAria: (model: string): string => `Supprimer le modèle ${model}`,
  loadAria: (model: string): string => `Télécharger le modèle ${model}`,
  microphone: 'Microphone',
  windowsDefault: 'Par défaut de Windows',
  microphoneUnnamed: 'Microphone (le nom apparaît après le premier enregistrement)',
  hotkeyLabel: (keys: string): string => `Raccourci ${keys}`,
  hotkeyDescription: 'Démarre et arrête la dictée sans souris. Désactivé par défaut.',
  mic: {
    stop: (shortcut: string): string => `Terminer l’enregistrement${shortcut} · Échap annule`,
    transcribing: 'Reconnaissance en cours …',
    dictate: (shortcut: string): string => `Dicter${shortcut}`,
    chooseModel: 'Choisir le modèle vocal',
    modelMenu: 'Modèle vocal',
    notLoaded: (mb: number): string => `Non téléchargé · ${mb} Mo`
  },
  setup: {
    title: 'Configurer la saisie vocale',
    modelPrefix: 'Modèle',
    downloadInfo: (mb: number): string => `Téléchargement d’environ ${mb} Mo. Ensuite, tout fonctionne entièrement hors ligne.`,
    downloadInfoWithEngine: (mb: number): string => `Téléchargement d’environ ${mb} Mo (whisper.cpp avec Vulkan inclus). Ensuite, tout fonctionne entièrement hors ligne.`,
    progressAria: 'Progression du téléchargement',
    progressValue: (percent: number, received: number, total: number): string => `${percent} %, ${received} sur ${total} Mo`,
    progressText: (percent: number, received: number, total: number): string => `${percent} % · ${received} / ${total} Mo`,
    later: 'Plus tard',
    download: 'Télécharger'
  },
  nothingRecognized: 'Rien reconnu',
  targetClosed: 'Le terminal n’est plus ouvert, texte écarté',
  processingFailed: 'L’enregistrement n’a pas pu être traité',
  recorder: {
    startFailed: 'L’enregistrement n’a pas pu démarrer',
    micHint: 'Windows : vérifiez Paramètres > Confidentialité et sécurité > Microphone.',
    denied: 'Accès au microphone refusé',
    notFound: 'Aucun microphone trouvé',
    notFoundHint: (micHint: string): string => `Choisissez un autre microphone dans l’onglet Commandes. ${micHint}`,
    openFailed: 'Le microphone n’a pas pu être ouvert'
  }
}
