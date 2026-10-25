import { describe, expect, it } from 'vitest'
import { buildHookSettings, parseSpool, TERMINAL_ID_ENV } from '../../src/main/notify/hookSettings'
import { HookEventReader } from '../../src/main/notify/HookEventReader'
import type { HookEvent } from '../../src/main/notify/hookSettings'
import { FakeHost } from '../helpers/FakeHost'

const SPOOL = '/home/alex/.cache/ai-interface/hook-events.log'

describe('buildHookSettings', () => {
  it('liefert gültiges JSON mit allen Ereignisarten und der Terminal-ID', () => {
    const json = JSON.parse(buildHookSettings("C:/Users/Alex/AppData/Roaming/AI Interface/hook-events.log")) as {
      hooks: Record<string, { matcher?: string; hooks: { type: string; command: string }[] }[]>
    }
    expect(Object.keys(json.hooks).sort()).toEqual(['Notification', 'PostToolUse', 'PreToolUse', 'SessionEnd', 'Stop', 'UserPromptSubmit'])
    expect(json.hooks['SessionEnd']?.[0]?.hooks[0]?.command).toContain('\tended\t')
    expect(json.hooks['UserPromptSubmit']?.[0]?.hooks[0]?.command).toContain('\tworking\t')
    expect(json.hooks['PostToolUse']?.[0]?.hooks[0]?.command).toContain('\tworking\t')
    expect(json.hooks['Notification']?.map((h) => h.matcher)).toEqual(['permission_prompt', 'elicitation_dialog'])
    expect(json.hooks['PreToolUse']?.[0]?.matcher).toBe('AskUserQuestion')
    const command = json.hooks['Stop']?.[0]?.hooks[0]?.command ?? ''
    expect(command).toContain(`$${TERMINAL_ID_ENV}`)
    expect(command).toContain("'C:/Users/Alex/AppData/Roaming/AI Interface/hook-events.log'")
    expect(command).toContain('\tdone\t')
  })

  it('setzt einfache Anführungszeichen im Pfad sicher', () => {
    const command = JSON.parse(buildHookSettings("/tmp/it's/spool.log")).hooks.Stop[0].hooks[0].command as string
    expect(command).toContain(`'/tmp/it'\\''s/spool.log'`)
  })
})

describe('parseSpool', () => {
  it('wertet /clear und /resume nicht als Sitzungsende, echtes Beenden schon', () => {
    const chunk = ['t1\tended\t{"session_id":"a","reason":"clear"}', 't1\tended\t{"session_id":"b","reason":"resume"}', 't1\tended\t{"session_id":"c","reason":"other"}', ''].join('\n')
    expect(parseSpool(chunk, 'local', 1).events.map((e) => e.kind)).toEqual(['ended'])
  })

  it('liest vollständige Zeilen und lässt halbe für später', () => {
    const chunk = 't1\tpermission\t{"message":"Claude needs your permission to use Bash"}\nt2\tdone\t{}\nt3\tqu'
    const result = parseSpool(chunk, 'local', 5)
    expect(result.events).toEqual([
      { terminalId: 't1', kind: 'permission', message: 'Claude needs your permission to use Bash', host: 'local', at: 5 },
      { terminalId: 't2', kind: 'done', message: 'Claude ist fertig.', host: 'local', at: 5 }
    ])
    expect(result.consumedBytes).toBe(Buffer.byteLength(chunk.slice(0, chunk.lastIndexOf('\n') + 1)))
  })

  it('ignoriert Zeilen ohne Terminal-ID, unbekannte Arten und verträgt kaputtes JSON', () => {
    const chunk = '\tdone\t{}\nt1\tquatsch\t{}\nt1\tquestion\tkein json\n'
    expect(parseSpool(chunk, 'mini-pc', 1).events).toEqual([
      { terminalId: 't1', kind: 'question', message: 'Claude hat eine Frage.', host: 'mini-pc', at: 1 }
    ])
  })

  it('nimmt bei „fertig“ den Anfang der letzten Antwort', () => {
    const payload = JSON.stringify({ hook_event_name: 'Stop', last_assistant_message: '  Build ist grün, 3 Tests ergänzt.  ' })
    expect(parseSpool(`t1\tdone\t${payload}\n`, 'local', 1).events[0]?.message).toBe('Build ist grün, 3 Tests ergänzt.')
  })

  it('liest „arbeitet“ ohne eigenen Text', () => {
    expect(parseSpool('t1\tworking\t{"prompt":"mach"}\n', 'local', 2).events).toEqual([{ terminalId: 't1', kind: 'working', message: '', host: 'local', at: 2 }])
  })

  it('nimmt bei Fragen den Fragetext aus AskUserQuestion', () => {
    const payload = JSON.stringify({ tool_input: { questions: [{ question: 'Welche Datenbank?' }] } })
    expect(parseSpool(`t1\tquestion\t${payload}\n`, 'local', 1).events[0]?.message).toBe('Welche Datenbank?')
  })
})

describe('HookEventReader', () => {
  it('überspringt Bestand beim ersten Lauf und meldet danach nur Neues', async () => {
    const host = new FakeHost('mini-pc')
    host.setFile(SPOOL, 'alt\tdone\t{}\n')
    const seen: HookEvent[] = []
    const reader = new HookEventReader(host, async () => SPOOL, (events) => seen.push(...events), () => 7)
    await reader.poll()
    expect(seen).toEqual([])
    host.appendFile(SPOOL, 'neu\tdone\t{}\n')
    await reader.poll()
    expect(seen.map((e) => e.terminalId)).toEqual(['neu'])
    await reader.poll()
    expect(seen).toHaveLength(1)
  })

  it('leert beim Start eine zu große Spool-Datei und liest danach normal weiter', async () => {
    const host = new FakeHost('local')
    host.setFile(SPOOL, 'alt\tdone\t{}\n'.repeat(10))
    const seen: HookEvent[] = []
    const reader = new HookEventReader(host, async () => SPOOL, (events) => seen.push(...events), () => 7, 50)
    await reader.poll()
    expect(host.text(SPOOL)).toBe('')
    host.appendFile(SPOOL, 'neu\tdone\t{}\n')
    await reader.poll()
    expect(seen.map((e) => e.terminalId)).toEqual(['neu'])
  })

  it('beginnt von vorn, wenn die Datei kleiner wurde, und verträgt eine fehlende Datei', async () => {
    const host = new FakeHost('local')
    const seen: HookEvent[] = []
    const reader = new HookEventReader(host, async () => SPOOL, (events) => seen.push(...events), () => 7)
    await reader.poll()
    host.setFile(SPOOL, 'a\tdone\t{}\nb\tdone\t{}\n')
    await reader.poll()
    host.setFile(SPOOL, 'c\tdone\t{}\n')
    await reader.poll()
    expect(seen.map((e) => e.terminalId)).toEqual(['a', 'b', 'c'])
  })
})
