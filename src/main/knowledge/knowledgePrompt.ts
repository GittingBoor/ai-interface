import { languageDirective } from '@shared/i18n/directive'
import type { Locale } from '@shared/i18n/locales'
import type { InspectedProject } from './KnowledgeInspector'
import { KNOWLEDGE_LIMITS } from './knowledgeSchema'

const SHORT_HASH = 7
const L = KNOWLEDGE_LIMITS

/** Name der Formatdatei; sie gehört der App und wird vor jedem Lauf neu geschrieben. */
export const KNOWLEDGE_FORMAT_FILE = 'FORMAT.md'

/** Startinhalt der `CLAUDE.md` im Projektwissen-Ordner; danach gehört die Datei dem Nutzer. */
export const KNOWLEDGE_CLAUDE_MD = `# Projektwissen

Du erklärst einem Menschen ein Projekt so, dass er es **in drei Minuten** versteht, auch wenn er es nie gesehen
hat: was es ist, wie es aufgebaut ist, wie die wichtigsten Abläufe laufen (wer schickt wem was), wie man einsteigt,
worauf man achten muss und welche schwierige Technik es nutzt. Jeder Lauf gilt genau einem Projekt.

Werkzeuge und das genaue Format des Ergebnisses stehen in \`${KNOWLEDGE_FORMAT_FILE}\` in diesem Ordner.

## Vorgehen

1. \`project_info\` und \`read_knowledge\`: Projekt, Stand, erster Lauf oder Folgelauf.
2. \`project_stats\`: Sprachen, Ordner, Hotspots und Abhängigkeiten zeigen, wo das Gewicht liegt.
3. Protokolle lesen (beim Folgelauf nur die neuen seit \`basedOn.protocolDate\`).
4. Git und Code: \`git_log\`, \`git_show_stat\`, README, Einstiegspunkte und Hotspots lesen, gezielt \`git_grep\`.
5. Links: für schwierige Technik und die wichtigsten Bibliotheken die offizielle Dokumentation mit \`WebSearch\`
   suchen und bei Bedarf mit \`WebFetch\` prüfen. Links aus README oder Doku des Projekts dürfen direkt übernommen werden.
6. \`save_knowledge\` mit dem vollständigen Ergebnis. Meldet es Probleme, korrigieren und erneut speichern.
7. Zum Schluss **immer** \`finish\`, auch wenn etwas nicht geklappt hat (dann kurz sagen, was).

## Erster Lauf und Folgelauf

- **Erster Lauf** (\`read_knowledge\` liefert \`null\`): die ganze Geschichte aufarbeiten. In der Zeitleiste ältere
  Zeit zu wenigen Einträgen zusammenfassen, Neues einzeln.
- **Folgelauf:** bisheriges Wissen übernehmen und nur Neues einarbeiten. Fehlen Felder (ältere Fassung), diese
  jetzt vollständig erarbeiten. Gespeichert wird immer das vollständige Ergebnis.

## Stil

- Ziel: in drei Minuten erfasst. Stichworte statt Absätze, jeder Text so kurz wie möglich. Kein Fließtext.
- Lieber ein Ablauf (Diagramm) als eine Erklärung in Worten.
- Nur Belegtes: jede Aussage stützt sich auf ein Protokoll, einen Commit oder eine Datei. Vermutungen gehören in \`gaps\`.
- Keine Grundlagen erklären. Der Leser kann programmieren, kennt aber dieses Projekt nicht.
- Keine Namen von Personen in die Texte; wer mitgearbeitet hat, zeigt die App selbst.

## Regeln

- Nur lesen: nichts ändern, nichts committen, keine Dateien schreiben. Einzige Ausnahme ist \`save_knowledge\`.
- Keine Geheimnisse übernehmen (Tokens, Passwörter, Schlüssel), auch wenn sie in Dateien stehen.
- Keine URLs erfinden: nur Links, die du in Projektdateien gelesen oder über die Websuche gefunden hast.
`

/** Werkzeuge und Format; die App überschreibt die Datei vor jedem Lauf, damit sie zur Prüfung passt. */
export const KNOWLEDGE_FORMAT_MD = `# Projektwissen: Werkzeuge und Format

Diese Datei schreibt die App vor jedem Lauf neu. Beim Format hat sie Vorrang vor der \`CLAUDE.md\`.

## Werkzeuge (MCP-Server „projektwissen“, fest an das Projekt dieses Laufs gebunden)

| Werkzeug | Zweck |
|---|---|
| \`project_info\` | Name, Rechner, Pfad, Shell, Zustand, aktueller Stand, \`basedOn\` des bisherigen Wissens, neue Protokolle und Commits |
| \`read_knowledge\` | bisheriges Projektwissen als JSON, \`null\` beim ersten Lauf |
| \`project_stats\` | Kennzahlen der App: Sprachen, Ordnergrößen, Commits je Monat, Mitwirkende, Hotspots, Abhängigkeiten |
| \`list_protocols\` / \`read_protocol\` | Sitzungsprotokolle des Projekts (Dateiname = Datum) |
| \`git_log\` | Commits, neueste zuerst; \`since\` = Hash, dann nur Neueres; \`limit\` bis 200 |
| \`git_show_stat\` | ein Commit mit Nachricht und geänderten Dateien |
| \`git_grep\` | fester Text in den versionierten Dateien |
| \`list_files\` / \`read_project_file\` | Dateiliste und Dateiinhalt, Pfade relativ zum Projekt |
| \`save_knowledge\` | prüft und speichert das Ergebnis; bei Fehlern kommen alle Probleme zurück |
| \`finish\` | beendet den Lauf mit ein bis zwei Sätzen Zusammenfassung |
| \`WebSearch\` / \`WebFetch\` | offizielle Dokumentation für Links finden und prüfen |

Kennzahlen (Zeilen, Sprachen, Mitwirkende, Hotspots, Abhängigkeiten) berechnet die App selbst. Nicht abschreiben,
sondern nutzen, um Wichtiges zu finden.

## Inhalt von \`knowledge\` (Grenzen werden geprüft; alle Felder sind Pflicht, Listen dürfen leer sein)

| Feld | Inhalt | Grenze |
|---|---|---|
| \`summary\` | was das Projekt ist und liefert, 1–2 Sätze | ≤ ${L.summary} Zeichen |
| \`architecture\` | \`nodes [{ id, label, kind, where?, note? }]\`, \`edges [{ from, to, label? }]\`; \`kind\`: \`ui\`, \`service\`, \`data\`, \`external\`, \`device\`; \`where\` = Ordner/Datei, \`note\` = ein Satz | ≤ ${L.nodes} Knoten, \`note\` ≤ ${L.nodeNote} Zeichen, Kanten nur zwischen vorhandenen ids |
| \`flows\` | wichtige Abläufe als Sequenz: \`{ title, question, steps: [{ from, to, label }] }\`; \`question\` z. B. „Was passiert, wenn …?“; \`from\`/\`to\` = Beteiligte (möglichst die \`label\` der Architektur-Knoten), \`label\` = was gesendet oder getan wird | ≤ ${L.flows} Abläufe, je ≤ ${L.flowSteps} Schritte und ≤ ${L.flowParticipants} Beteiligte |
| \`orientation\` | \`{ start: [{ label, command }], readFirst: [{ path, why }] }\`: Befehle zum Installieren/Starten/Testen und die Dateien, mit denen man anfangen sollte | je ≤ ${L.orientation} |
| \`features\` | \`{ name, where, status }\`, \`status\`: \`fertig\`, \`teilweise\`, \`geplant\` | ≤ ${L.features}, \`name\` ≤ ${L.featureName} Zeichen |
| \`pitfalls\` | Stolperfallen: \`{ title, detail, where? }\`, was man wissen muss, um nichts kaputtzumachen (Eigenheiten, Fallen, fragile Stellen) | ≤ ${L.pitfalls}, \`detail\` ≤ ${L.pitfallDetail} Zeichen |
| \`concepts\` | schwierige Technik: \`{ term, short, explanation, links: [{ title, url }], files? }\`; \`short\` = ein Satz zum Überfliegen, \`explanation\` = höchstens 3 Sätze (was es tut, warum das Projekt es braucht), \`links\` = offizielle Doku | ≤ ${L.concepts}, \`short\` ≤ ${L.conceptShort} Zeichen, ≤ ${L.conceptLinks} Links, ≤ ${L.conceptFiles} Dateien |
| \`resources\` | weiterführende Links: \`{ title, url, about }\`, z. B. Doku der wichtigsten Frameworks, Projekt-Wiki, Spezifikationen | ≤ ${L.resources}, \`about\` ≤ ${L.line} Zeichen |
| \`timeline\` | \`{ date, title, detail?, links: [{ kind, ref }] }\`, neueste zuerst; \`kind\`: \`protocol\` (Pfad aus list_protocols), \`commit\` (Hash), \`file\` (Pfad im Projekt) | ≤ ${L.timeline}, \`detail\` 1 Satz |
| \`gaps\` | was unklar blieb oder nicht belegt ist | ≤ ${L.gaps}, je 1 Satz |

Titel (\`title\`, \`label\` in \`orientation.start\`) höchstens ${L.title} Zeichen. URLs beginnen mit \`https://\` oder \`http://\`.
Pfade sind relativ zum Projekt, ohne \`..\`. Die Werte von \`status\` und \`kind\` bleiben wie oben, auch in anderen Sprachen.
`

/** Kurzer Startauftrag eines Laufs; die Details stehen in `CLAUDE.md` und `FORMAT.md`. */
export function knowledgeStartPrompt(p: InspectedProject, locale: Locale): string {
  const basedOn = p.knowledge?.basedOn
  const run = basedOn
    ? `Folgelauf seit ${basedOn.head?.slice(0, SHORT_HASH) ?? 'ohne Git'}/${basedOn.protocolDate ?? 'ohne Protokoll'}: Neues einarbeiten, fehlende Felder ergänzen, Lücken schließen.`
    : 'Erster Lauf: arbeite die ganze Geschichte auf.'
  return `Erstelle das Projektwissen für „${p.favorite.name}“.
${run}
Vorgehen und Stil stehen in der CLAUDE.md, Werkzeuge und Format in der ${KNOWLEDGE_FORMAT_FILE} in diesem Ordner. Lies beide zuerst. Zum Schluss immer finish aufrufen.
${languageDirective(locale)} Write all text in the knowledge (summary, labels, flows, orientation, features, pitfalls, concepts, resources, timeline, gaps) in that language too.`
}
