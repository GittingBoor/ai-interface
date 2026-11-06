import { AGENT_COLORS, EMPTY_AGENT, KNOWN_TOOL_NAMES, type AgentAssistRequest } from '@shared/agents'
import { languageDirective } from '@shared/i18n/directive'
import { mainLocale } from '../i18n'

/** Aufgabe und Regeln für das Modell bleiben deutsch; nur die Antworttexte für den Nutzer folgen der App-Sprache. */
export const ASSIST_MODEL = 'sonnet'
const MAX_NOTES = 6

const RULES = [
  'Regeln für gute Claude-Code-Agents:',
  '- name: kurz, Kleinbuchstaben und Bindestriche, beschreibt die Rolle (z. B. "code-reviewer").',
  '- description: 1–3 Sätze. Sagt, WAS der Agent tut und WANN Claude ihn einsetzen soll ("Use when …"/"Use proactively …"). Keine Details zum Vorgehen.',
  '- tools: so wenige wie möglich (Least Privilege). Leere Liste nur, wenn er wirklich alles braucht.',
  `  Eingebaute Tools: ${[...KNOWN_TOOL_NAMES].join(', ')}.`,
  '- model: "haiku" für Suche/Zusammenfassung, "sonnet" als Standard, "opus" nur für schwere Denkarbeit, null = erben.',
  '- effort: null oder low/medium/high/xhigh/max; hoch nur für Prüfen, Planen, knifflige Fehler.',
  '- permissionMode: "plan" für reine Prüfer, "acceptEdits" für Schreiber, sonst null. Nie "bypassPermissions".',
  '- prompt: Anweisungen in Markdown mit Rolle (1 Satz), "## Vorgehen" (nummeriert, konkret), "## Ausgabe" (Form und Länge der Antwort an den Hauptagenten), "## Grenzen".',
  '  Der Agent startet ohne Vorwissen über das Gespräch: alles Nötige muss im prompt oder in der Aufgabe stehen.',
  '- Schreibe description und prompt in der Sprache der Idee des Nutzers.'
].join('\n')

const SCHEMA = [
  'Antworte NUR mit einem JSON-Objekt, ohne Markdown-Zaun, mit genau diesen Feldern:',
  '{"name": string, "description": string, "tools": string[], "disallowedTools": string[], "model": string|null,',
  ' "effort": string|null, "permissionMode": string|null, "maxTurns": number|null, "skills": string[], "memory": string|null,',
  ' "isolation": "worktree"|null, "background": boolean, "color": string|null, "initialPrompt": string, "prompt": string,',
  ' "notes": string[]}',
  `color aus: ${AGENT_COLORS.join(', ')}. notes: höchstens ${MAX_NOTES} kurze Sätze, warum du Tools, Modell und Rechte so gewählt hast.`
].join('\n')

/** Aufgabe an Claude: aus einer Idee einen Agent entwerfen oder einen bestehenden verbessern. */
export function buildAssistPrompt(request: AgentAssistRequest): string {
  const skills = request.availableSkills.length ? `Verfügbare Skills zum Vorladen (nur wenn wirklich passend): ${request.availableSkills.join(', ')}.` : 'Keine Skills vorladen.'
  const task =
    request.mode === 'create'
      ? `Entwirf einen neuen Claude-Code-Subagent nach dieser Idee des Nutzers:\n"""\n${request.idea.trim()}\n"""`
      : [
          'Verbessere diesen bestehenden Claude-Code-Subagent. Behalte Zweck und Namen bei, schärfe Beschreibung, Tools und Anweisungen.',
          request.idea.trim() ? `Wunsch des Nutzers: """${request.idea.trim()}"""` : '',
          `Aktuelle Definition (JSON):\n${JSON.stringify(request.current ?? EMPTY_AGENT, null, 2)}`
        ]
          .filter(Boolean)
          .join('\n')
  return [task, '', RULES, skills, '', SCHEMA, '', languageDirective(mainLocale())].join('\n')
}
