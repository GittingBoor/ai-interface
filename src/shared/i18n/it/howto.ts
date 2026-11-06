import type { Messages } from '../messages'

export const howto: Messages['howto'] = {
  searchLabel: 'Cerca scorciatoie',
  searchPlaceholder: 'Cerca scorciatoie …',
  sectionAria: 'Scorciatoie e trucchi',
  clearSearch: 'Cancella la ricerca',
  nothingFound: (query: string): string => `Nessun risultato per “${query}”.`,
  groups: { speech: 'Input vocale', app: 'AI Interface', windows: 'Windows', claude: 'Claude Code' },
  keys: { mic: 'Microfono', arrow: 'Freccia', star: 'Stella' },
  entries: {
    dictate: { title: 'Dettare', description: 'Un clic avvia la registrazione, un secondo clic riconosce il parlato e inserisce il testo. Non viene mai inviato nulla in automatico.' },
    discard: { title: 'Scartare la registrazione', description: 'Interrompe un dettato in corso senza inserire nulla.' },
    dictateKeys: { title: 'Dettare da tastiera', description: 'Avvia/ferma il dettato per l’assistente (con il focus) o per il terminale attivo. Attivalo qui sopra.' },
    switchModel: { title: 'Cambiare modello', description: 'Freccia accanto al microfono: Veloce, Standard o Preciso.' },
    windowsDictation: { title: 'Dettatura di Windows', description: 'Input vocale a livello di sistema in qualsiasi campo di testo, senza configurazione, riconosce peggio di Whisper.' },
    voiceMode: { title: 'Modalità vocale di Claude Code', description: 'Se la tua versione di Claude Code la supporta: dettare direttamente nel terminale tramite il servizio di Anthropic.' },
    palette: { title: 'Ricerca / palette dei comandi', description: 'Trovare aree, progetti e azioni.' },
    assistant: { title: 'Assistente', description: 'Mostrare o nascondere l’assistente IA, anche dal terminale.' },
    areas: { title: 'Aree', description: (a: string, b: string, c: string): string => `Passare direttamente a ${a}, ${b}, ${c} … (i numeri sono nella barra laterale).` },
    newTerminal: { title: 'Nuovo terminale', description: 'Aprire la finestra di avvio nell’area Terminale.' },
    newLine: { title: 'A capo nel terminale', description: (ctrlEnter: string): string => `A capo in Claude Code invece di inviare (funziona anche ${ctrlEnter}).` },
    pasteImage: { title: 'Immagine nel terminale', description: 'Un’immagine dagli appunti viene salvata e inserita come percorso.' },
    starSource: {
      title: 'Fonte nella barra laterale',
      description: (sources: string, websites: string, ai: string): string =>
        `In “${sources}” contrassegna una pagina web con la stella: comparirà sotto “${websites}”. Le pagine lette da Claude vengono archiviate dall’app sotto “${ai}”.`
    },
    clipboardHistory: { title: 'Cronologia degli appunti', description: 'Scegliere testi e immagini copiati in precedenza.' },
    screenshot: { title: 'Ritaglio dello schermo', description: (paste: string): string => `Copia il ritaglio negli appunti, poi incollalo nel terminale con ${paste}.` },
    emoji: { title: 'Emoji e caratteri speciali', description: 'Selettore di emoji in qualsiasi campo di testo.' },
    switchMode: { title: 'Cambiare modalità', description: 'Passare tra modalità normale, auto-accept e piano.' },
    rewind: { title: 'Riavvolgere', description: 'Tornare a un messaggio precedente e ripartire da lì.' },
    commands: { title: 'Comandi', description: 'Comandi slash e skill, ad es. /help, /clear, /compact.' },
    mention: { title: 'Menzionare un file', description: 'Inserire nel messaggio il percorso di un file con il completamento automatico.' },
    interrupt: { title: 'Interrompere la risposta', description: 'Fermare la risposta in corso; la cronologia resta.' }
  }
}
