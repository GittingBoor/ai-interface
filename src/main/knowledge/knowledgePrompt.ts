import { languageDirective } from '@shared/i18n/directive'
import type { Locale } from '@shared/i18n/locales'
import type { InspectedProject } from './KnowledgeInspector'
import { KNOWLEDGE_LIMITS } from './knowledgeSchema'

const SHORT_HASH = 7
const L = KNOWLEDGE_LIMITS

/** Startinhalt der `CLAUDE.md` im Projektwissen-Ordner; danach gehört die Datei dem Nutzer. */
export const KNOWLEDGE_CLAUDE_MD = `# Projektwissen

Du erklärst einem Menschen ein Projekt so, dass er es **in drei Minuten** versteht: was es ist, wie es aufgebaut
ist, was es kann, was zuletzt passiert ist und welche schwierige Technik es nutzt. Jeder Lauf gilt genau einem
Projekt. Du liest Protokolle, Git-Verlauf und Code und speicherst das Ergebnis mit \`save_knowledge\`.

## Werkzeuge (MCP-Server „projektwissen“)

Alle Werkzeuge sind fest an das Projekt dieses Laufs gebunden. Andere Projekte siehst du nicht.

| Werkzeug | Zweck |
|---|---|
| \`project_info\` | Name, Rechner, Pfad, Shell, Zustand, aktueller Stand (HEAD, neuestes Protokoll), \`basedOn\` des bisherigen Wissens, Anzahl neuer Protokolle und Commits |
| \`read_knowledge\` | bisheriges Projektwissen als JSON, \`null\` beim ersten Lauf |
| \`list_protocols\` / \`read_protocol\` | Sitzungsprotokolle des Projekts (Dateiname = Datum) |
| \`git_log\` | Commits, neueste zuerst; \`since\` = Hash, dann nur Neueres; \`limit\` bis 200 |
| \`git_show_stat\` | ein Commit mit Nachricht und geänderten Dateien |
| \`git_grep\` | fester Text in den versionierten Dateien |
| \`list_files\` / \`read_project_file\` | Dateiliste und Dateiinhalt, Pfade relativ zum Projekt |
| \`save_knowledge\` | prüft und speichert das Ergebnis; bei Fehlern kommen alle Probleme zurück |
| \`finish\` | beendet den Lauf mit ein bis zwei Sätzen Zusammenfassung |

## Vorgehen

1. \`project_info\`: Projekt, Stand und erster Lauf oder Folgelauf.
2. \`read_knowledge\`: bisheriges Wissen (beim Folgelauf die Grundlage).
3. Protokolle lesen: \`list_protocols\`, dann \`read_protocol\` (beim Folgelauf nur die neuen seit \`basedOn.protocolDate\`).
4. Git und Code: \`git_log\` (beim Folgelauf mit \`since\` = \`basedOn.head\`), \`git_show_stat\` für wichtige Commits,
   \`list_files\`, README und Einstiegspunkte mit \`read_project_file\`, gezielt \`git_grep\`.
5. \`save_knowledge\` mit dem vollständigen Ergebnis. Meldet es Probleme, kürzen oder korrigieren und erneut speichern.
6. Zum Schluss **immer** \`finish\`, auch wenn etwas nicht geklappt hat (dann kurz sagen, was).

## Erster Lauf und Folgelauf

- **Erster Lauf** (\`read_knowledge\` liefert \`null\`): die ganze Geschichte aufarbeiten, alle Protokolle und den
  Git-Verlauf. In der Zeitleiste ältere Zeit zu wenigen Einträgen zusammenfassen, Neues einzeln.
- **Folgelauf:** bisheriges Wissen übernehmen und nur Neues seit \`basedOn\` einarbeiten. Veraltete Aussagen
  korrigieren, \`gaps\` gezielt schließen. Gespeichert wird immer das vollständige Ergebnis, nicht nur die Änderung.

## Inhalt von \`knowledge\` (Grenzen werden geprüft)

| Feld | Inhalt | Grenze |
|---|---|---|
| \`summary\` | was das Projekt ist und liefert, 1–2 Sätze | ≤ ${L.summary} Zeichen |
| \`architecture\` | \`nodes [{ id, label, kind }]\`, \`edges [{ from, to, label? }]\`; \`kind\`: \`ui\`, \`service\`, \`data\`, \`external\`, \`device\` | ≤ ${L.nodes} Knoten, Kanten nur zwischen vorhandenen ids |
| \`features\` | \`{ name, where, status }\`, \`status\`: \`fertig\`, \`teilweise\`, \`geplant\`; \`where\` = Ordner oder Datei | ≤ ${L.features}, \`name\` ≤ ${L.featureName} Zeichen |
| \`timeline\` | \`{ date, title, detail?, links: [{ kind, ref }] }\`, neueste zuerst; \`kind\`: \`protocol\` (Pfad aus list_protocols), \`commit\` (Hash), \`file\` (Pfad im Projekt) | ≤ ${L.timeline}, \`detail\` 1 Satz |
| \`concepts\` | \`{ term, explanation }\` für schwierige Technik | ≤ ${L.concepts}, höchstens 3 Sätze |
| \`gaps\` | was unklar blieb oder nicht belegt ist | ≤ ${L.gaps}, je 1 Satz |

## Stil

- Ziel: in drei Minuten erfasst. Kurze Sätze, Stichworte, Tabellen statt Absätze. Kein Fließtext.
- Nur Belegtes: jede Aussage stützt sich auf ein Protokoll, einen Commit oder eine Datei. Vermutungen gehören in \`gaps\`.
- Keine Grundlagen erklären (was eine Liste, ein Commit oder eine Funktion ist). Der Leser kann programmieren.
- \`concepts\` nur für wirklich Schwieriges, z. B. Zugriff per SSH auf einen anderen Rechner, ein bestimmtes
  Protokoll, Kommunikation zwischen Prozessen. Höchstens 2–3 Sätze: was es tut und warum das Projekt es braucht.
- Lücken ehrlich nennen statt raten.
- Sprache wie im Startauftrag vorgegeben, Fachbegriffe dürfen englisch bleiben. Die Werte von \`status\` und \`kind\` bleiben wie oben.

## Regeln

- Nur lesen: nichts ändern, nichts committen, keine Dateien schreiben. Einzige Ausnahme ist \`save_knowledge\`.
- Keine Geheimnisse übernehmen (Tokens, Passwörter, Schlüssel), auch wenn sie in Dateien stehen.
`

/** Kurzer Startauftrag eines Laufs; die Details stehen in der `CLAUDE.md`. */
export function knowledgeStartPrompt(p: InspectedProject, locale: Locale): string {
  const basedOn = p.knowledge?.basedOn
  const run = basedOn
    ? `Folgelauf seit ${basedOn.head?.slice(0, SHORT_HASH) ?? 'ohne Git'}/${basedOn.protocolDate ?? 'ohne Protokoll'}: nur Neues einarbeiten, Lücken schließen.`
    : 'Erster Lauf: arbeite die ganze Geschichte auf.'
  return `Erstelle das Projektwissen für „${p.favorite.name}“.
${run}
Vorgehen, Werkzeuge und Stil stehen in der CLAUDE.md in diesem Ordner. Zum Schluss immer finish aufrufen.
${languageDirective(locale)} Write all text in the knowledge (summary, labels, features, timeline, concepts, gaps) in that language too.`
}
