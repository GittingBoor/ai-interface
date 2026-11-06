import type { Messages } from '../messages'

export const agents: Messages['agents'] = {
  title: 'Agents',
  viewLabel: 'Affichage',
  modeBrowse: 'Aperçu',
  modeGuide: 'Guide',
  reload: 'Recharger',
  build: 'Créer un agent',
  buildFirst: 'Créer le premier agent',
  subtitle: (count: number, hosts: number): string => `${count} ${count === 1 ? 'agent' : 'agents'} sur ${hosts === 1 ? 'une machine' : `${hosts} machines`} · des spécialistes à qui Claude confie des tâches`,
  subtitleIdle: 'Des spécialistes à qui Claude confie des tâches',
  emptyTitle: 'Aucun agent pour l’instant',
  emptyBody: 'Un agent est un spécialiste avec sa propre tâche, ses propres outils et son propre contexte. La recherche porte sur ~/.claude/agents, les projets et les plugins.',
  noMatchTitle: 'Aucun agent ne correspond',
  noMatchBody: 'La recherche porte sur le nom, la description, le résumé, les outils et les Skills.',
  clearSearch: 'Effacer la recherche',
  detailsAria: 'Détails de l’agent',
  pickTitle: 'Choisir un agent',
  pickBody: 'Choisissez un agent à gauche : ce qu’il fait, quand Claude l’utilise, outils, Skills et instructions.',
  searchLabel: 'Rechercher des agents',
  searchPlaceholder: 'Nom, tâche, outil ou Skill',

  groups: {
    user: 'Les vôtres',
    userHint: 'disponibles dans tous les projets',
    project: 'Projet',
    projectHint: 'uniquement dans ce projet',
    plugin: 'Plugin',
    pluginHint: 'issu d’un plugin, en lecture seule',
    other: 'Autres'
  },
  list: {
    noDescription: 'Sans description',
    tools: (n: number): string => `${n} ${n === 1 ? 'outil' : 'outils'}`,
    allTools: 'tous les outils',
    skills: (n: number): string => (n === 1 ? '1 Skill' : `${n} Skills`),
    proactive: 'de lui-même',
    proactiveTitle: 'Claude utilise cet agent de sa propre initiative'
  },
  inheritModel: 'Comme la session principale',

  settingRows: {
    model: 'Modèle',
    effort: 'Effort',
    permission: 'Droits',
    maxTurns: 'Tours max.',
    memory: 'Mémoire',
    isolation: 'Isolation',
    background: 'Arrière-plan',
    modelInherited: 'Comme la session principale',
    modelInheritedExplain: 'Aucun modèle défini : Claude utilise le modèle de la session en cours.',
    modelCustomExplain: 'ID de modèle personnalisé.',
    sessionValue: 'Comme la session',
    effortInheritedExplain: 'Reprend l’effort de réflexion de la session.',
    permissionInheritedExplain: 'Reprend le mode de droits de la session depuis laquelle il est lancé.',
    unlimited: 'Illimité',
    turnsUnlimitedExplain: 'Travaille jusqu’à ce que la tâche soit terminée.',
    turnsLimitedExplain: 'S’arrête après ce nombre d’étapes et signale un résultat partiel.',
    memoryOff: 'Désactivée',
    memoryOffExplain: 'Démarre chaque fois sans souvenir des exécutions précédentes.',
    isolationWorktree: 'Worktree dédié',
    isolationProject: 'Dans le dossier du projet',
    isolationWorktreeExplain: 'Travaille dans une copie Git et ne perturbe pas le travail en parallèle.',
    isolationProjectExplain: 'Modifie les fichiers directement dans le projet.',
    yes: 'Oui',
    no: 'Non',
    backgroundYesExplain: 'Continue en arrière-plan pendant que Claude fait autre chose.',
    backgroundNoExplain: 'Claude attend son résultat.'
  },

  detail: {
    origin: { user: 'Agent personnel', project: 'Agent de projet', plugin: 'Agent de plugin', synced: 'Synchronisé', disabled: 'Désactivé' },
    pluginOrigin: (name: string): string => `Plugin ${name}`,
    projectOrigin: (name: string): string => `Projet ${name}`,
    editCopy: 'Modifier en tant que copie',
    edit: 'Modifier',
    automate: 'Automatiser',
    delete: 'Supprimer l’agent',
    whatItDoes: 'Ce qu’il fait',
    noSummary: 'Pas encore de résumé. Claude Haiku lit le fichier et l’explique en deux phrases.',
    explain: 'Expliquer',
    whenUsed: 'Quand Claude l’utilise',
    noDescription: 'Aucune description : Claude ne peut pas savoir quand il convient.',
    proactiveYes: 'Claude lui confie de lui-même les tâches adaptées.',
    proactiveNo: 'Claude l’utilise lorsque la tâche correspond à la description ou lorsque vous le nommez.',
    callText: (name: string): string => `Appel direct : \`@agent-${name}\` dans le chat, ou en session complète avec \`claude --agent ${name}\`.`,
    settings: 'Réglages',
    tools: 'Outils',
    toolsInheritAll: 'Aucune restriction : il peut faire tout ce que la session peut faire, y compris les outils MCP.',
    toolMcp: 'Outil d’un serveur MCP.',
    toolCustom: 'Outil personnalisé ou restreint.',
    blocked: 'Bloqués :',
    skills: 'Skills',
    noSkills: 'Ne précharge aucun Skill et n’en mentionne aucun.',
    skillPreloadedTitle: 'Chargé en entier au démarrage',
    skillMentionedTitle: 'Mentionné dans les instructions',
    preloaded: 'préchargé',
    mentioned: 'mentionné',
    skillMissingTitle: 'Le Skill n’est pas installé sur cette machine',
    skillMissing: (name: string): string => `${name} · manquant`,
    automations: 'Automatisations',
    onlyWhenCalled: 'S’exécute uniquement quand Claude l’appelle.',
    runBySchedule: 'Exécuter selon un planning',
    scheduleOff: 'désactivée',
    quality: 'Contrôle qualité',
    qualityClean: 'Aucune remarque. Décrit clairement, restreint à bon escient, avec des consignes de sortie.',
    instructions: 'Instructions',
    showLess: 'Afficher moins',
    showAll: 'Tout afficher',
    instructionsEmpty: 'Vides : l’agent travaille uniquement avec la tâche que Claude lui confie.',
    fileAria: 'Fichier',
    showInFolder: 'Afficher dans le dossier',
    preservedKeys: (keys: string): string => `Autres champs du fichier conservés lors de la modification : ${keys}`
  },

  finding: { tip: 'Astuce', warn: 'Avertissement', error: 'Erreur' },
  score: {
    great: 'Très bien construit',
    fair: 'Utilisable, avec une marge de progression',
    gaps: 'Lacunaire',
    incomplete: 'Incomplet',
    meter: 'Qualité'
  },

  builder: {
    back: 'Retour à l’aperçu',
    editTitle: (name: string): string => `Modifier ${name || 'l’agent'}`,
    copyTitle: (name: string): string => `Copie de ${name}`,
    newTitle: 'Nouvel agent',
    unsaved: 'Modifications non enregistrées',
    saved: 'Tout est enregistré',
    notSaved: 'Pas encore enregistré',
    cancel: 'Annuler',
    save: 'Enregistrer',
    saveTitle: 'Enregistrer (Ctrl+S)',
    toolsTitle: 'Outils',
    toolsExplain: 'Ce que l’agent a le droit de faire. Moins, c’est mieux : un relecteur n’a pas besoin de droits d’écriture, un chercheur n’a pas besoin d’un shell.',
    sideAria: 'Vérification et aperçu',
    chooseProject: 'Choisir un projet',
    nameFallback: 'nom',
    sections: { start: 'Démarrer avec l’IA', identity: 'Nom et usage', place: 'Emplacement', model: 'Modèle et réflexion', tools: 'Outils', skills: 'Skills', rights: 'Droits et comportement', prompt: 'Instructions' },

    startNew: 'Démarrer avec l’IA',
    startImprove: 'Améliorer avec l’IA',
    startNewExplain: 'Décrivez avec vos propres mots ce que l’agent doit savoir faire. Claude Sonnet choisit le nom, les outils, le modèle et les droits, puis rédige les instructions. Vous pouvez ensuite tout ajuster.',
    startImproveExplain: 'Claude affine la description, les outils et les instructions selon les règles des bons agents. Vous pouvez préciser ce qui doit être amélioré.',
    ideaLabel: 'Idée pour l’agent',
    improveLabel: 'Demande d’amélioration',
    ideaExample: 'p. ex. « Vérifie chaque matin si des tests échouent dans mes projets et écrit une courte liste avec la cause et le fichier. »',
    improveExample: 'p. ex. « Il doit répondre plus brièvement et ne jamais modifier de fichiers. »',
    createDraft: 'Créer un brouillon',
    improve: 'Améliorer',
    drafting: 'Claude rédige l’agent, cela prend généralement 15 à 40 secondes.',
    revising: 'Claude retravaille l’agent, cela prend généralement 15 à 40 secondes.',
    shortcut: 'Ctrl+Entrée',
    whyChosen: 'Pourquoi Claude a choisi ainsi',
    orTemplate: 'Ou commencer avec un modèle :',

    identityTitle: 'Nom et usage',
    identityExplain: 'La description est l’élément le plus important de l’agent : c’est elle qui permet à Claude de décider si une tâche lui convient.',
    nameLabel: 'Nom',
    nameHint: 'Minuscules et tirets. Devient le nom du fichier et l’appel (@agent-nom).',
    colorLabel: 'Couleur',
    whenLabel: 'Quand Claude doit-il l’utiliser ?',
    whenHint: (chars: number): string => `Ce qu’il fait et quand il convient, en 1 à 3 phrases. Exemple : « Vérifie les modifications de code. Use when … » · ${chars} caractères`,
    whenPlaceholder: 'Vérifie les modifications récentes du code à la recherche d’erreurs et de failles de sécurité. Use when du code a été modifié, avant de committer.',
    proactiveLabel: 'Utiliser de lui-même',
    proactiveDescription: 'Ajoute « Use proactively. » : Claude lui confie les tâches adaptées sans qu’on le lui demande. Désactivé : uniquement quand la tâche correspond clairement ou que vous le nommez.',

    placeTitle: 'Emplacement',
    placeExplain: 'Les agents personnels valent pour tous les projets de la machine. Les agents de projet sont dans le projet, voyagent avec Git et l’emportent à nom identique.',
    host: 'Machine',
    appliesTo: 'S’applique à',
    allProjects: 'Tous les projets',
    oneProject: 'Un projet',
    project: 'Projet',
    noProjects: (host: string): string => `Aucun projet sur ${host}`,

    modelTitle: 'Modèle et réflexion',
    modelExplain: 'Des modèles économiques pour les tâches simples et volumineuses ; des modèles puissants seulement là où il faut vraiment réfléchir.',
    modelLabel: 'Modèle',
    modelInheritExplain: 'Pas de modèle propre : utilise celui avec lequel vous utilisez Claude.',
    customModel: 'ID de modèle personnalisé dans le fichier :',
    customModelReplace: 'Un choix ci-dessus le remplace.',
    effortLabel: 'Effort',
    sessionLabel: 'Comme la session',
    effortInheritExplain: 'Reprend l’effort de réflexion de la session en cours.',

    skillsTitle: 'Précharger des Skills',
    skillsExplain: 'Les agents ne voient pas vos Skills automatiquement. Les Skills préchargés entrent en entier dans son contexte au démarrage : ne choisissez donc que ce dont il a presque toujours besoin.',
    skillsChosen: (n: number): string => `${n} sélectionné${n === 1 ? '' : 's'}`,

    rightsTitle: 'Droits et comportement',
    rightsExplain: 'Ce qu’il peut faire sans demander et comment il travaille. Pour les relecteurs, « Planifier seulement » est la valeur sûre.',
    rightsLabel: 'Droits',
    rightsInheritExplain: 'Reprend les droits de la session depuis laquelle il est lancé.',
    memoryLabel: 'Mémoire',
    memoryOff: 'Désactivée',
    memoryOffExplain: 'Démarre chaque fois sans souvenir.',
    maxTurnsLabel: 'Nombre maximal de tours',
    unlimitedPlaceholder: 'illimité',
    maxTurnsHint: 'Frein contre les boucles infinies. Il fournit ensuite un résultat partiel.',
    worktreeLabel: 'Worktree dédié',
    worktreeDescription: 'Travaille dans une copie Git ; utile quand plusieurs agents modifient en parallèle.',
    backgroundLabel: 'En arrière-plan',
    backgroundDescription: 'Claude ne l’attend pas et continue de travailler.',

    promptTitle: 'Instructions',
    promptExplain: 'Son prompt système. Il ne connaît pas votre conversation, seulement ce texte et la tâche que Claude lui confie. Rôle, démarche, forme de la réponse et limites.',
    insertOutline: 'Insérer un plan',
    promptChars: (n: number): string => `${n} caractères · Markdown`,
    initialLabel: 'Premier message en tant qu’agent principal',
    initialPlaceholder: 'facultatif, p. ex. « Commence par git status »',
    initialHint: 'Seulement avec claude --agent : envoyé automatiquement comme premier message.',

    sideQuality: 'Contrôle qualité',
    noFindings: 'Aucune remarque.',
    sectionsNav: 'Sections',
    filePreviewAria: 'Aperçu du fichier',
    filePreview: 'Voici le fichier obtenu',
    alsoPreserved: (keys: string): string => `Également conservé : ${keys}`
  },

  fields: {
    colorGroup: 'Couleur',
    noColor: 'Aucune couleur',
    presets: 'Sélection rapide',
    inheritAllNote: 'Aucune sélection signifie : l’agent hérite de **tous** les outils de la session. Cochez des outils pour le restreindre.',
    moreTools: 'Autres outils',
    moreToolsPlaceholder: 'p. ex. mcp__github__get_issue, Bash(git diff *)',
    moreToolsHint: 'Séparez les outils MCP et les motifs par des virgules. Claude ignore silencieusement les fautes de frappe ; le contrôle qualité les signale.',
    filterSkills: 'Filtrer les Skills',
    searchSkill: 'Rechercher un Skill',
    noSkillMatch: 'Aucun Skill ne correspond à la recherche.',
    noSkillsFound: 'Aucun Skill trouvé. Le catalogue charge les Skills depuis ~/.claude/skills et les plugins.'
  },

  toolGroups: { read: 'Lecture', write: 'Écriture', exec: 'Exécution', web: 'Web', meta: 'Pilotage' },
  tools: {
    Read: { label: 'Lire des fichiers', explain: 'Ouvre des fichiers, y compris images et PDF.' },
    Grep: { label: 'Chercher dans le contenu', explain: 'Cherche du texte dans de nombreux fichiers à la fois.' },
    Glob: { label: 'Trouver des fichiers', explain: 'Trouve des fichiers à l’aide de motifs comme **/*.ts.' },
    Edit: { label: 'Modifier des fichiers', explain: 'Remplace des passages précis dans des fichiers existants.' },
    Write: { label: 'Créer des fichiers', explain: 'Écrit des fichiers neufs ou les remplace entièrement.' },
    NotebookEdit: { label: 'Modifier des notebooks', explain: 'Modifie des cellules dans des notebooks Jupyter.' },
    Bash: { label: 'Exécuter des commandes', explain: 'Exécute des commandes shell : tests, Git, builds. L’outil le plus puissant.' },
    PowerShell: { label: 'PowerShell', explain: 'Exécute des commandes PowerShell (Windows).' },
    WebSearch: { label: 'Chercher sur le web', explain: 'Cherche des informations récentes sur Internet.' },
    WebFetch: { label: 'Lire des pages web', explain: 'Charge une adresse et en lit le contenu.' },
    Agent: { label: 'Lancer d’autres agents', explain: 'Peut lui-même confier des tâches à des sous-agents.' },
    Skill: { label: 'Utiliser des Skills', explain: 'Peut charger et suivre des Skills.' },
    TodoWrite: { label: 'Liste de tâches', explain: 'Tient sa propre liste de contrôle pour les longues tâches.' }
  },
  presets: {
    read: { label: 'Lecture seule', explain: 'Sûr pour les relecteurs et la recherche dans le code' },
    edit: { label: 'Lire et modifier', explain: 'Pour les agents qui écrivent du code, sans commandes' },
    dev: { label: 'Développer', explain: 'Modifier, plus tests et Git via le shell' },
    web: { label: 'Recherche web', explain: 'Chercher et lire sur Internet, écrire des notes' },
    all: { label: 'Tout hériter', explain: 'Aucune restriction, y compris les outils MCP' }
  },
  options: {
    model: {
      inherit: { label: 'Comme la session principale', explain: 'Utilise le modèle avec lequel vous utilisez Claude actuellement.' },
      haiku: { label: 'Haiku', explain: 'Rapide et économique. Idéal pour chercher, résumer, faire des vérifications simples.' },
      sonnet: { label: 'Sonnet', explain: 'Équilibré. Un bon choix par défaut pour la plupart des agents.' },
      opus: { label: 'Opus', explain: 'Fort sur les tâches difficiles, plus lent et plus cher.' },
      fable: { label: 'Fable', explain: 'Le plus grand modèle, pour les travaux très exigeants.' }
    },
    effort: {
      low: { label: 'Faible', explain: 'Peu de réflexion, réponses rapides.' },
      medium: { label: 'Moyen', explain: 'Un peu de réflexion avant d’agir.' },
      high: { label: 'Élevé', explain: 'Réflexion approfondie, bien pour les relectures et la planification.' },
      xhigh: { label: 'Très élevé', explain: 'Pour les bugs retors et les questions d’architecture.' },
      max: { label: 'Maximum', explain: 'Autant de réflexion que possible, lent et coûteux.' }
    },
    permission: {
      default: { label: 'Demander', explain: 'Demande avant les modifications et les commandes. Sans personne devant l’écran, ces étapes sont refusées.' },
      acceptEdits: { label: 'Modifications autorisées', explain: 'Peut modifier des fichiers sans demander, demande pour les commandes.' },
      auto: { label: 'Automatique', explain: 'Claude décide lui-même de ce qui est autorisé, avec un contrôle de sécurité.' },
      dontAsk: { label: 'Ne pas demander', explain: 'Ne demande jamais ; ce qui n’est pas autorisé est refusé.' },
      plan: { label: 'Planifier seulement', explain: 'Lit et planifie, ne modifie rien. Idéal pour les relecteurs.' },
      bypassPermissions: { label: 'Tout autorisé', explain: 'Aucune question et aucun blocage. À utiliser uniquement dans des dossiers sûrs.' }
    },
    memory: {
      user: { label: 'Pour moi', explain: 'Retient des choses d’un projet à l’autre dans votre dossier utilisateur.' },
      project: { label: 'Dans le projet', explain: 'La mémoire se trouve dans le projet et voyage avec Git.' },
      local: { label: 'Local uniquement', explain: 'Mémoire dans le projet, mais pas dans Git.' }
    }
  },

  lint: {
    nameMissing: 'Le nom manque. Claude appelle l’agent par ce nom.',
    nameFormat: 'Le nom ne peut contenir que des minuscules, des chiffres et des tirets, p. ex. « code-reviewer ».',
    descriptionMissing: 'La description manque. Sans elle, Claude ne sait pas quand l’agent convient.',
    descriptionShort: 'Description très courte. Précisez à quoi il sert et quand Claude doit l’utiliser.',
    descriptionLong: 'Description longue. Elle est chargée à chaque session ; les détails vont dans les instructions.',
    noTrigger: 'Aucun déclencheur reconnaissable. Formulez-le ainsi : « Use when … ».',
    notProactive: 'Si Claude doit l’utiliser de lui-même, ajoutez « Use proactively … ». Sinon, uniquement quand vous le nommez.',
    promptMissing: 'Les instructions manquent. L’agent démarre sans connaissances préalables ; c’est ici qu’on explique comment il travaille.',
    promptShort: 'Instructions très brèves. Décrivez le rôle, la démarche et la forme de la réponse.',
    promptLong: 'Instructions très longues. Les connaissances récurrentes conviennent mieux à un Skill que l’agent précharge.',
    noOutput: 'Aucune consigne de sortie. Dites ce qui doit revenir (p. ex. « liste avec fichier:ligne, 200 mots maximum »), sinon il inonde le contexte principal.',
    noLimits: 'Aucune limite indiquée. Une section « Limites » évite les modifications non voulues.',
    inheritsAllTools: 'Hérite de tous les outils. Moins d’outils rendent l’agent plus sûr et plus ciblé.',
    manyTools: 'Beaucoup d’outils. Ne donnez que ce dont l’agent a besoin pour sa tâche.',
    unknownTools: (names: string): string => `Outils inconnus : ${names}. Les fautes de frappe sont ignorées silencieusement.`,
    reviewWrites: 'On dirait une tâche de vérification ou de recherche, mais il peut modifier. « Lecture seule » ou le mode « Planifier seulement » serait plus sûr.',
    bypass: '« Tout autorisé » désactive toutes les demandes de sécurité. À utiliser uniquement dans des dossiers où rien ne peut être cassé.',
    haikuTip: 'Une simple recherche est plus rapide et moins chère avec Haiku.',
    manySkills: 'Chaque Skill préchargé entre en entier dans le contexte. Ne préchargez que le strict nécessaire.'
  },

  service: {
    notMarkdown: (path: string): string => `« ${path} » n’est pas un fichier Markdown.`,
    pluginCopyOnly: 'Cet agent appartient à un plugin et ne peut être enregistré que sous forme de copie.',
    deleteOnlyOwn: 'Seuls vos propres agents d’un dossier .claude/agents peuvent être supprimés.',
    fileLabel: (path: string): string => `Fichier d’agent ${path}`,
    reloadHint: 'Rechargez la liste.',
    ideaTooShort: 'Décrivez en une ou deux phrases ce que l’agent doit faire.',
    currentMissing: 'L’agent actuel manque pour l’amélioration.',
    pickProject: 'Choisissez un projet : les agents de projet se trouvent dans le dossier d’un projet de la liste.',
    noJson: 'La réponse ne contenait aucun objet JSON',
    unreadableJson: (detail: string): string => `JSON illisible : ${detail}`,
    notObject: 'La réponse n’était pas un objet',
    incompleteAnswer: 'Le nom, la description ou les instructions manquent dans la réponse'
  },

  store: {
    discardTitle: 'Abandonner les modifications ?',
    discardMessage: 'L’agent n’est pas encore enregistré.',
    discard: 'Abandonner',
    saved: (name: string): string => `Agent « ${name} » enregistré`,
    deleteTitle: (name: string): string => `Supprimer l’agent « ${name} » ?`,
    deleteMessage: (path: string): string => `Le fichier ${path} sera supprimé. Les automatisations utilisant cet agent ne fonctionneront plus.`,
    delete: 'Supprimer',
    deleted: (name: string): string => `Agent « ${name} » supprimé`
  },

  promptOutline: [
    'Tu es <rôle en une phrase>.',
    '',
    '## Tâche',
    '<Ce que tu accomplis et ce qui doit exister à la fin.>',
    '',
    '## Démarche',
    '1. <Première étape>',
    '2. <Deuxième étape>',
    '3. <Vérifier que le résultat est correct>',
    '',
    '## Sortie',
    '<Forme de la réponse à l’agent principal : p. ex. courte liste avec fichier:ligne, 200 mots maximum.>',
    '',
    '## Limites',
    '- <Ce que tu ne fais jamais, p. ex. ne rien committer, ne modifier aucun fichier en dehors de src/>'
  ].join('\n'),

  templates: {
    reviewer: {
      label: 'Relecteur de code',
      explain: 'Lit les modifications et signale les erreurs, ne change rien',
      description: 'Vérifie les modifications récentes du code à la recherche d’erreurs, de failles de sécurité et de passages peu clairs. Use proactively after larger changes, before committing (après des changements importants, avant de committer).',
      prompt: [
        'Tu es un relecteur de code expérimenté. Tu ne modifies rien, tu trouves des problèmes.',
        '',
        '## Démarche',
        '1. Récupère les modifications avec `git diff` (et `git diff --staged`).',
        '2. Lis les fichiers concernés dans leur contexte, pas seulement les lignes modifiées.',
        '3. Cherche de vraies erreurs : logique fausse, gestion d’erreurs manquante, failles de sécurité, cas limites.',
        '4. Vérifie chaque constat avant de le signaler. Pas de suppositions présentées comme des faits.',
        '',
        '## Sortie',
        'Une liste, du plus grave au moins grave. Par constat : `fichier:ligne`, une phrase sur le problème, une phrase sur la solution.',
        'Pas de questions de style, pas de compliments. Si tu ne trouves rien de sérieux, dis-le exactement ainsi en une phrase.',
        '',
        '## Limites',
        '- Ne modifie aucun fichier, ne committe rien.'
      ].join('\n')
    },
    researcher: {
      label: 'Explorateur de code',
      explain: 'Cherche rapidement dans le projet et résume',
      description: 'Découvre où et comment quelque chose est implémenté dans le code et fournit un court résumé avec les emplacements. Use proactively when many files need to be searched (quand de nombreux fichiers doivent être parcourus).',
      prompt: [
        'Tu parcours le code et rapportes brièvement ce que tu as trouvé.',
        '',
        '## Démarche',
        '1. Cherche largement avec Glob et Grep, puis ne lis que les passages pertinents.',
        '2. Suis les appels jusqu’à l’implémentation réelle.',
        '',
        '## Sortie',
        '150 mots maximum plus une liste `fichier:ligne – ce qui s’y passe`. Ne renvoie pas de fichiers entiers.'
      ].join('\n')
    },
    tester: {
      label: 'Rédacteur de tests',
      explain: 'Écrit et lance des tests pour le nouveau code',
      description: 'Écrit les tests manquants pour du code nouveau ou modifié et les exécute. Use when new features were added without tests (quand de nouvelles fonctions sont apparues sans tests).',
      prompt: [
        'Tu écris des tests dans le style du projet.',
        '',
        '## Démarche',
        '1. Trouve quel framework de test et quels motifs le projet utilise (lis les tests existants).',
        '2. Écris des tests du comportement, pas des détails d’implémentation. Les cas limites d’abord.',
        '3. Exécute les tests. Si un test échoue, vérifie si c’est le test ou le code qui est faux.',
        '',
        '## Sortie',
        'Quels tests tu as créés, le résultat de l’exécution et les erreurs trouvées dans le code.',
        '',
        '## Limites',
        '- Ne modifie pas le code de production, signale seulement.'
      ].join('\n')
    },
    web: {
      label: 'Chercheur web',
      explain: 'Fait des recherches sur Internet avec sources',
      description: 'Recherche une question sur Internet et fournit une réponse étayée avec ses sources. Use when current information, prices or documentation are needed (quand il faut des informations actuelles, des prix ou de la documentation).',
      prompt: [
        'Tu fais des recherches approfondies et n’inventes rien.',
        '',
        '## Démarche',
        '1. Cherche avec plusieurs formulations, en français et en anglais.',
        '2. Lis toi-même les meilleurs résultats. Privilégie les sources officielles et les données récentes.',
        '3. Si des sources se contredisent, cite les deux.',
        '',
        '## Sortie',
        'Réponse de 200 mots maximum, puis les sources sous forme de liste avec lien et date.',
        '',
        '## Limites',
        '- Ne cite que des liens que tu as réellement ouverts.'
      ].join('\n')
    },
    docs: {
      label: 'Rédacteur de documentation',
      explain: 'Garde le README et la documentation à jour',
      description: 'Met à jour le README et la documentation en fonction du code actuel. Use when features, commands or settings were changed (quand des fonctions, des commandes ou des réglages ont changé).',
      prompt: [
        'Tu maintiens à jour la documentation d’un projet.',
        '',
        '## Démarche',
        '1. Lis le README et la documentation existante, puis le code dont ils parlent.',
        '2. Corrige ce qui n’est plus exact. N’ajoute que ce qui manque vraiment.',
        '3. Conserve le ton, la langue et la structure de la documentation existante.',
        '',
        '## Sortie',
        'Liste des fichiers modifiés avec une phrase par modification.',
        '',
        '## Limites',
        '- Ne modifie pas le code. Pas de nouveaux fichiers de documentation sans raison.'
      ].join('\n')
    }
  },

  guide: {
    navAria: 'Sommaire',
    toc: { what: 'Ce qu’est un agent', compare: 'Agent, Skill, commande', decide: 'Comment Claude décide', anatomy: 'Structure d’un fichier', rules: 'Règles pour de bons agents', settings: 'Tous les réglages', automate: 'Automatiser' },
    what: {
      p1: 'Un agent (« subagent » dans Claude Code) est un **spécialiste avec sa propre fenêtre de contexte**. Claude lui confie une sous-tâche ; il la traite avec ses propres instructions, outils et modèle et ne renvoie que le résultat. Les étapes intermédiaires, c’est-à-dire des centaines de fichiers lus ou de longs journaux, restent chez lui.',
      p2: 'La session principale reste ainsi courte et claire. Les agents conviennent aux tâches qui lisent beaucoup et renvoient peu : parcourir du code, vérifier des modifications, lancer des tests, faire des recherches sur le web.'
    },
    compare: {
      colWhat: 'Ce que c’est',
      colWhen: 'Quand l’utiliser',
      rows: [
        ['Agent', 'Un collaborateur à part, avec son propre contexte, ses outils et son modèle', 'Une sous-tâche autonome dont personne n’a besoin de voir les étapes intermédiaires'],
        ['Skill', 'Des connaissances et des consignes que Claude charge lui-même au besoin', 'Une démarche récurrente que Claude doit suivre dans la même conversation'],
        ['Commande', 'Un prompt enregistré que vous lancez avec /nom', 'Quelque chose que vous déclenchez vous-même régulièrement']
      ]
    },
    decide: {
      auto: '**Automatiquement :** Claude connaît le nom et la description de tous les agents. Si une tâche correspond à une description, Claude la leur confie. Avec « Use proactively » dans la description, il le fait nettement plus volontiers.',
      targeted: '**De façon ciblée :** vous écrivez `@agent-nom` ou « Utilise l’agent code-reviewer pour … ».',
      session: '**En session complète :** `claude --agent nom` lance directement Claude en tant que cet agent, avec ses outils et ses instructions.',
      precedence: 'Si deux agents portent le même nom, celui du projet l’emporte sur le vôtre, et le vôtre sur celui d’un plugin.'
    },
    anatomy: {
      intro: 'Un agent est un fichier Markdown dans `~/.claude/agents/` (pour tous les projets) ou `<projet>/.claude/agents/`. En haut se trouve le frontmatter avec les réglages, en dessous les instructions.',
      parts: [
        { code: '---\nname: code-reviewer', title: 'Nom', text: 'Unique, minuscules et tirets. C’est avec lui que vous l’appelez : @agent-code-reviewer.' },
        {
          code: 'description: "Vérifie les modifications de code.\n  Use proactively after larger changes."',
          title: 'Description',
          text: 'Le déclencheur. Claude ne lit que cette ligne pour décider si l’agent convient. Quoi et quand, pas comment.'
        },
        { code: 'tools: Read, Grep, Glob, Bash', title: 'Outils', text: 'Outils autorisés. Sans cette ligne, il les hérite tous. Un relecteur n’a pas besoin de Write.' },
        { code: 'model: sonnet\neffort: high\npermissionMode: plan\n---', title: 'Modèle et droits', text: 'Facultatif. Sans indication, il reprend ce que la session utilise.' },
        {
          code: 'Tu es un relecteur de code expérimenté.\n\n## Démarche\n1. Lire git diff …\n\n## Sortie\nListe avec fichier:ligne …\n\n## Limites\n- Ne rien modifier.',
          title: 'Instructions',
          text: 'Son prompt système. Il ne voit pas votre conversation, seulement ce texte et la tâche que Claude lui confie.'
        }
      ]
    },
    rules: {
      items: [
        { title: 'Une tâche par agent', text: '« Vérifie le code » et « écrit la documentation » sont deux agents. Les agents à tout faire ne sont jamais choisis de façon fiable.' },
        { title: 'La description est un déclencheur', text: 'Formulez quand il convient : « Use when … », « Use proactively after … ». Les détails de la démarche vont dans les instructions, car la description est chargée à chaque session.' },
        { title: 'Aussi peu d’outils que possible', text: 'Moindre privilège : les lecteurs reçoivent Read, Grep, Glob. Moins d’outils, c’est moins de risques et un travail plus ciblé.' },
        { title: 'Définir la réponse', text: 'Dites précisément ce qui revient : « liste avec fichier:ligne, 200 mots maximum ». Sinon il inonde le contexte de l’agent principal, ce qu’un agent doit justement éviter.' },
        { title: 'Tout fournir', text: 'Il démarre sans connaissances préalables. Les règles du projet, chemins et commandes figurent dans les instructions ou dans un Skill préchargé.' },
        { title: 'Le bon modèle', text: 'Haiku pour chercher et résumer, Sonnet par défaut, Opus seulement pour les travaux de réflexion difficiles. Cela économise du quota.' },
        { title: 'Indiquer les limites', text: 'Ce qu’il ne fait jamais : committer, pousser, modifier des fichiers en dehors d’un dossier. Pour les relecteurs, ajoutez « Planifier seulement ».' }
      ],
      note: 'Le contrôle qualité du builder vérifie la plupart de ces règles en direct.'
    },
    settings: {
      colField: 'Champ',
      colMeaning: 'Signification',
      colAdvice: 'Recommandation',
      rows: [
        ['name', 'Nom et appel', 'Obligatoire. Court, décrit le rôle.'],
        ['description', 'Quand Claude l’utilise', 'Obligatoire. 1 à 3 phrases avec un déclencheur.'],
        ['tools', 'Outils autorisés', 'Omis : hérite de tous ; sinon une liste.'],
        ['disallowedTools', 'Outils bloqués', 'Quand presque tout doit être autorisé, sauf p. ex. Write.'],
        ['model', 'Modèle', 'haiku, sonnet, opus, fable ou inherit.'],
        ['effort', 'Effort', 'de low à max ; élevé pour vérifier et planifier.'],
        ['permissionMode', 'Droits sans question', 'plan pour les relecteurs, acceptEdits pour ceux qui écrivent.'],
        ['maxTurns', 'Nombre maximal d’étapes', 'Frein contre les boucles infinies.'],
        ['skills', 'Skills préchargés', 'Seulement ce dont il a presque toujours besoin.'],
        ['memory', 'Mémoire entre les exécutions', 'project, s’il doit apprendre des exécutions précédentes.'],
        ['isolation', 'Worktree Git dédié', 'worktree, quand plusieurs agents modifient en parallèle.'],
        ['background', 'S’exécute en arrière-plan', 'Pour les longues tâches que Claude ne doit pas attendre.'],
        ['color', 'Couleur dans l’interface', 'Affichage uniquement.'],
        ['hooks, mcpServers', 'Hooks et serveurs MCP propres', 'Pour utilisateurs avancés ; le builder les laisse inchangés.']
      ]
    },
    automate: {
      p1: 'Chaque agent peut tourner sans vous. Dans la zone **Automatisation**, vous définissez quel agent reçoit quelle tâche, quand et dans quel projet, par exemple en semaine à 8 h « Vérifie les modifications d’hier ». L’application le lance alors avec `claude -p --agent nom` sur la machine choisie, enregistre le résultat et vous prévient quand il a terminé. Vous n’avez besoin ni de n8n ni d’autres programmes complémentaires.',
      p2: 'Les exécutions planifiées démarrent tant que l’application est ouverte. Si le quota de la fenêtre de 5 heures est presque épuisé, elles sont ignorées au lieu de le vider.',
      toAutomations: 'Aller à l’automatisation'
    }
  }
}
