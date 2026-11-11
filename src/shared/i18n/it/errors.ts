import type { Messages } from '../messages'

export const errors: Messages['errors'] = {
  hostUnreachable: { message: (host, cause) => `${host} non è raggiungibile: ${cause}`, hint: 'Controlla la rete e le impostazioni SSH.' },
  notFound: (what) => `${what} non è stato trovato.`,
  validationHint: 'Correggi l’input e riprova.',
  quotaFormat: {
    message: (detail) => `Formato della risposta sulla quota sconosciuto (${detail}).`,
    hint: 'Aggiorna Claude Code; fino ad allora l’app non mostra alcun valore invece di valori errati.'
  },
  summaryFailed: {
    message: (name, cause) => `Riepilogo per “${name}” non riuscito: ${cause}`,
    hint: 'Controlla Claude Code (accesso effettuato, quota disponibile) e riavvia; i riepiloghi già pronti restano.'
  },
  claudeCli: {
    message: (detail) => `Impossibile eseguire Claude Code (${detail}).`,
    hint: 'Controlla che Claude Code sia installato e che l’accesso sia effettuato (avvia claude nel terminale).'
  },
  gitFailed: { message: (action, cause) => `${action} non riuscito: ${cause}`, hint: 'Controlla che Git sia installato e che la cartella sia scrivibile.' },
  speechUnsupported: { message: 'L’input vocale è configurato solo su Windows.', hint: 'Usalo su Windows oppure usa Win+H o /voice in Claude Code.' },
  whisperNotInstalled: { message: (model) => `Il riconoscimento vocale “${model}” non è configurato.`, hint: 'Scarica il modello nella scheda Controllo.' },
  whisperStart: {
    message: (detail) => `Impossibile avviare il riconoscimento vocale (${detail}).`,
    hint: 'Aggiorna il driver grafico o scegli un modello più piccolo in Controllo; i dettagli sono nel log.'
  },
  transcription: { message: (detail) => `Riconoscimento vocale non riuscito (${detail}).`, hint: 'Parla di nuovo; se succede ancora, riavvia l’app.' },
  emptyTranscript: { message: 'Nulla riconosciuto.', hint: 'Avvicinati al microfono e parla un po’ più forte.' },
  download: { message: (what, detail) => `Download di ${what} non riuscito (${detail}).`, hint: 'Controlla la connessione a Internet e riprova.' },
  downloadChecksum: {
    message: (what) => `Il checksum di ${what} non corrisponde, il file è stato eliminato.`,
    hint: 'Scarica di nuovo; se si ripete, la fonte è stata modificata.'
  },
  downloadCancelled: { message: 'Download annullato.' },
  speechBusy: { message: (model) => `“${model}” è già in download.`, hint: 'Attendi la fine del download oppure annullalo.' },
  privacyLocked: { message: 'La modalità privata è attiva.', hint: 'Sbloccala con il PIN nelle impostazioni.' },
  wrongPin: { message: 'PIN errato.', tooMany: (waitSec) => `Troppi tentativi falliti, attendi ${waitSec} s.`, hint: 'Inserisci di nuovo il PIN.' },
  invalidPin: { message: 'Il PIN deve essere composto da 4 a 12 cifre.', hint: 'Usa solo cifre.' },
  pinRequired: { message: 'Per la modalità privata non è ancora stato impostato alcun PIN.', hint: 'Imposta un nuovo PIN: la modalità privata verrà sbloccata.' },
  updateFailed: {
    message: (step, detail) => `Aggiornamento non riuscito durante “${step}” (${detail}).`,
    hint: 'Esegui manualmente git pull e npm run dist:win nel repository; i dettagli sono nel log.'
  },
  terminalBusy: { message: (terminal) => `${terminal} è ancora al lavoro.`, hint: 'Attendi la riga di stato “[AI Interface] … terminato” e invia di nuovo.' },
  orchestratorUnavailable: {
    message: (detail) => `Orchestratore non disponibile: ${detail}`,
    hint: 'Nelle impostazioni, in “Orchestratore”, controlla che sia attivo; i dettagli sono nel log.',
    disabled: 'disattivato nelle impostazioni.'
  },
  agentAssist: {
    message: (detail: string): string => `Claude non ha fornito una bozza di agent utilizzabile: ${detail}`,
    hint: 'Descrivi l’idea con un po’ più di dettaglio e riprova.'
  },
  agentExists: {
    message: (name: string): string => `In questa posizione esiste già un agent “${name}”.`,
    hint: 'Scegli un altro nome o modifica l’agent esistente.'
  },
  automationRun: {
    message: (detail: string): string => `Esecuzione non riuscita: ${detail}`,
    hint: 'Controlla l’output nella cronologia; Claude è in esecuzione su questo computer (accesso effettuato, quota disponibile)?'
  },
  ipc: { message: (detail: string): string => `Connessione al processo in background non riuscita: ${detail}`, hint: 'Riavvia l’app; i dettagli sono nel log.' },
  unknown: 'Errore sconosciuto',
  unexpectedHint: 'I dettagli sono nel log (Impostazioni → Apri log).',
  hostKeyMismatch: {
    message: (label) => `La chiave SSH di “${label}” è cambiata, connessione rifiutata.`,
    hint: (label) => `Se “${label}” è stato reinstallato: Impostazioni → Dispositivi → reimposta l’impronta.`
  },
  todoNotFound: { message: 'La voce non esiste più nel file TODO.', hint: 'Ricarica i TODO: il file è stato modificato dall’esterno.' },
  vaultMissing: { message: 'Nessun vault Obsidian configurato.', hint: 'Scegli una cartella vault nelle impostazioni, in “Note”.' },
  todoConflict: { message: 'Il file TODO è in modifica altrove in questo momento.', hint: 'Attendi un attimo e riprova.' },
  todoEmpty: 'Il testo del TODO non può essere vuoto.',
  todoNewline: 'Il testo del TODO non può contenere a capo.',
  todoDateInvalid: (due) => `Data “${due}” non valida, previsto AAAA-MM-GG.`,
  what: {
    project: (id) => `Progetto ${id}`,
    category: (id) => `Tipo ${id}`,
    image: (id) => `Immagine ${id}`,
    model: (id) => `Modello ${id}`,
    source: (id) => `Fonte ${id}`,
    terminal: 'Terminale',
    terminalId: (id) => `Terminale ${id}`,
    entry: (id) => `Voce ${id}`,
    folder: (path) => `La cartella ${path}`,
    device: (id) => `Dispositivo “${id}”`,
    gitState: (path) => `Stato Git di ${path}`,
    claudeMdOpener: 'Un programma per aprire CLAUDE.md'
  },
  hints: {
    createDevice: 'Aggiungilo nelle impostazioni, in Dispositivi, oppure rimuovi il progetto.',
    gitRepo: 'Controlla che la cartella sia un repository Git.',
    checkFavoritePath: 'Controlla il percorso del preferito.',
    reloadCatalog: 'Ricarica il catalogo e riprova.',
    reopenTab: 'Chiudi la scheda e riaprila.'
  },
  assistant: {
    busy: 'L’assistente è ancora in esecuzione. Attendi oppure premi “Stop”.',
    failed: 'L’assistente si è interrotto con un errore.',
    hint: 'Controlla che Claude Code abbia effettuato l’accesso e che la quota sia disponibile (in basso a sinistra).',
    invalidInput: (detail) => `Input non valido: ${detail}`,
    pathOutside: (target, root) => `Il percorso ${target} non si trova in ${root}.`,
    projectNameInvalid: (name) => `Il nome progetto “${name}” non è valido (niente caratteri di percorso come / \\ : * ? " < > |).`,
    categoryUnknown: (category, root, available) => `La categoria “${category}” non esiste in ${root} (disponibili: ${available}).`,
    claudeNotFound: 'Claude Code non è stato trovato',
    commandNotFound: (command) => `“${command}” non trovato`
  },
  timeout: (seconds) => `Limite di tempo di ${seconds} s superato`,
  favorites: {
    categoryNameEmpty: 'Il nome del tipo non può essere vuoto.',
    categoryExists: (name) => `Il tipo “${name}” esiste già.`,
    nameAndPathEmpty: 'Nome e percorso non possono essere vuoti.',
    folderIsProject: (path) => `La cartella ${path} è già un progetto.`,
    colorInvalid: (color) => `Il colore “${color}” non è valido, previsto #rrggbb o #rgb (es. #e08a4f).`,
    iconInvalid: (icon) => `L’icona “${icon}” non è valida: scegli un emoji o il nome di un’icona Lucide.`
  },
  ssh: {
    disabled: 'disattivato nelle impostazioni',
    keyPassphrase: (path) => `La chiave SSH ${path} ha una passphrase; avvia l’agente SSH (ssh-add)`,
    keyMissing: (path) => `La chiave SSH ${path} manca e nessun agente SSH è in esecuzione`,
    homeUnknown: 'Impossibile determinare la cartella home',
    commandFailed: (label, code, stderr) => `Comando su “${label}” non riuscito (${code}): ${stderr}`
  },
  images: {
    extensionUnsupported: (extension, allowed) => `Tipo di file .${extension} non supportato (consentiti: ${allowed}).`,
    dropTooLarge: (name, limit) => `“${name}” è troppo grande da trasferire (massimo ${limit}).`,
    dropUnreadable: (name) => `Impossibile leggere “${name}”. Le cartelle si possono trascinare solo nei terminali locali.`
  },
  models: { nameRequired: 'Il modello ha bisogno di un nome.', ollamaNoAnswer: (code) => `Ollama non risponde (${code})` },
  minipc: { authMissing: 'La risposta del dispositivo non contiene dati di accesso.', gitError: 'Errore' },
  privacy: {
    unknownHost: (host, known) => `Computer “${host}” sconosciuto, previsti: ${known}.`,
    pickProjectFolder: 'Scegli una cartella di progetto, non la radice di un’unità o del file system.',
    alreadyPrivate: 'Questa cartella è già privata.'
  },
  quota: {
    notObject: 'non è un oggetto',
    missing: (kind) => `${kind} mancante`,
    utilizationMissing: (kind) => `${kind}.utilization mancante`,
    expiredHint: 'Avvia Claude Code una volta: l’accesso verrà rinnovato.',
    unavailableHint: 'Senza una fonte l’app non mostra alcun valore.',
    noConnection: 'Nessuna connessione ad Anthropic.',
    tooManyRequests: 'Troppe richieste (HTTP 429), nuovo tentativo più tardi.',
    loginExpired: 'L’accesso a Claude è scaduto.',
    requestFailed: (status) => `Richiesta non riuscita (HTTP ${status}).`,
    notJson: 'La risposta non era JSON.',
    noLogin: 'Nessun accesso a Claude trovato.',
    loginUnreadable: 'Il file di accesso di Claude Code non è leggibile.',
    noSubscription: 'Nessun accesso con abbonamento (claude.ai) trovato.'
  },
  setup: {
    invalidJson: (detail) => `JSON non valido: ${detail}`,
    invalidContent: (path, detail) => `Contenuto non valido in “${path}”: ${detail}`,
    rootPath: 'radice',
    unknown: 'sconosciuto',
    folderMissing: (path) => `La cartella ${path} non esiste.`,
    connected: (user, host) => `Connesso a ${user}@${host}.`,
    pickProjectsRoot: 'Scegli una cartella di progetto.',
    deviceIdInvalid: (id) => `L’ID dispositivo “${id}” non è valido o è duplicato.`
  },
  skills: { emptySummary: 'risposta vuota', unreadable: (path) => `${path}: non leggibile` },
  sources: { urlInvalid: 'L’indirizzo deve iniziare con http:// o https://, ad es. https://it.wikipedia.org/wiki/Trasformata_di_Fourier.', targetDuplicate: 'Questo indirizzo è già nella cartella di destinazione.', duplicate: 'Questo indirizzo è già in questa cartella.' },
  speech: {
    noFreePort: 'Nessuna porta libera trovata',
    noTextField: 'Risposta senza il campo “text”',
    noServerAnswer: 'whisper-server non risponde né con la GPU né con la CPU',
    startCancelled: 'Avvio annullato perché il riconoscimento vocale è stato terminato',
  },
  update: {
    releaseInstall: (url) => `Installato da una release: nuove versioni su ${url}`,
    noCommit: 'La build non contiene un identificatore di commit',
    repoMissing: (dir) => `Repository ${dir} mancante`,
    step: 'Controllo',
    nothingNewer: 'nessuna versione più recente su GitHub',
    notInRemote: (commit, ref) => `la versione installata ${commit} non è in ${ref}`,
    wrongBranch: (branch, expected) => `Il repository è sul branch ${branch} invece di ${expected}`,
    dirty: 'Il repository ha modifiche non committate',
    exitCode: (code) => `Codice di uscita ${code}`
  },
  vault: {
    invalidName: (name) => `Nome file “${name}” non valido.`,
    notProtocol: (path) => `“${path}” non è un registro di sessione di una cartella dei registri.`
  },
  links: {
    nameRequired: 'Inserisci un nome.',
    nameTaken: (name) => `Esiste già un collegamento chiamato “${name}”.`,
    urlRequired: 'Inserisci l’indirizzo della pagina.',
    urlInvalid: 'L’indirizzo deve iniziare con http:// o https://, ad es. http://192.168.1.20:8123.'
  }
}
