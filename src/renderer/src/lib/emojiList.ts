/** Kuratierte Emoji für Projekt- und Art-Symbole, mit deutschen und englischen Suchwörtern (reine Suchdaten, siehe `STATIC_DATA` im Reste-Test). */
import type { Messages } from '@shared/i18n/messages'
import { activeTag } from '../i18n/activeLocale'

export type EmojiGroupId = keyof Messages['frame']['emojiGroups']

export interface EmojiEntry {
  readonly emoji: string
  readonly words: string
}

export interface EmojiGroup {
  readonly id: EmojiGroupId
  readonly entries: readonly EmojiEntry[]
}

const e = (emoji: string, words: string): EmojiEntry => ({ emoji, words })

export const EMOJI_GROUPS: readonly EmojiGroup[] = [
  {
    id: 'tech',
    entries: [
      e('💻', 'laptop computer rechner programmieren code'),
      e('🖥️', 'bildschirm desktop pc monitor screen display'),
      e('⌨️', 'tastatur tippen keyboard typing'),
      e('🖱️', 'maus mouse'),
      e('🤖', 'roboter ki bot ai'),
      e('🧠', 'gehirn ki denken lernen brain think learn'),
      e('⚙️', 'zahnrad einstellungen technik gear settings tech'),
      e('🔧', 'schraubenschlüssel werkzeug reparieren wrench tool repair'),
      e('🛠️', 'werkzeug bauen tools build'),
      e('🔌', 'stecker strom plug power'),
      e('🔋', 'batterie akku energie battery energy'),
      e('💾', 'diskette speichern daten floppy disk save data'),
      e('💿', 'cd disk'),
      e('📡', 'antenne funk satellit antenna satellite dish radio'),
      e('🛰️', 'satellit weltraum satellite space'),
      e('📱', 'handy smartphone app phone mobile'),
      e('🧪', 'reagenzglas test experiment labor tube lab'),
      e('🧬', 'dna biologie genetik biology genetics'),
      e('🔬', 'mikroskop forschung microscope research'),
      e('📟', 'pager gerät device'),
      e('🕹️', 'joystick spiel game'),
      e('🎮', 'controller spiel game gaming'),
      e('👾', 'alien spiel pixel retro game'),
      e('🐛', 'käfer bug fehler insect error'),
      e('🚀', 'rakete start launch deploy rocket'),
      e('⚡', 'blitz schnell strom energie lightning fast power energy'),
      e('🌐', 'globus web internet netz globe network'),
      e('🔒', 'schloss sicherheit privat lock security private'),
      e('🔑', 'schlüssel zugang passwort key access password'),
      e('📦', 'paket modul box package module')
    ]
  },
  {
    id: 'music',
    entries: [
      e('🎵', 'note musik ton music tone'),
      e('🎶', 'noten musik melodie notes music melody'),
      e('🎸', 'gitarre rock musik guitar music'),
      e('🥁', 'schlagzeug trommel drums musik drum percussion music'),
      e('🎹', 'klavier piano keyboard musik music'),
      e('🎺', 'trompete musik trumpet music'),
      e('🎻', 'geige violine musik violin music'),
      e('🎷', 'saxophon jazz musik saxophone music'),
      e('🎤', 'mikrofon singen gesang microphone sing vocals'),
      e('🎧', 'kopfhörer hören audio headphones listen'),
      e('🎼', 'partitur noten transkription score sheet music transcription'),
      e('📻', 'radio'),
      e('🔊', 'lautsprecher laut audio sound speaker loud volume'),
      e('🎚️', 'regler mixer audio slider fader'),
      e('🎛️', 'mischpult regler synth mixing console knobs')
    ]
  },
  {
    id: 'home',
    entries: [
      e('🏠', 'haus zuhause smarthome house home smart home'),
      e('🏡', 'haus garten zuhause house garden home'),
      e('💡', 'glühbirne licht idee lampe light bulb idea lamp'),
      e('🛋️', 'sofa wohnzimmer couch living room'),
      e('🛏️', 'bett schlafzimmer bed bedroom'),
      e('🚿', 'dusche bad shower bathroom'),
      e('🛁', 'badewanne bad bathtub bath'),
      e('🍳', 'pfanne küche kochen pan kitchen cooking'),
      e('🧺', 'wäsche korb laundry basket'),
      e('🌡️', 'thermometer temperatur heizung temperature heating'),
      e('🔥', 'feuer heizung flamme fire heating flame'),
      e('❄️', 'schnee kalt kühlung snow cold cooling'),
      e('🚪', 'tür eingang door entrance'),
      e('🪟', 'fenster window'),
      e('🔔', 'glocke klingel benachrichtigung bell notification'),
      e('📷', 'kamera foto überwachung camera photo surveillance'),
      e('🧹', 'besen putzen broom clean'),
      e('🪴', 'topfpflanze pflanze potted plant'),
      e('🧯', 'feuerlöscher sicherheit fire extinguisher safety'),
      e('🚗', 'auto garage car')
    ]
  },
  {
    id: 'uni',
    entries: [
      e('🎓', 'uni studium abschluss master bachelor university graduation degree study'),
      e('📚', 'bücher lernen studium books learn study'),
      e('📖', 'buch lesen book read'),
      e('📝', 'notiz schreiben aufgabe note write task memo'),
      e('✏️', 'bleistift schreiben pencil write'),
      e('🖊️', 'stift schreiben pen write'),
      e('📐', 'geodreieck mathe geometrie set square math geometry'),
      e('📏', 'lineal messen ruler measure'),
      e('🧮', 'abakus rechnen mathe abacus calculate math'),
      e('📊', 'balkendiagramm statistik auswertung bar chart statistics analysis'),
      e('📈', 'diagramm steigend wachstum chart rising growth'),
      e('📉', 'diagramm fallend chart falling'),
      e('🗂️', 'karteikarten ordner index cards folder'),
      e('📋', 'klemmbrett liste clipboard list'),
      e('🏫', 'schule uni gebäude school university building'),
      e('🧑‍🏫', 'lehrer dozent vorlesung teacher lecturer lecture'),
      e('🧑‍💻', 'programmierer entwickler coder programmer developer'),
      e('🔭', 'teleskop astronomie telescope astronomy'),
      e('⚗️', 'chemie labor chemistry lab'),
      e('📜', 'urkunde schriftrolle arbeit certificate scroll thesis')
    ]
  },
  {
    id: 'nature',
    entries: [
      e('🌱', 'keimling pflanze wachsen neu seedling plant grow new'),
      e('🌿', 'kraut blatt grün herb leaf green'),
      e('🍀', 'kleeblatt glück clover luck'),
      e('🌳', 'baum natur tree nature'),
      e('🌲', 'tanne wald fir forest'),
      e('🌵', 'kaktus wüste cactus desert'),
      e('🌸', 'blüte kirschblüte frühling blossom cherry spring'),
      e('🌻', 'sonnenblume sommer sunflower summer'),
      e('🍁', 'ahornblatt herbst maple leaf autumn fall'),
      e('🌊', 'welle meer wasser wave sea water'),
      e('⛰️', 'berg mountain'),
      e('🌋', 'vulkan volcano'),
      e('☀️', 'sonne wetter sommer sun weather summer'),
      e('🌙', 'mond nacht moon night'),
      e('⭐', 'stern star'),
      e('🌈', 'regenbogen rainbow'),
      e('☁️', 'wolke wetter cloud weather'),
      e('🌧️', 'regen wetter rain weather'),
      e('🌍', 'erde welt europa earth world europe'),
      e('🔆', 'hell helligkeit bright brightness')
    ]
  },
  {
    id: 'animals',
    entries: [
      e('🐱', 'katze cat'),
      e('🐶', 'hund dog'),
      e('🦊', 'fuchs fox'),
      e('🐻', 'bär bear'),
      e('🐼', 'panda'),
      e('🦉', 'eule weisheit owl wisdom'),
      e('🐦', 'vogel bird'),
      e('🦜', 'papagei parrot'),
      e('🐧', 'pinguin linux penguin'),
      e('🐢', 'schildkröte langsam turtle slow'),
      e('🐍', 'schlange python snake'),
      e('🦀', 'krabbe rust crab'),
      e('🐙', 'oktopus krake github octopus'),
      e('🐳', 'wal docker whale'),
      e('🐝', 'biene fleißig bee busy'),
      e('🦋', 'schmetterling butterfly'),
      e('🐞', 'marienkäfer käfer ladybug'),
      e('🦄', 'einhorn unicorn'),
      e('🐉', 'drache dragon'),
      e('🐸', 'frosch frog')
    ]
  },
  {
    id: 'objects',
    entries: [
      e('📁', 'ordner projekt folder project'),
      e('📂', 'ordner offen folder open'),
      e('🗃️', 'kartei archiv card file archive'),
      e('🗄️', 'aktenschrank archiv filing cabinet archive'),
      e('📅', 'kalender termin calendar date appointment'),
      e('⏰', 'wecker zeit alarm clock time'),
      e('⏱️', 'stoppuhr zeit messen stopwatch time measure'),
      e('💰', 'geld sack money bag'),
      e('💶', 'euro geld money'),
      e('🛒', 'einkaufswagen shop shopping cart'),
      e('🎁', 'geschenk gift present'),
      e('🏆', 'pokal gewinnen erfolg trophy win success'),
      e('🎯', 'ziel treffer target goal bullseye'),
      e('🧩', 'puzzle teil piece'),
      e('🎲', 'würfel spiel zufall dice game random'),
      e('🎨', 'palette kunst malen design art paint'),
      e('🖼️', 'bild galerie rahmen picture gallery frame'),
      e('📸', 'fotoapparat foto camera photo'),
      e('🎬', 'film klappe video clapper movie'),
      e('🗺️', 'karte welt map world'),
      e('📍', 'pin ort standort place location'),
      e('🧭', 'kompass richtung compass direction'),
      e('🏗️', 'baustelle bauen construction building'),
      e('✈️', 'flugzeug reise airplane plane travel'),
      e('☕', 'kaffee pause coffee break')
    ]
  },
  {
    id: 'symbols',
    entries: [
      e('❤️', 'herz liebe rot heart love red'),
      e('🧡', 'herz orange heart'),
      e('💚', 'herz grün heart green'),
      e('💙', 'herz blau heart blue'),
      e('💜', 'herz lila heart purple'),
      e('✨', 'funkeln neu glitzer ki sparkles glitter new ai'),
      e('💫', 'schwung stern wirbel dizzy star swirl'),
      e('✅', 'haken erledigt fertig check done finished'),
      e('❗', 'ausrufezeichen wichtig exclamation mark important'),
      e('❓', 'fragezeichen frage question mark'),
      e('♻️', 'recycling wiederverwenden reuse'),
      e('⚠️', 'warnung achtung warning caution'),
      e('🔴', 'rot kreis punkt red circle dot'),
      e('🟠', 'orange kreis punkt circle dot'),
      e('🟢', 'grün kreis punkt green circle dot'),
      e('🔵', 'blau kreis punkt blue circle dot'),
      e('🟣', 'lila kreis punkt purple circle dot'),
      e('🔶', 'raute orange diamond'),
      e('💎', 'diamant edelstein wertvoll gem diamond valuable'),
      e('🧿', 'auge amulett eye amulet')
    ]
  }
]

const normalize = (text: string): string => text.trim().toLocaleLowerCase(activeTag())

/** Filtert die Liste nach Suchwörtern (deutsch/englisch) oder dem Gruppennamen in der Sprache von `t`; doppelte Emoji nur einmal. */
export function searchEmoji(query: string, t: Messages): EmojiEntry[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  const seen = new Set<string>()
  const hits: EmojiEntry[] = []
  for (const group of EMOJI_GROUPS) {
    const groupWord = normalize(t.frame.emojiGroups[group.id])
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
