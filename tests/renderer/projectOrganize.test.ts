import { describe, expect, it } from 'vitest'
import type { Category, Favorite } from '@shared/types'
import { groupProjects, matchesFilter, mergeSubsetOrder, moveBy, pinnedFirst } from '../../src/renderer/src/lib/projectOrganize'
import { aiImagesMessage } from '../../src/renderer/src/lib/aiImages'
import { EMOJI_GROUPS, searchEmoji } from '../../src/renderer/src/lib/emojiList'
import { isValidIcon, formatIcon } from '@shared/projectIcon'

const project = (id: number, over: Partial<Favorite> = {}): Favorite => ({
  id,
  host: 'local',
  path: `C:\p\${id}`,
  name: `P${id}`,
  color: '#e08a4f',
  sortOrder: id,
  createdAt: 0,
  categoryId: null,
  starred: false,
  icon: null,
  ...over
})

const category = (id: number, sortOrder: number): Category => ({ id, name: `C${id}`, color: '#6f9bd8', icon: null, sortOrder })

describe('matchesFilter', () => {
  it('kennt alle Filterarten', () => {
    const p = project(1, { categoryId: 2, starred: true })
    expect(matchesFilter(p, 'all')).toBe(true)
    expect(matchesFilter(p, 'starred')).toBe(true)
    expect(matchesFilter(p, 'uncategorized')).toBe(false)
    expect(matchesFilter(p, 2)).toBe(true)
    expect(matchesFilter(p, 3)).toBe(false)
  })
})

describe('pinnedFirst', () => {
  it('stellt Angepinnte vor, sonst eigene Reihenfolge', () => {
    const list = [project(1), project(2, { starred: true }), project(3), project(4, { starred: true })]
    expect(pinnedFirst(list).map((p) => p.id)).toEqual([2, 4, 1, 3])
  })
})

describe('groupProjects', () => {
  it('folgt der Reihenfolge der Arten, „Ohne Art“ zuletzt, leere Gruppen fehlen', () => {
    const cats = [category(1, 1), category(2, 0), category(3, 2)]
    const list = [project(1, { categoryId: 1 }), project(2), project(3, { categoryId: 2 }), project(4, { categoryId: 99 })]
    const groups = groupProjects(list, cats)
    expect(groups.map((g) => g.category?.id ?? null)).toEqual([2, 1, null])
    expect(groups[2]?.projects.map((p) => p.id)).toEqual([2, 4])
  })
})

describe('mergeSubsetOrder', () => {
  it('ordnet nur die Plätze der Teilmenge neu', () => {
    expect(mergeSubsetOrder([1, 2, 3, 4, 5], [4, 2])).toEqual([1, 4, 3, 2, 5])
  })
})

describe('moveBy', () => {
  it('verschiebt und bleibt an den Rändern stehen', () => {
    expect(moveBy([1, 2, 3], 0, 1)).toEqual([2, 1, 3])
    expect(moveBy([1, 2, 3], 0, -1)).toEqual([1, 2, 3])
  })
})

describe('aiImagesMessage', () => {
  it('nennt Anzahl und Projekte', () => {
    expect(aiImagesMessage(1, ['AI Interface'])).toBe('1 neues KI-Bild in AI Interface')
    expect(aiImagesMessage(3, ['A', 'B', 'A'])).toBe('3 neue KI-Bilder in A und B')
    expect(aiImagesMessage(4, ['A', 'B', 'C'])).toBe('4 neue KI-Bilder in 3 Projekten')
  })
})

describe('Emoji-Liste', () => {
  it('enthält nur gültige, eindeutige Emoji', () => {
    const all = EMOJI_GROUPS.flatMap((g) => g.entries.map((e) => e.emoji))
    expect(new Set(all).size).toBe(all.length)
    expect(all.length).toBeGreaterThanOrEqual(140)
    for (const emoji of all) expect(isValidIcon(formatIcon({ kind: 'emoji', value: emoji })), emoji).toBe(true)
  })

  it('findet über deutsche Wörter und Gruppennamen', () => {
    expect(searchEmoji('gitarre').map((e) => e.emoji)).toContain('🎸')
    expect(searchEmoji('uni').length).toBeGreaterThan(5)
  })
})
