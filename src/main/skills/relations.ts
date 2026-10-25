import type { SkillEntry, SkillRelation } from '@shared/types'

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Ein Skill gilt als erwähnt, wenn der Name so im Text steht, wie man Skills anspricht:
 * in Backticks, als Slash-Befehl oder mit dem Wort „Skill“ davor/danach. Fließtext wie „Design“ zählt nicht.
 */
function mentions(text: string, name: string): boolean {
  const n = escape(name)
  return new RegExp(`\`${n}\`|(^|[\\s(])/${n}\\b|\\bskills?\\s+[\`"']?${n}\\b|\\b${n}[\`"']?\\s+skill\\b`, 'i').test(text)
}

/** Kanten für Liste und Grafik: Plugin enthält, Agent nutzt Tool/Skill, Agent erwähnt Skill. */
export function buildRelations(entries: readonly SkillEntry[], bodies: ReadonlyMap<string, string> = new Map()): SkillRelation[] {
  const relations: SkillRelation[] = []
  const skillsByName = new Map<string, SkillEntry[]>()
  for (const e of entries) if (e.kind === 'skill') skillsByName.set(e.name, [...(skillsByName.get(e.name) ?? []), e])
  /** Gleichnamige Skills: der auf demselben Host zuerst. */
  const skillFor = (name: string, host: SkillEntry['host']): SkillEntry | undefined =>
    skillsByName.get(name)?.find((s) => s.host === host) ?? skillsByName.get(name)?.[0]
  for (const e of entries) {
    if (e.plugin) relations.push({ from: `plugin:${e.plugin}`, to: e.id, kind: 'contains' })
    if (e.kind !== 'agent') continue
    for (const tool of e.tools) relations.push({ from: e.id, to: `tool:${tool}`, kind: 'uses-tool' })
    const used = new Set<string>()
    for (const name of e.skills) {
      const skill = skillFor(name, e.host)
      if (!skill) continue
      used.add(skill.id)
      relations.push({ from: e.id, to: skill.id, kind: 'uses-skill' })
    }
    const text = bodies.get(e.id) ?? e.bodyExcerpt
    for (const [name] of skillsByName) {
      const skill = skillFor(name, e.host)
      if (!skill || used.has(skill.id) || !mentions(text, name)) continue
      used.add(skill.id)
      relations.push({ from: e.id, to: skill.id, kind: 'mentions' })
    }
  }
  return relations
}
