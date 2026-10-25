import { iconNames, type IconName } from 'lucide-react/dynamic'

const ICON_SET: ReadonlySet<string> = new Set<string>(iconNames)

export const isIconName = (name: string): name is IconName => ICON_SET.has(name)

/** Vorschläge, wenn noch nichts gesucht wurde: passend zu typischen Projektarten. */
export const SUGGESTED_ICONS: readonly IconName[] = [
  'code',
  'terminal',
  'folder-git-2',
  'bot',
  'brain',
  'cpu',
  'server',
  'database',
  'globe',
  'house',
  'lightbulb',
  'thermometer',
  'plug',
  'graduation-cap',
  'book-open',
  'flask-conical',
  'music',
  'drum',
  'guitar',
  'headphones',
  'image',
  'camera',
  'gamepad-2',
  'map-pin',
  'rocket',
  'wrench',
  'sparkles',
  'star',
  'heart',
  'leaf'
].filter(isIconName)

/** Deutsche Suchwörter → englische Icon-Namensteile. */
const GERMAN_ALIASES: Readonly<Record<string, readonly string[]>> = {
  musik: ['music', 'drum', 'guitar', 'piano', 'headphones', 'mic'],
  haus: ['house', 'home'],
  uni: ['graduation', 'school', 'book'],
  studium: ['graduation', 'school', 'book'],
  buch: ['book'],
  code: ['code', 'terminal', 'brackets'],
  programmieren: ['code', 'terminal', 'git'],
  licht: ['lightbulb', 'lamp', 'sun'],
  lampe: ['lamp', 'lightbulb'],
  strom: ['plug', 'zap', 'battery'],
  heizung: ['thermometer', 'flame', 'heater'],
  wetter: ['cloud', 'sun', 'umbrella', 'snowflake'],
  bild: ['image', 'camera', 'palette'],
  foto: ['camera', 'image'],
  spiel: ['gamepad', 'dice', 'joystick', 'puzzle'],
  karte: ['map'],
  ort: ['map-pin', 'navigation'],
  werkzeug: ['wrench', 'hammer', 'tool'],
  natur: ['leaf', 'tree', 'flower', 'sprout', 'mountain'],
  tier: ['cat', 'dog', 'bird', 'fish', 'rabbit', 'bug'],
  auto: ['car'],
  geld: ['wallet', 'banknote', 'coins', 'euro'],
  kalender: ['calendar'],
  uhr: ['clock', 'timer', 'alarm'],
  datei: ['file', 'folder'],
  ordner: ['folder'],
  stern: ['star'],
  herz: ['heart'],
  ki: ['bot', 'brain', 'sparkles', 'cpu'],
  roboter: ['bot'],
  server: ['server', 'database', 'hard-drive'],
  netz: ['network', 'wifi', 'globe', 'router']
}

const normalize = (text: string): string => text.trim().toLocaleLowerCase('de-DE')

/** Sucht Icon-Namen; Treffer am Wortanfang zuerst, höchstens `limit`. */
export function searchIcons(query: string, limit: number): IconName[] {
  const q = normalize(query)
  if (!q) return SUGGESTED_ICONS.slice(0, limit)
  const needles = [q.replace(/\s+/g, '-'), ...Object.entries(GERMAN_ALIASES).filter(([word]) => word.startsWith(q)).flatMap(([, parts]) => parts)]
  const starts: IconName[] = []
  const contains: IconName[] = []
  for (const name of iconNames) {
    if (needles.some((n) => name.startsWith(n) || name.includes(`-${n}`))) starts.push(name)
    else if (needles.some((n) => name.includes(n))) contains.push(name)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}
