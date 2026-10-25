/** Kuratierte Emoji für Projekt- und Art-Symbole, mit deutschen Suchwörtern. */
export interface EmojiEntry {
  readonly emoji: string
  readonly words: string
}

export interface EmojiGroup {
  readonly label: string
  readonly entries: readonly EmojiEntry[]
}

const e = (emoji: string, words: string): EmojiEntry => ({ emoji, words })

export const EMOJI_GROUPS: readonly EmojiGroup[] = [
  {
    label: 'Technik',
    entries: [
      e('💻', 'laptop computer rechner programmieren code'),
      e('🖥️', 'bildschirm desktop pc monitor'),
      e('⌨️', 'tastatur tippen'),
      e('🖱️', 'maus'),
      e('🤖', 'roboter ki bot ai'),
      e('🧠', 'gehirn ki denken lernen'),
      e('⚙️', 'zahnrad einstellungen technik'),
      e('🔧', 'schraubenschlüssel werkzeug reparieren'),
      e('🛠️', 'werkzeug bauen tools'),
      e('🔌', 'stecker strom'),
      e('🔋', 'batterie akku energie'),
      e('💾', 'diskette speichern daten'),
      e('💿', 'cd disk'),
      e('📡', 'antenne funk satellit'),
      e('🛰️', 'satellit weltraum'),
      e('📱', 'handy smartphone app'),
      e('🧪', 'reagenzglas test experiment labor'),
      e('🧬', 'dna biologie genetik'),
      e('🔬', 'mikroskop forschung'),
      e('📟', 'pager gerät'),
      e('🕹️', 'joystick spiel game'),
      e('🎮', 'controller spiel game'),
      e('👾', 'alien spiel pixel retro'),
      e('🐛', 'käfer bug fehler'),
      e('🚀', 'rakete start launch deploy'),
      e('⚡', 'blitz schnell strom energie'),
      e('🌐', 'globus web internet netz'),
      e('🔒', 'schloss sicherheit privat'),
      e('🔑', 'schlüssel zugang passwort'),
      e('📦', 'paket modul box')
    ]
  },
  {
    label: 'Musik',
    entries: [
      e('🎵', 'note musik ton'),
      e('🎶', 'noten musik melodie'),
      e('🎸', 'gitarre rock musik'),
      e('🥁', 'schlagzeug trommel drums musik'),
      e('🎹', 'klavier piano keyboard musik'),
      e('🎺', 'trompete musik'),
      e('🎻', 'geige violine musik'),
      e('🎷', 'saxophon jazz musik'),
      e('🎤', 'mikrofon singen gesang'),
      e('🎧', 'kopfhörer hören audio'),
      e('🎼', 'partitur noten transkription'),
      e('📻', 'radio'),
      e('🔊', 'lautsprecher laut audio sound'),
      e('🎚️', 'regler mixer audio'),
      e('🎛️', 'mischpult regler synth')
    ]
  },
  {
    label: 'Haus',
    entries: [
      e('🏠', 'haus zuhause smarthome'),
      e('🏡', 'haus garten zuhause'),
      e('💡', 'glühbirne licht idee lampe'),
      e('🛋️', 'sofa wohnzimmer'),
      e('🛏️', 'bett schlafzimmer'),
      e('🚿', 'dusche bad'),
      e('🛁', 'badewanne bad'),
      e('🍳', 'pfanne küche kochen'),
      e('🧺', 'wäsche korb'),
      e('🌡️', 'thermometer temperatur heizung'),
      e('🔥', 'feuer heizung flamme'),
      e('❄️', 'schnee kalt kühlung'),
      e('🚪', 'tür eingang'),
      e('🪟', 'fenster'),
      e('🔔', 'glocke klingel benachrichtigung'),
      e('📷', 'kamera foto überwachung'),
      e('🧹', 'besen putzen'),
      e('🪴', 'topfpflanze pflanze'),
      e('🧯', 'feuerlöscher sicherheit'),
      e('🚗', 'auto garage')
    ]
  },
  {
    label: 'Uni',
    entries: [
      e('🎓', 'uni studium abschluss master bachelor'),
      e('📚', 'bücher lernen studium'),
      e('📖', 'buch lesen'),
      e('📝', 'notiz schreiben aufgabe'),
      e('✏️', 'bleistift schreiben'),
      e('🖊️', 'stift schreiben'),
      e('📐', 'geodreieck mathe geometrie'),
      e('📏', 'lineal messen'),
      e('🧮', 'abakus rechnen mathe'),
      e('📊', 'balkendiagramm statistik auswertung'),
      e('📈', 'diagramm steigend wachstum'),
      e('📉', 'diagramm fallend'),
      e('🗂️', 'karteikarten ordner'),
      e('📋', 'klemmbrett liste'),
      e('🏫', 'schule uni gebäude'),
      e('🧑‍🏫', 'lehrer dozent vorlesung'),
      e('🧑‍💻', 'programmierer entwickler coder'),
      e('🔭', 'teleskop astronomie'),
      e('⚗️', 'chemie labor'),
      e('📜', 'urkunde schriftrolle arbeit')
    ]
  },
  {
    label: 'Natur',
    entries: [
      e('🌱', 'keimling pflanze wachsen neu'),
      e('🌿', 'kraut blatt grün'),
      e('🍀', 'kleeblatt glück'),
      e('🌳', 'baum natur'),
      e('🌲', 'tanne wald'),
      e('🌵', 'kaktus wüste'),
      e('🌸', 'blüte kirschblüte frühling'),
      e('🌻', 'sonnenblume sommer'),
      e('🍁', 'ahornblatt herbst'),
      e('🌊', 'welle meer wasser'),
      e('⛰️', 'berg'),
      e('🌋', 'vulkan'),
      e('☀️', 'sonne wetter sommer'),
      e('🌙', 'mond nacht'),
      e('⭐', 'stern'),
      e('🌈', 'regenbogen'),
      e('☁️', 'wolke wetter cloud'),
      e('🌧️', 'regen wetter'),
      e('🌍', 'erde welt europa'),
      e('🔆', 'hell helligkeit')
    ]
  },
  {
    label: 'Tiere',
    entries: [
      e('🐱', 'katze'),
      e('🐶', 'hund'),
      e('🦊', 'fuchs'),
      e('🐻', 'bär'),
      e('🐼', 'panda'),
      e('🦉', 'eule weisheit'),
      e('🐦', 'vogel'),
      e('🦜', 'papagei'),
      e('🐧', 'pinguin linux'),
      e('🐢', 'schildkröte langsam'),
      e('🐍', 'schlange python'),
      e('🦀', 'krabbe rust'),
      e('🐙', 'oktopus krake github'),
      e('🐳', 'wal docker'),
      e('🐝', 'biene fleißig'),
      e('🦋', 'schmetterling'),
      e('🐞', 'marienkäfer käfer'),
      e('🦄', 'einhorn'),
      e('🐉', 'drache'),
      e('🐸', 'frosch')
    ]
  },
  {
    label: 'Objekte',
    entries: [
      e('📁', 'ordner projekt'),
      e('📂', 'ordner offen'),
      e('🗃️', 'kartei archiv'),
      e('🗄️', 'aktenschrank archiv'),
      e('📅', 'kalender termin'),
      e('⏰', 'wecker zeit'),
      e('⏱️', 'stoppuhr zeit messen'),
      e('💰', 'geld sack'),
      e('💶', 'euro geld'),
      e('🛒', 'einkaufswagen shop'),
      e('🎁', 'geschenk'),
      e('🏆', 'pokal gewinnen erfolg'),
      e('🎯', 'ziel treffer'),
      e('🧩', 'puzzle teil'),
      e('🎲', 'würfel spiel zufall'),
      e('🎨', 'palette kunst malen design'),
      e('🖼️', 'bild galerie rahmen'),
      e('📸', 'fotoapparat foto'),
      e('🎬', 'film klappe video'),
      e('🗺️', 'karte welt'),
      e('📍', 'pin ort standort'),
      e('🧭', 'kompass richtung'),
      e('🏗️', 'baustelle bauen'),
      e('✈️', 'flugzeug reise'),
      e('☕', 'kaffee pause')
    ]
  },
  {
    label: 'Symbole',
    entries: [
      e('❤️', 'herz liebe rot'),
      e('🧡', 'herz orange'),
      e('💚', 'herz grün'),
      e('💙', 'herz blau'),
      e('💜', 'herz lila'),
      e('✨', 'funkeln neu glitzer ki'),
      e('💫', 'schwung stern wirbel'),
      e('✅', 'haken erledigt fertig'),
      e('❗', 'ausrufezeichen wichtig'),
      e('❓', 'fragezeichen frage'),
      e('♻️', 'recycling wiederverwenden'),
      e('⚠️', 'warnung achtung'),
      e('🔴', 'rot kreis punkt'),
      e('🟠', 'orange kreis punkt'),
      e('🟢', 'grün kreis punkt'),
      e('🔵', 'blau kreis punkt'),
      e('🟣', 'lila kreis punkt'),
      e('🔶', 'raute orange'),
      e('💎', 'diamant edelstein wertvoll'),
      e('🧿', 'auge amulett')
    ]
  }
]

const normalize = (text: string): string => text.trim().toLocaleLowerCase('de-DE')

/** Filtert die Liste nach deutschen Suchwörtern oder Gruppennamen; doppelte Emoji nur einmal. */
export function searchEmoji(query: string): EmojiEntry[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  const seen = new Set<string>()
  const hits: EmojiEntry[] = []
  for (const group of EMOJI_GROUPS) {
    const groupWord = normalize(group.label)
    for (const entry of group.entries) {
      if (seen.has(entry.emoji)) continue
      const haystack = `${groupWord} ${entry.words}`
      if (words.every((w) => haystack.includes(w))) {
        seen.add(entry.emoji)
        hits.push(entry)
      }
    }
  }
  return hits
}
