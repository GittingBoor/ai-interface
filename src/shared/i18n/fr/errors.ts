import type { Messages } from '../messages'

export const errors: Messages['errors'] = {
  hostUnreachable: { message: (host, cause) => `${host} est injoignable : ${cause}`, hint: 'Vérifiez le réseau et les paramètres SSH.' },
  notFound: (what) => `${what} est introuvable.`,
  validationHint: 'Corrigez la saisie et réessayez.',
  quotaFormat: {
    message: (detail) => `Format de la réponse de quota inconnu (${detail}).`,
    hint: 'Mettez à jour Claude Code ; d’ici là, l’application n’affiche aucune valeur plutôt que des valeurs erronées.'
  },
  summaryFailed: {
    message: (name, cause) => `Échec du résumé de « ${name} » : ${cause}`,
    hint: 'Vérifiez Claude Code (connecté, quota disponible) et relancez ; les résumés terminés sont conservés.'
  },
  claudeCli: {
    message: (detail) => `Impossible d’exécuter Claude Code (${detail}).`,
    hint: 'Vérifiez que Claude Code est installé et connecté (lancez claude dans le terminal).'
  },
  gitFailed: { message: (action, cause) => `Échec de ${action} : ${cause}`, hint: 'Vérifiez que Git est installé et que le dossier est accessible en écriture.' },
  speechUnsupported: { message: 'La saisie vocale n’est configurée que sous Windows.', hint: 'Utilisez-la sous Windows, ou utilisez Win+H ou /voice dans Claude Code.' },
  whisperNotInstalled: { message: (model) => `La reconnaissance vocale « ${model} » n’est pas configurée.`, hint: 'Téléchargez le modèle dans l’onglet Contrôle.' },
  whisperStart: {
    message: (detail) => `Impossible de démarrer la reconnaissance vocale (${detail}).`,
    hint: 'Mettez à jour le pilote graphique ou choisissez un modèle plus petit dans Contrôle ; les détails sont dans le journal.'
  },
  transcription: { message: (detail) => `Échec de la reconnaissance vocale (${detail}).`, hint: 'Parlez de nouveau ; si cela se reproduit, redémarrez l’application.' },
  emptyTranscript: { message: 'Rien n’a été reconnu.', hint: 'Rapprochez-vous du micro et parlez un peu plus fort.' },
  download: { message: (what, detail) => `Échec du téléchargement de ${what} (${detail}).`, hint: 'Vérifiez la connexion Internet et réessayez.' },
  downloadChecksum: {
    message: (what) => `La somme de contrôle de ${what} ne correspond pas, le fichier a été supprimé.`,
    hint: 'Téléchargez-le de nouveau ; si cela se répète, la source a été modifiée.'
  },
  downloadCancelled: { message: 'Téléchargement annulé.' },
  speechBusy: { message: (model) => `« ${model} » est déjà en cours de téléchargement.`, hint: 'Attendez la fin du téléchargement ou annulez-le.' },
  privacyLocked: { message: 'Le mode privé est actif.', hint: 'Déverrouillez-le avec le code PIN dans les paramètres.' },
  wrongPin: { message: 'Code PIN incorrect.', tooMany: (waitSec) => `Trop de tentatives échouées, patientez ${waitSec} s.`, hint: 'Saisissez à nouveau le code PIN.' },
  invalidPin: { message: 'Le code PIN doit comporter de 4 à 12 chiffres.', hint: 'Utilisez uniquement des chiffres.' },
  pinRequired: { message: 'Aucun code PIN n’est encore défini pour le mode privé.', hint: 'Définissez un nouveau code PIN : cela déverrouille le mode privé.' },
  updateFailed: {
    message: (step, detail) => `Échec de la mise à jour à l’étape « ${step} » (${detail}).`,
    hint: 'Exécutez manuellement git pull et npm run dist:win dans le dépôt ; les détails sont dans le journal.'
  },
  terminalBusy: { message: (terminal) => `${terminal} travaille encore.`, hint: 'Attendez la ligne d’état « [AI Interface] … terminé », puis renvoyez.' },
  orchestratorUnavailable: {
    message: (detail) => `Orchestrateur indisponible : ${detail}`,
    hint: 'Dans les paramètres, sous « Orchestrateur », vérifiez qu’il est activé ; les détails sont dans le journal.',
    disabled: 'désactivé dans les paramètres.'
  },
  agentAssist: {
    message: (detail: string): string => `Claude n’a pas fourni de brouillon d’agent exploitable : ${detail}`,
    hint: 'Décrivez l’idée plus précisément et réessayez.'
  },
  agentExists: {
    message: (name: string): string => `Un agent « ${name} » existe déjà à cet emplacement.`,
    hint: 'Choisissez un autre nom ou modifiez l’agent existant.'
  },
  automationRun: {
    message: (detail: string): string => `L’exécution a échoué : ${detail}`,
    hint: 'Vérifiez la sortie dans l’historique ; Claude fonctionne-t-il sur cet ordinateur (connecté, quota disponible) ?'
  },
  ipc: { message: (detail: string): string => `La connexion au processus d’arrière-plan a échoué : ${detail}`, hint: 'Redémarrez l’app ; les détails sont dans le journal.' },
  unknown: 'Erreur inconnue',
  unexpectedHint: 'Les détails sont dans le journal (Paramètres → Ouvrir le journal).',
  hostKeyMismatch: {
    message: (label) => `La clé SSH de « ${label} » a changé, connexion refusée.`,
    hint: (label) => `Si « ${label} » a été réinstallé : Paramètres → Appareils → réinitialiser l’empreinte.`
  },
  todoNotFound: { message: 'L’entrée n’existe plus dans le fichier TODO.', hint: 'Rechargez les TODO : le fichier a été modifié depuis l’extérieur.' },
  vaultMissing: { message: 'Aucun coffre Obsidian n’est configuré.', hint: 'Choisissez un dossier de coffre dans les paramètres, sous « Notes ».' },
  todoConflict: { message: 'Le fichier TODO est en cours de modification ailleurs.', hint: 'Patientez un instant et réessayez.' },
  todoEmpty: 'Le texte du TODO ne peut pas être vide.',
  todoNewline: 'Le texte du TODO ne peut pas contenir de saut de ligne.',
  todoDateInvalid: (due) => `Date « ${due} » invalide, format attendu : AAAA-MM-JJ.`,
  what: {
    project: (id) => `Le projet ${id}`,
    category: (id) => `Le type ${id}`,
    image: (id) => `L’image ${id}`,
    model: (id) => `Le modèle ${id}`,
    source: (id) => `La source ${id}`,
    terminal: 'Le terminal',
    terminalId: (id) => `Le terminal ${id}`,
    entry: (id) => `L’entrée ${id}`,
    folder: (path) => `Le dossier ${path}`,
    device: (id) => `L’appareil « ${id} »`,
    gitState: (path) => `L’état Git de ${path}`,
    claudeMdOpener: 'Un programme pour ouvrir CLAUDE.md'
  },
  hints: {
    createDevice: 'Ajoutez-le dans les paramètres, sous Appareils, ou retirez le projet.',
    gitRepo: 'Vérifiez que le dossier est un dépôt Git.',
    checkFavoritePath: 'Vérifiez le chemin du favori.',
    reloadCatalog: 'Rechargez le catalogue et réessayez.',
    reopenTab: 'Fermez l’onglet et rouvrez-le.'
  },
  assistant: {
    busy: 'L’assistant est encore en cours d’exécution. Patientez ou appuyez sur « Arrêter ».',
    failed: 'L’assistant s’est arrêté sur une erreur.',
    hint: 'Vérifiez que Claude Code est connecté et que le quota est disponible (en bas à gauche).',
    invalidInput: (detail) => `Saisie erronée : ${detail}`,
    pathOutside: (target, root) => `Le chemin ${target} ne se trouve pas dans ${root}.`,
    projectNameInvalid: (name) => `Le nom de projet « ${name} » est invalide (pas de caractères de chemin comme / \\ : * ? " < > |).`,
    categoryUnknown: (category, root, available) => `La catégorie « ${category} » n’existe pas dans ${root} (disponibles : ${available}).`,
    claudeNotFound: 'Claude Code est introuvable',
    commandNotFound: (command) => `« ${command} » introuvable`
  },
  timeout: (seconds) => `Délai de ${seconds} s dépassé`,
  favorites: {
    categoryNameEmpty: 'Le nom du type ne peut pas être vide.',
    categoryExists: (name) => `Le type « ${name} » existe déjà.`,
    nameAndPathEmpty: 'Le nom et le chemin ne peuvent pas être vides.',
    folderIsProject: (path) => `Le dossier ${path} est déjà un projet.`,
    colorInvalid: (color) => `La couleur « ${color} » est invalide, format attendu : #rrggbb ou #rgb (p. ex. #e08a4f).`,
    iconInvalid: (icon) => `L’icône « ${icon} » est invalide : choisissez un emoji ou un nom d’icône Lucide.`
  },
  ssh: {
    disabled: 'désactivé dans les paramètres',
    keyPassphrase: (path) => `La clé SSH ${path} a une phrase secrète ; veuillez démarrer l’agent SSH (ssh-add)`,
    keyMissing: (path) => `La clé SSH ${path} est absente et aucun agent SSH n’est en cours d’exécution`,
    homeUnknown: 'Dossier personnel introuvable',
    commandFailed: (label, code, stderr) => `Échec de la commande sur « ${label} » (${code}) : ${stderr}`
  },
  images: {
    extensionUnsupported: (extension, allowed) => `Le type de fichier .${extension} n’est pas pris en charge (autorisés : ${allowed}).`,
    dropTooLarge: (name, limit) => `« ${name} » est trop volumineux pour être transféré (${limit} au maximum).`,
    dropUnreadable: (name) => `Impossible de lire « ${name} ». Les dossiers ne peuvent être déposés que dans des terminaux locaux.`
  },
  models: { nameRequired: 'Le modèle a besoin d’un nom.', ollamaNoAnswer: (code) => `Ollama ne répond pas (${code})` },
  minipc: { authMissing: 'La réponse de l’appareil ne contient aucune donnée de connexion.', gitError: 'Erreur' },
  privacy: {
    unknownHost: (host, known) => `Ordinateur « ${host} » inconnu, attendu : ${known}.`,
    pickProjectFolder: 'Choisissez un dossier de projet, pas la racine d’un lecteur ou du système de fichiers.',
    alreadyPrivate: 'Ce dossier est déjà privé.'
  },
  quota: {
    notObject: 'pas un objet',
    missing: (kind) => `${kind} manquant`,
    utilizationMissing: (kind) => `${kind}.utilization manquant`,
    expiredHint: 'Lancez Claude Code une fois, la connexion sera renouvelée.',
    unavailableHint: 'Sans source, l’application n’affiche aucune valeur.',
    noConnection: 'Pas de connexion à Anthropic.',
    tooManyRequests: 'Trop de requêtes (HTTP 429), nouvel essai plus tard.',
    loginExpired: 'La connexion à Claude a expiré.',
    requestFailed: (status) => `Échec de la requête (HTTP ${status}).`,
    notJson: 'La réponse n’était pas du JSON.',
    noLogin: 'Aucune connexion à Claude trouvée.',
    loginUnreadable: 'Le fichier de connexion de Claude Code est illisible.',
    noSubscription: 'Aucune connexion par abonnement (claude.ai) trouvée.'
  },
  setup: {
    invalidJson: (detail) => `JSON invalide : ${detail}`,
    invalidContent: (path, detail) => `Contenu invalide à « ${path} » : ${detail}`,
    rootPath: 'racine',
    unknown: 'inconnu',
    folderMissing: (path) => `Le dossier ${path} n’existe pas.`,
    connected: (user, host) => `Connecté à ${user}@${host}.`,
    pickProjectsRoot: 'Choisissez un dossier de projets.',
    deviceIdInvalid: (id) => `L’ID d’appareil « ${id} » est invalide ou en double.`
  },
  skills: { emptySummary: 'réponse vide', unreadable: (path) => `${path} : illisible` },
  sources: { urlInvalid: 'L’adresse doit commencer par http:// ou https://, p. ex. https://fr.wikipedia.org/wiki/Transformation_de_Fourier.', targetDuplicate: 'Cette adresse figure déjà dans le dossier cible.', duplicate: 'Cette adresse figure déjà dans ce dossier.' },
  speech: {
    noFreePort: 'Aucun port libre trouvé',
    noTextField: 'Réponse sans champ « text »',
    noServerAnswer: 'whisper-server ne répond ni avec le GPU ni avec le CPU',
    startCancelled: 'Démarrage annulé car la reconnaissance vocale a été arrêtée',
  },
  update: {
    releaseInstall: (url) => `Installé depuis une release : nouvelles versions sur ${url}`,
    noCommit: 'Le build ne contient pas d’identifiant de commit',
    repoMissing: (dir) => `Le dépôt ${dir} est absent`,
    step: 'Vérification',
    nothingNewer: 'aucune version plus récente sur GitHub',
    notInRemote: (commit, ref) => `la version installée ${commit} ne se trouve pas dans ${ref}`,
    wrongBranch: (branch, expected) => `Le dépôt est sur la branche ${branch} au lieu de ${expected}`,
    dirty: 'Le dépôt contient des modifications non validées',
    exitCode: (code) => `Code de sortie ${code}`
  },
  vault: {
    invalidName: (name) => `Nom de fichier « ${name} » invalide.`,
    notProtocol: (path) => `« ${path} » n’est pas un journal de session d’un dossier de journaux.`
  },
  links: {
    nameRequired: 'Veuillez saisir un nom.',
    nameTaken: (name) => `Un raccourci nommé « ${name} » existe déjà.`,
    urlRequired: 'Veuillez saisir l’adresse de la page.',
    urlInvalid: 'L’adresse doit commencer par http:// ou https://, p. ex. http://192.168.1.20:8123.'
  }
}
