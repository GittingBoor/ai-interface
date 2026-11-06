import type { Messages } from '../messages'

export const agents: Messages['agents'] = {
  title: 'Agent',
  viewLabel: 'Vista',
  modeBrowse: 'Panoramica',
  modeGuide: 'Guida',
  reload: 'Ricarica',
  build: 'Crea agente',
  buildFirst: 'Crea il primo agente',
  subtitle: (count: number, hosts: number): string => `${count} ${count === 1 ? 'agente' : 'agenti'} su ${hosts === 1 ? 'un computer' : `${hosts} computer`} · specialisti a cui Claude affida compiti`,
  subtitleIdle: 'Specialisti a cui Claude affida compiti',
  emptyTitle: 'Nessun agente',
  emptyBody: 'Un agente è uno specialista con un compito, strumenti e contesto propri. La ricerca avviene in ~/.claude/agents, nei progetti e nei plugin.',
  noMatchTitle: 'Nessun agente corrisponde',
  noMatchBody: 'La ricerca copre nome, descrizione, riepilogo, strumenti e Skill.',
  clearSearch: 'Cancella ricerca',
  detailsAria: 'Dettagli agente',
  pickTitle: 'Seleziona un agente',
  pickBody: 'Scegli un agente a sinistra: cosa fa, quando Claude lo usa, strumenti, Skill e istruzioni.',
  searchLabel: 'Cerca agenti',
  searchPlaceholder: 'Nome, compito, strumento o Skill',

  groups: {
    user: 'Personali',
    userHint: 'disponibili in tutti i progetti',
    project: 'Progetto',
    projectHint: 'solo in questo progetto',
    plugin: 'Plugin',
    pluginHint: 'da un plugin, sola lettura',
    other: 'Altri'
  },
  list: {
    noDescription: 'Senza descrizione',
    tools: (n: number): string => `${n} ${n === 1 ? 'strumento' : 'strumenti'}`,
    allTools: 'tutti gli strumenti',
    skills: (n: number): string => (n === 1 ? '1 Skill' : `${n} Skill`),
    proactive: 'in autonomia',
    proactiveTitle: 'Claude usa questo agente di sua iniziativa'
  },
  inheritModel: 'Come la sessione principale',

  settingRows: {
    model: 'Modello',
    effort: 'Impegno',
    permission: 'Permessi',
    maxTurns: 'Turni max.',
    memory: 'Memoria',
    isolation: 'Isolamento',
    background: 'Sfondo',
    modelInherited: 'Come la sessione principale',
    modelInheritedExplain: 'Nessun modello impostato: Claude usa il modello della sessione in corso.',
    modelCustomExplain: 'ID modello personalizzato.',
    sessionValue: 'Come la sessione',
    effortInheritedExplain: 'Adotta l’impegno di ragionamento della sessione.',
    permissionInheritedExplain: 'Adotta la modalità di permessi della sessione da cui viene avviato.',
    unlimited: 'Illimitato',
    turnsUnlimitedExplain: 'Lavora finché il compito non è finito.',
    turnsLimitedExplain: 'Si ferma dopo questo numero di passi e riporta un risultato parziale.',
    memoryOff: 'Disattivata',
    memoryOffExplain: 'Parte ogni volta senza ricordare le esecuzioni precedenti.',
    isolationWorktree: 'Worktree dedicato',
    isolationProject: 'Nella cartella del progetto',
    isolationWorktreeExplain: 'Lavora in una copia Git e non disturba il lavoro in parallelo.',
    isolationProjectExplain: 'Modifica i file direttamente nel progetto.',
    yes: 'Sì',
    no: 'No',
    backgroundYesExplain: 'Continua in background mentre Claude fa altro.',
    backgroundNoExplain: 'Claude aspetta il suo risultato.'
  },

  detail: {
    origin: { user: 'Agente personale', project: 'Agente di progetto', plugin: 'Agente di plugin', synced: 'Sincronizzato', disabled: 'Disattivato' },
    pluginOrigin: (name: string): string => `Plugin ${name}`,
    projectOrigin: (name: string): string => `Progetto ${name}`,
    editCopy: 'Modifica come copia',
    edit: 'Modifica',
    automate: 'Automatizza',
    delete: 'Elimina agente',
    whatItDoes: 'Cosa fa',
    noSummary: 'Ancora nessun riepilogo. Claude Haiku legge il file e lo spiega in due frasi.',
    explain: 'Spiega',
    whenUsed: 'Quando Claude lo usa',
    noDescription: 'Nessuna descrizione: Claude non può capire quando è adatto.',
    proactiveYes: 'Claude gli affida da solo i compiti adatti.',
    proactiveNo: 'Claude lo usa quando il compito corrisponde alla descrizione o quando lo nomini.',
    callText: (name: string): string => `Richiamo diretto: \`@agent-${name}\` nella chat, oppure come intera sessione con \`claude --agent ${name}\`.`,
    settings: 'Impostazioni',
    tools: 'Strumenti',
    toolsInheritAll: 'Nessuna restrizione: può fare tutto ciò che può la sessione, compresi gli strumenti MCP.',
    toolMcp: 'Strumento di un server MCP.',
    toolCustom: 'Strumento personalizzato o limitato.',
    blocked: 'Bloccati:',
    skills: 'Skill',
    noSkills: 'Non precarica Skill e non ne cita.',
    skillPreloadedTitle: 'Caricata per intero all’avvio',
    skillMentionedTitle: 'Citata nelle istruzioni',
    preloaded: 'precaricata',
    mentioned: 'citata',
    skillMissingTitle: 'La Skill non è installata su questo computer',
    skillMissing: (name: string): string => `${name} · mancante`,
    automations: 'Automazioni',
    onlyWhenCalled: 'Viene eseguito solo quando Claude lo richiama.',
    runBySchedule: 'Esegui a orari prestabiliti',
    scheduleOff: 'off',
    quality: 'Controllo qualità',
    qualityClean: 'Nessuna segnalazione. Descritto chiaramente, limitato in modo adeguato, con indicazioni sull’output.',
    instructions: 'Istruzioni',
    showLess: 'Mostra meno',
    showAll: 'Mostra tutto',
    instructionsEmpty: 'Vuote: l’agente lavora solo con il compito che Claude gli affida.',
    fileAria: 'File',
    showInFolder: 'Mostra nella cartella',
    preservedKeys: (keys: string): string => `Altri campi nel file che restano invariati durante la modifica: ${keys}`
  },

  finding: { tip: 'Suggerimento', warn: 'Avviso', error: 'Errore' },
  score: {
    great: 'Ben costruito',
    fair: 'Utilizzabile, con margine di miglioramento',
    gaps: 'Lacunoso',
    incomplete: 'Incompleto',
    meter: 'Qualità'
  },

  builder: {
    back: 'Torna alla panoramica',
    editTitle: (name: string): string => `Modifica ${name || 'agente'}`,
    copyTitle: (name: string): string => `Copia di ${name}`,
    newTitle: 'Nuovo agente',
    unsaved: 'Modifiche non salvate',
    saved: 'Tutto salvato',
    notSaved: 'Non ancora salvato',
    cancel: 'Annulla',
    save: 'Salva',
    saveTitle: 'Salva (Ctrl+S)',
    toolsTitle: 'Strumenti',
    toolsExplain: 'Cosa può fare l’agente. Meno è meglio: un revisore non ha bisogno di permessi di scrittura, un ricercatore non ha bisogno di una shell.',
    sideAria: 'Controllo e anteprima',
    chooseProject: 'Scegli progetto',
    nameFallback: 'nome',
    sections: { start: 'Inizia con l’IA', identity: 'Nome e impiego', place: 'Posizione', model: 'Modello e ragionamento', tools: 'Strumenti', skills: 'Skill', rights: 'Permessi e comportamento', prompt: 'Istruzioni' },

    startNew: 'Inizia con l’IA',
    startImprove: 'Migliora con l’IA',
    startNewExplain: 'Descrivi con parole tue cosa deve saper fare l’agente. Claude Sonnet sceglie nome, strumenti, modello e permessi e scrive le istruzioni. Poi puoi modificare tutto.',
    startImproveExplain: 'Claude affina descrizione, strumenti e istruzioni secondo le regole per i buoni agenti. Se vuoi, indica cosa migliorare.',
    ideaLabel: 'Idea per l’agente',
    improveLabel: 'Richiesta di miglioramento',
    ideaExample: 'es. «Ogni mattina controlla se nei miei progetti ci sono test falliti e scrive un breve elenco con causa e file.»',
    improveExample: 'es. «Deve rispondere in modo più breve e non modificare mai i file.»',
    createDraft: 'Crea bozza',
    improve: 'Migliora',
    drafting: 'Claude sta preparando la bozza dell’agente, di solito ci vogliono 15–40 secondi.',
    revising: 'Claude sta rivedendo l’agente, di solito ci vogliono 15–40 secondi.',
    shortcut: 'Ctrl+Invio',
    whyChosen: 'Perché Claude ha scelto così',
    orTemplate: 'Oppure parti da un modello:',

    identityTitle: 'Nome e impiego',
    identityExplain: 'La descrizione è la parte più importante dell’agente: da essa Claude decide se un compito fa al caso suo.',
    nameLabel: 'Nome',
    nameHint: 'Lettere minuscole e trattini. Diventa il nome del file e il richiamo (@agent-nome).',
    colorLabel: 'Colore',
    whenLabel: 'Quando deve usarlo Claude?',
    whenHint: (chars: number): string => `Cosa fa e quando è adatto, in 1–3 frasi. Esempio: «Controlla le modifiche al codice. Use when …» · ${chars} caratteri`,
    whenPlaceholder: 'Controlla le modifiche recenti al codice alla ricerca di errori e vulnerabilità. Use when il codice è stato modificato, prima del commit.',
    proactiveLabel: 'Usa in autonomia',
    proactiveDescription: 'Aggiunge «Use proactively.»: Claude affida i compiti adatti senza che glielo chieda. Disattivato: solo quando il compito corrisponde chiaramente o lo nomini.',

    placeTitle: 'Posizione',
    placeExplain: 'Gli agenti personali valgono per tutti i progetti sul computer. Gli agenti di progetto stanno nel progetto, viaggiano con Git e hanno la precedenza a parità di nome.',
    host: 'Computer',
    appliesTo: 'Vale per',
    allProjects: 'Tutti i progetti',
    oneProject: 'Un progetto',
    project: 'Progetto',
    noProjects: (host: string): string => `Nessun progetto su ${host}`,

    modelTitle: 'Modello e ragionamento',
    modelExplain: 'Modelli economici per lavori semplici e voluminosi; modelli potenti solo dove serve davvero ragionare.',
    modelLabel: 'Modello',
    modelInheritExplain: 'Nessun modello proprio: usa quello con cui stai usando Claude.',
    customModel: 'ID modello personalizzato nel file:',
    customModelReplace: 'Una scelta qui sopra lo sostituisce.',
    effortLabel: 'Impegno',
    sessionLabel: 'Come la sessione',
    effortInheritExplain: 'Adotta l’impegno di ragionamento della sessione in corso.',

    skillsTitle: 'Precarica Skill',
    skillsExplain: 'Gli agenti non vedono le tue Skill in automatico. Le Skill precaricate entrano per intero nel suo contesto all’avvio, quindi scegli solo ciò che gli serve quasi sempre.',
    skillsChosen: (n: number): string => `${n} selezionate`,

    rightsTitle: 'Permessi e comportamento',
    rightsExplain: 'Quanto può fare senza chiedere e come lavora. Per i revisori «Solo pianificare» è l’impostazione sicura.',
    rightsLabel: 'Permessi',
    rightsInheritExplain: 'Adotta i permessi della sessione da cui viene avviato.',
    memoryLabel: 'Memoria',
    memoryOff: 'Disattivata',
    memoryOffExplain: 'Parte ogni volta senza ricordi.',
    maxTurnsLabel: 'Massimo di turni',
    unlimitedPlaceholder: 'illimitati',
    maxTurnsHint: 'Freno contro i cicli infiniti. Poi restituisce un risultato parziale.',
    worktreeLabel: 'Worktree dedicato',
    worktreeDescription: 'Lavora in una copia Git; utile quando più agenti modificano in parallelo.',
    backgroundLabel: 'In background',
    backgroundDescription: 'Claude non lo aspetta e continua a lavorare.',

    promptTitle: 'Istruzioni',
    promptExplain: 'Il suo prompt di sistema. Non conosce la vostra conversazione, solo questo testo e il compito che Claude gli affida. Ruolo, procedura, forma della risposta e limiti.',
    insertOutline: 'Inserisci struttura',
    promptChars: (n: number): string => `${n} caratteri · Markdown`,
    initialLabel: 'Primo messaggio come agente principale',
    initialPlaceholder: 'facoltativo, es. «Inizia con git status»',
    initialHint: 'Solo con claude --agent: viene inviato automaticamente come primo messaggio.',

    sideQuality: 'Controllo qualità',
    noFindings: 'Nessuna segnalazione.',
    sectionsNav: 'Sezioni',
    filePreviewAria: 'Anteprima del file',
    filePreview: 'Così sarà il file',
    alsoPreserved: (keys: string): string => `Resta inoltre invariato: ${keys}`
  },

  fields: {
    colorGroup: 'Colore',
    noColor: 'Nessun colore',
    presets: 'Selezione rapida',
    inheritAllNote: 'Nessuna selezione significa: l’agente eredita **tutti** gli strumenti della sessione. Spunta gli strumenti per limitarlo.',
    moreTools: 'Altri strumenti',
    moreToolsPlaceholder: 'es. mcp__github__get_issue, Bash(git diff *)',
    moreToolsHint: 'Separa strumenti MCP e pattern con una virgola. Claude ignora in silenzio gli errori di battitura, il controllo qualità li segnala.',
    filterSkills: 'Filtra Skill',
    searchSkill: 'Cerca Skill',
    noSkillMatch: 'Nessuna Skill corrisponde alla ricerca.',
    noSkillsFound: 'Nessuna Skill trovata. Il catalogo carica le Skill da ~/.claude/skills e dai plugin.'
  },

  toolGroups: { read: 'Lettura', write: 'Scrittura', exec: 'Esecuzione', web: 'Web', meta: 'Controllo' },
  tools: {
    Read: { label: 'Leggere file', explain: 'Apre i file, anche immagini e PDF.' },
    Grep: { label: 'Cercare nei contenuti', explain: 'Cerca testo in molti file contemporaneamente.' },
    Glob: { label: 'Trovare file', explain: 'Trova file tramite pattern come **/*.ts.' },
    Edit: { label: 'Modificare file', explain: 'Sostituisce parti precise di file esistenti.' },
    Write: { label: 'Creare file', explain: 'Scrive file nuovi o li sovrascrive per intero.' },
    NotebookEdit: { label: 'Modificare notebook', explain: 'Modifica le celle nei notebook Jupyter.' },
    Bash: { label: 'Eseguire comandi', explain: 'Esegue comandi di shell: test, Git, build. Lo strumento più potente.' },
    PowerShell: { label: 'PowerShell', explain: 'Esegue comandi PowerShell (Windows).' },
    WebSearch: { label: 'Cercare sul web', explain: 'Cerca informazioni aggiornate su Internet.' },
    WebFetch: { label: 'Leggere pagine web', explain: 'Carica un indirizzo e ne legge il contenuto.' },
    Agent: { label: 'Avviare altri agenti', explain: 'Può incaricare a sua volta dei sotto-agenti.' },
    Skill: { label: 'Usare Skill', explain: 'Può caricare e seguire le Skill.' },
    TodoWrite: { label: 'Elenco attività', explain: 'Tiene una propria checklist per i compiti lunghi.' }
  },
  presets: {
    read: { label: 'Sola lettura', explain: 'Sicuro per revisori e ricerca nel codice' },
    edit: { label: 'Lettura e modifica', explain: 'Per agenti che scrivono codice, senza comandi' },
    dev: { label: 'Sviluppo', explain: 'Modifica più test e Git tramite la shell' },
    web: { label: 'Ricerca web', explain: 'Cercare e leggere su Internet, scrivere note' },
    all: { label: 'Eredita tutti', explain: 'Nessuna restrizione, compresi gli strumenti MCP' }
  },
  options: {
    model: {
      inherit: { label: 'Come la sessione principale', explain: 'Usa il modello con cui stai usando Claude adesso.' },
      haiku: { label: 'Haiku', explain: 'Veloce ed economico. Ottimo per ricerche, riassunti, controlli semplici.' },
      sonnet: { label: 'Sonnet', explain: 'Equilibrato. Una buona scelta di base per la maggior parte degli agenti.' },
      opus: { label: 'Opus', explain: 'Forte nei compiti difficili, più lento e più costoso.' },
      fable: { label: 'Fable', explain: 'Il modello più grande, per lavori molto impegnativi.' }
    },
    effort: {
      low: { label: 'Basso', explain: 'Poco ragionamento, risposte rapide.' },
      medium: { label: 'Medio', explain: 'Qualche valutazione prima di agire.' },
      high: { label: 'Alto', explain: 'Ragionamento approfondito, ottimo per revisioni e pianificazione.' },
      xhigh: { label: 'Molto alto', explain: 'Per errori insidiosi e questioni di architettura.' },
      max: { label: 'Massimo', explain: 'Più ragionamento possibile, lento e costoso.' }
    },
    permission: {
      default: { label: 'Chiedere', explain: 'Chiede prima di modifiche e comandi. Senza qualcuno a controllare, questi passaggi vengono rifiutati.' },
      acceptEdits: { label: 'Modifiche consentite', explain: 'Può modificare i file senza chiedere, per i comandi chiede.' },
      auto: { label: 'Automatico', explain: 'Claude decide da solo cosa è consentito, con un controllo di sicurezza.' },
      dontAsk: { label: 'Non chiedere', explain: 'Non chiede mai; ciò che non è autorizzato viene rifiutato.' },
      plan: { label: 'Solo pianificare', explain: 'Legge e pianifica, non modifica nulla. Ottimo per i revisori.' },
      bypassPermissions: { label: 'Tutto consentito', explain: 'Nessuna domanda e nessun blocco. Da usare solo in cartelle sicure.' }
    },
    memory: {
      user: { label: 'Per me', explain: 'Ricorda le cose tra i progetti nella tua cartella utente.' },
      project: { label: 'Nel progetto', explain: 'La memoria sta nel progetto e viaggia con Git.' },
      local: { label: 'Solo locale', explain: 'Memoria nel progetto, ma non in Git.' }
    }
  },

  lint: {
    nameMissing: 'Manca il nome. Claude richiama l’agente con questo nome.',
    nameFormat: 'Il nome può contenere solo lettere minuscole, cifre e trattini, es. «code-reviewer».',
    descriptionMissing: 'Manca la descrizione. Senza di essa Claude non sa quando l’agente è adatto.',
    descriptionShort: 'Descrizione molto breve. Indica in concreto a cosa serve e quando Claude deve usarlo.',
    descriptionLong: 'Descrizione lunga. Viene caricata in ogni sessione; i dettagli vanno nelle istruzioni.',
    noTrigger: 'Nessun criterio di attivazione riconoscibile. Formula «Use when …».',
    notProactive: 'Se Claude deve usarlo di sua iniziativa, aggiungi «Use proactively …». Altrimenti solo quando lo nomini.',
    promptMissing: 'Mancano le istruzioni. L’agente parte senza conoscenze preliminari; qui si spiega come lavora.',
    promptShort: 'Istruzioni molto brevi. Descrivi ruolo, procedura e forma della risposta.',
    promptLong: 'Istruzioni molto lunghe. Le conoscenze ricorrenti sono più adatte a una Skill che l’agente precarica.',
    noOutput: 'Nessuna indicazione sull’output. Di’ cosa deve tornare (es. «elenco con file:riga, al massimo 200 parole»), altrimenti inonda il contesto principale.',
    noLimits: 'Nessun limite indicato. Una sezione «Limiti» evita modifiche indesiderate.',
    inheritsAllTools: 'Eredita tutti gli strumenti. Meno strumenti rendono l’agente più sicuro e più mirato.',
    manyTools: 'Molti strumenti. Dai solo ciò che serve all’agente per il suo compito.',
    unknownTools: (names: string): string => `Strumenti sconosciuti: ${names}. Gli errori di battitura vengono ignorati in silenzio.`,
    reviewWrites: 'Sembra un compito di controllo o ricerca, ma può modificare. «Sola lettura» o la modalità «Solo pianificare» sarebbero più sicure.',
    bypass: '«Tutto consentito» disattiva tutte le richieste di sicurezza. Usalo solo in cartelle in cui nulla può rompersi.',
    haikuTip: 'La sola ricerca con Haiku è più rapida ed economica.',
    manySkills: 'Ogni Skill precaricata entra per intero nel contesto. Precarica solo lo stretto necessario.'
  },

  service: {
    notMarkdown: (path: string): string => `«${path}» non è un file Markdown.`,
    pluginCopyOnly: 'Questo agente appartiene a un plugin e può essere salvato solo come copia.',
    deleteOnlyOwn: 'È possibile eliminare solo agenti personali di una cartella .claude/agents.',
    fileLabel: (path: string): string => `File agente ${path}`,
    reloadHint: 'Ricarica l’elenco.',
    ideaTooShort: 'Descrivi in una o due frasi cosa deve fare l’agente.',
    currentMissing: 'Per migliorare manca l’agente attuale.',
    pickProject: 'Scegli un progetto: gli agenti di progetto stanno nella cartella di un progetto dell’elenco.',
    noJson: 'La risposta non conteneva un oggetto JSON',
    unreadableJson: (detail: string): string => `JSON non leggibile: ${detail}`,
    notObject: 'La risposta non era un oggetto',
    incompleteAnswer: 'Nella risposta mancano nome, descrizione o istruzioni'
  },

  store: {
    discardTitle: 'Scartare le modifiche?',
    discardMessage: 'L’agente non è ancora salvato.',
    discard: 'Scarta',
    saved: (name: string): string => `Agente «${name}» salvato`,
    deleteTitle: (name: string): string => `Eliminare l’agente «${name}»?`,
    deleteMessage: (path: string): string => `Il file ${path} verrà rimosso. Le automazioni con questo agente non funzioneranno più.`,
    delete: 'Elimina',
    deleted: (name: string): string => `Agente «${name}» eliminato`
  },

  promptOutline: [
    'Sei <ruolo in una frase>.',
    '',
    '## Compito',
    '<Cosa svolgi e cosa deve esserci alla fine.>',
    '',
    '## Procedura',
    '1. <Primo passo>',
    '2. <Secondo passo>',
    '3. <Verificare che il risultato sia corretto>',
    '',
    '## Output',
    '<Forma della risposta all’agente principale: es. breve elenco con file:riga, al massimo 200 parole.>',
    '',
    '## Limiti',
    '- <Cosa non fai mai, es. non fare commit, non modificare file fuori da src/>'
  ].join('\n'),

  templates: {
    reviewer: {
      label: 'Revisore di codice',
      explain: 'Legge le modifiche e segnala errori, non cambia nulla',
      description: 'Controlla le modifiche recenti al codice alla ricerca di errori, vulnerabilità e punti poco chiari. Use proactively after larger changes, before committing (dopo modifiche importanti, prima del commit).',
      prompt: [
        'Sei un revisore di codice esperto. Non modifichi nulla, trovi problemi.',
        '',
        '## Procedura',
        '1. Ottieni le modifiche con `git diff` (e `git diff --staged`).',
        '2. Leggi i file interessati nel loro contesto, non solo le righe modificate.',
        '3. Cerca errori reali: logica sbagliata, gestione degli errori mancante, vulnerabilità, casi limite.',
        '4. Verifica ogni riscontro prima di segnalarlo. Nessuna ipotesi spacciata per fatto.',
        '',
        '## Output',
        'Un elenco, dai più gravi. Per ogni riscontro: `file:riga`, una frase sul problema, una frase sulla soluzione.',
        'Niente questioni di stile, niente elogi. Se non trovi nulla di grave, dillo esattamente così in una frase.',
        '',
        '## Limiti',
        '- Non modificare file, non fare commit.'
      ].join('\n')
    },
    researcher: {
      label: 'Esploratore di codice',
      explain: 'Cerca rapidamente nel progetto e riassume',
      description: 'Scopre dove e come qualcosa è implementato nel codice e restituisce un breve riepilogo con i punti trovati. Use proactively when many files need to be searched (quando bisogna cercare in molti file).',
      prompt: [
        'Cerchi nel codice e riferisci in breve cosa hai trovato.',
        '',
        '## Procedura',
        '1. Cerca in modo ampio con Glob e Grep, poi leggi solo i punti rilevanti.',
        '2. Segui le chiamate fino all’implementazione vera e propria.',
        '',
        '## Output',
        'Al massimo 150 parole più un elenco `file:riga – cosa succede lì`. Non restituire file interi.'
      ].join('\n')
    },
    tester: {
      label: 'Autore di test',
      explain: 'Scrive ed esegue test per il nuovo codice',
      description: 'Scrive i test mancanti per codice nuovo o modificato e li esegue. Use when new features were added without tests (quando sono nate nuove funzioni senza test).',
      prompt: [
        'Scrivi test nello stile del progetto.',
        '',
        '## Procedura',
        '1. Scopri quale framework di test e quali pattern usa il progetto (leggi i test esistenti).',
        '2. Scrivi test sul comportamento, non sui dettagli di implementazione. Prima i casi limite.',
        '3. Esegui i test. Se un test fallisce, verifica se è sbagliato il test o il codice.',
        '',
        '## Output',
        'Quali test hai creato, il risultato dell’esecuzione e gli errori trovati nel codice.',
        '',
        '## Limiti',
        '- Non modificare il codice di produzione, solo segnalare.'
      ].join('\n')
    },
    web: {
      label: 'Ricercatore web',
      explain: 'Fa ricerche su Internet con fonti',
      description: 'Ricerca una domanda su Internet e restituisce una risposta documentata con fonti. Use when current information, prices or documentation are needed (quando servono informazioni aggiornate, prezzi o documentazione).',
      prompt: [
        'Fai ricerche approfondite e non inventi nulla.',
        '',
        '## Procedura',
        '1. Cerca con più formulazioni, in italiano e in inglese.',
        '2. Leggi tu stesso i risultati migliori. Preferisci fonti ufficiali e dati recenti.',
        '3. Se le fonti si contraddicono, cita entrambe.',
        '',
        '## Output',
        'Risposta in al massimo 200 parole, poi le fonti come elenco con link e data.',
        '',
        '## Limiti',
        '- Cita solo link che hai davvero aperto.'
      ].join('\n')
    },
    docs: {
      label: 'Autore di documentazione',
      explain: 'Mantiene aggiornati README e documentazione',
      description: 'Aggiorna README e documentazione in modo coerente con il codice attuale. Use when features, commands or settings were changed (quando funzioni, comandi o impostazioni sono cambiati).',
      prompt: [
        'Mantieni aggiornata la documentazione di un progetto.',
        '',
        '## Procedura',
        '1. Leggi README e documentazione esistente, poi il codice a cui si riferiscono.',
        '2. Correggi ciò che non è più vero. Aggiungi solo ciò che manca davvero.',
        '3. Mantieni tono, lingua e struttura della documentazione esistente.',
        '',
        '## Output',
        'Elenco dei file modificati con una frase per modifica.',
        '',
        '## Limiti',
        '- Non modificare il codice. Nessun nuovo file di documentazione senza motivo.'
      ].join('\n')
    }
  },

  guide: {
    navAria: 'Indice',
    toc: { what: 'Cos’è un agente', compare: 'Agente, Skill, comando', decide: 'Come decide Claude', anatomy: 'Struttura di un file', rules: 'Regole per buoni agenti', settings: 'Tutte le impostazioni', automate: 'Automatizzare' },
    what: {
      p1: 'Un agente (in Claude Code «subagent») è uno **specialista con una propria finestra di contesto**. Claude gli affida un compito parziale, lui lo svolge con le proprie istruzioni, i propri strumenti e il proprio modello e restituisce solo il risultato. I passaggi intermedi, cioè centinaia di file letti o log lunghi, restano da lui.',
      p2: 'Così la sessione principale resta breve e chiara. Gli agenti sono adatti ai compiti che leggono molto e restituiscono poco: cercare nel codice, controllare modifiche, eseguire test, fare ricerche sul web.'
    },
    compare: {
      colWhat: 'Cos’è',
      colWhen: 'Quando usarlo',
      rows: [
        ['Agente', 'Un collaboratore a sé, con contesto, strumenti e modello propri', 'Un compito parziale concluso, i cui passaggi intermedi non serve vedere'],
        ['Skill', 'Conoscenze e istruzioni che Claude carica da solo quando servono', 'Una procedura ricorrente che Claude deve seguire nella stessa conversazione'],
        ['Comando', 'Un prompt salvato che avvii con /nome', 'Qualcosa che avvii tu stesso con regolarità']
      ]
    },
    decide: {
      auto: '**Automaticamente:** Claude conosce nome e descrizione di tutti gli agenti. Se un compito corrisponde a una descrizione, Claude lo affida. Con «Use proactively» nella descrizione lo fa molto più volentieri.',
      targeted: '**Direttamente:** scrivi `@agent-nome` oppure «Usa l’agente code-reviewer per …».',
      session: '**Come intera sessione:** `claude --agent nome` avvia Claude direttamente come quell’agente, con i suoi strumenti e le sue istruzioni.',
      precedence: 'Se esistono due agenti con lo stesso nome, vince quello del progetto su quello personale, e quello personale su quello di un plugin.'
    },
    anatomy: {
      intro: 'Un agente è un file Markdown in `~/.claude/agents/` (per tutti i progetti) o `<progetto>/.claude/agents/`. In alto c’è il frontmatter con le impostazioni, sotto le istruzioni.',
      parts: [
        { code: '---\nname: code-reviewer', title: 'Nome', text: 'Univoco, lettere minuscole e trattini. Con questo lo richiami: @agent-code-reviewer.' },
        {
          code: 'description: "Controlla le modifiche al codice.\n  Use proactively after larger changes."',
          title: 'Descrizione',
          text: 'Il criterio di attivazione. Claude legge solo questa riga per decidere se è adatto. Cosa e quando, non come.'
        },
        { code: 'tools: Read, Grep, Glob, Bash', title: 'Strumenti', text: 'Strumenti consentiti. Se manca la riga, li eredita tutti. Un revisore non ha bisogno di Write.' },
        { code: 'model: sonnet\neffort: high\npermissionMode: plan\n---', title: 'Modello e permessi', text: 'Facoltativo. Senza indicazione adotta ciò che usa la sessione.' },
        {
          code: 'Sei un revisore di codice esperto.\n\n## Procedura\n1. Leggere git diff …\n\n## Output\nElenco con file:riga …\n\n## Limiti\n- Non modificare nulla.',
          title: 'Istruzioni',
          text: 'Il suo prompt di sistema. Non vede la vostra conversazione, solo questo testo e il compito che Claude gli affida.'
        }
      ]
    },
    rules: {
      items: [
        { title: 'Un compito per agente', text: '«Controlla il codice» e «scrive documentazione» sono due agenti. Gli agenti tuttofare non vengono mai scelti in modo affidabile.' },
        { title: 'La descrizione è un criterio di attivazione', text: 'Formula quando è adatto: «Use when …», «Use proactively after …». I dettagli della procedura vanno nelle istruzioni, perché la descrizione viene caricata in ogni sessione.' },
        { title: 'Il minor numero di strumenti possibile', text: 'Privilegio minimo: i lettori ricevono Read, Grep, Glob. Meno strumenti significa meno rischio e lavoro più mirato.' },
        { title: 'Definire la risposta', text: 'Di’ esattamente cosa torna: «elenco con file:riga, al massimo 200 parole». Altrimenti inonda il contesto dell’agente principale, ed è proprio ciò che un agente deve evitare.' },
        { title: 'Fornire tutto il necessario', text: 'Parte senza conoscenze preliminari. Regole del progetto, percorsi e comandi stanno nelle istruzioni o in una Skill precaricata.' },
        { title: 'Il modello giusto', text: 'Haiku per cercare e riassumere, Sonnet come standard, Opus solo per il lavoro di ragionamento difficile. Così risparmi quota.' },
        { title: 'Indicare i limiti', text: 'Cosa non fa mai: fare commit, push, modificare file fuori da una cartella. Per i revisori in più «Solo pianificare».' }
      ],
      note: 'Il controllo qualità nel builder verifica in tempo reale la maggior parte di queste regole.'
    },
    settings: {
      colField: 'Campo',
      colMeaning: 'Significato',
      colAdvice: 'Consiglio',
      rows: [
        ['name', 'Nome e richiamo', 'Obbligatorio. Breve, descrive il ruolo.'],
        ['description', 'Quando Claude lo usa', 'Obbligatorio. 1–3 frasi con criterio di attivazione.'],
        ['tools', 'Strumenti consentiti', 'Se omesso eredita tutti; altrimenti un elenco.'],
        ['disallowedTools', 'Strumenti bloccati', 'Quando quasi tutto deve essere consentito, tranne ad es. Write.'],
        ['model', 'Modello', 'haiku, sonnet, opus, fable o inherit.'],
        ['effort', 'Impegno', 'da low a max; alto per controllare e pianificare.'],
        ['permissionMode', 'Permessi senza domande', 'plan per i revisori, acceptEdits per chi scrive.'],
        ['maxTurns', 'Numero massimo di passi', 'Freno contro i cicli infiniti.'],
        ['skills', 'Skill precaricate', 'Solo ciò che gli serve quasi sempre.'],
        ['memory', 'Memoria tra le esecuzioni', 'project, se deve imparare dalle esecuzioni precedenti.'],
        ['isolation', 'Worktree Git dedicato', 'worktree, quando più agenti modificano in parallelo.'],
        ['background', 'Eseguito in background', 'Per compiti lunghi che Claude non deve aspettare.'],
        ['color', 'Colore nell’interfaccia', 'Solo visualizzazione.'],
        ['hooks, mcpServers', 'Hook e server MCP propri', 'Per utenti esperti; il builder li lascia invariati.']
      ]
    },
    automate: {
      p1: 'Ogni agente può funzionare senza di te. Nell’area **Automazione** stabilisci quale agente riceve quale compito, quando e in quale progetto, ad esempio nei giorni feriali alle 8 «Controlla le modifiche di ieri». L’app lo avvia poi con `claude -p --agent nome` sul computer scelto, salva il risultato e ti avvisa quando ha finito. Per questo non servono n8n né altri programmi aggiuntivi.',
      p2: 'Le esecuzioni pianificate partono finché l’app è aperta. Se la quota nella finestra di 5 ore è quasi esaurita, vengono saltate invece di svuotarla.',
      toAutomations: 'Vai all’automazione'
    }
  }
}
