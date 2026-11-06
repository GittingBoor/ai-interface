import type { Messages } from '../messages'

export const howto: Messages['howto'] = {
  searchLabel: 'Rechercher des raccourcis',
  searchPlaceholder: 'Rechercher des raccourcis …',
  sectionAria: 'Raccourcis et astuces',
  clearSearch: 'Effacer la recherche',
  nothingFound: (query: string): string => `Aucun résultat pour « ${query} ».`,
  groups: { speech: 'Saisie vocale', app: 'AI Interface', windows: 'Windows', claude: 'Claude Code' },
  keys: { mic: 'Microphone', arrow: 'Flèche', star: 'Étoile' },
  entries: {
    dictate: { title: 'Dicter', description: 'Un clic lance l’enregistrement, un second clic reconnaît la parole et insère le texte. Rien n’est jamais envoyé automatiquement.' },
    discard: { title: 'Annuler l’enregistrement', description: 'Interrompt une dictée en cours sans rien insérer.' },
    dictateKeys: { title: 'Dicter au clavier', description: 'Démarre/arrête la dictée pour l’assistant (s’il a le focus) ou le terminal actif. À activer ci-dessus.' },
    switchModel: { title: 'Changer de modèle', description: 'Flèche à côté du microphone : Rapide, Standard ou Précis.' },
    windowsDictation: { title: 'Dictée Windows', description: 'Saisie vocale dans tout le système, pour n’importe quel champ de texte, sans configuration ; reconnaît moins bien que Whisper.' },
    voiceMode: { title: 'Mode vocal de Claude Code', description: 'Si votre version de Claude Code l’a : dicter directement dans le terminal via le service d’Anthropic.' },
    palette: { title: 'Recherche / palette de commandes', description: 'Trouver des sections, des projets et des actions.' },
    assistant: { title: 'Assistant', description: 'Afficher ou masquer l’assistant IA, y compris depuis le terminal.' },
    areas: { title: 'Sections', description: (a: string, b: string, c: string): string => `Aller directement à ${a}, ${b}, ${c} … (les chiffres figurent dans la barre latérale).` },
    newTerminal: { title: 'Nouveau terminal', description: 'Ouvrir la boîte de dialogue de démarrage dans la section Terminal.' },
    newLine: { title: 'Nouvelle ligne dans le terminal', description: (ctrlEnter: string): string => `Saut de ligne dans Claude Code au lieu d’envoyer (${ctrlEnter} fonctionne aussi).` },
    pasteImage: { title: 'Image dans le terminal', description: 'Une image du presse-papiers est enregistrée et insérée sous forme de chemin.' },
    starSource: {
      title: 'Source dans la barre latérale',
      description: (sources: string, websites: string, ai: string): string =>
        `Dans « ${sources} », marquez une page web d’une étoile : elle apparaît alors sous « ${websites} ». Les pages lues par Claude sont classées par l’app sous « ${ai} ».`
    },
    clipboardHistory: { title: 'Historique du presse-papiers', description: 'Choisir parmi les textes et images copiés précédemment.' },
    screenshot: { title: 'Capture d’écran partielle', description: (paste: string): string => `Copie la capture dans le presse-papiers, puis collez-la dans le terminal avec ${paste}.` },
    emoji: { title: 'Emojis et caractères spéciaux', description: 'Sélecteur d’emojis dans n’importe quel champ de texte.' },
    switchMode: { title: 'Changer de mode', description: 'Basculer entre le mode normal, l’acceptation automatique et le mode plan.' },
    rewind: { title: 'Revenir en arrière', description: 'Retourner à un message précédent et repartir de là.' },
    commands: { title: 'Commandes', description: 'Commandes slash et skills, p. ex. /help, /clear, /compact.' },
    mention: { title: 'Mentionner un fichier', description: 'Insérer un chemin de fichier dans le message avec la saisie semi-automatique.' },
    interrupt: { title: 'Interrompre la réponse', description: 'Arrêter la réponse en cours ; l’historique est conservé.' }
  }
}
