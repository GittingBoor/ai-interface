import { describe, expect, it } from 'vitest'
import { formatIcon, isHexColor, isValidIcon, parseIcon } from '../src/shared/projectIcon'

describe('isHexColor', () => {
  it('#rrggbb und Kurzform #rgb', () => {
    expect(isHexColor('#e08a4f')).toBe(true)
    expect(isHexColor('#ABCDEF')).toBe(true)
    expect(isHexColor('#abc')).toBe(true)
    expect(isHexColor('#abcd')).toBe(false)
    expect(isHexColor('e08a4f')).toBe(false)
    expect(isHexColor('#e08a4g')).toBe(false)
  })
})

describe('Projektsymbole', () => {
  it('liest Emoji und Lucide-Namen', () => {
    expect(parseIcon('emoji:🎸')).toEqual({ kind: 'emoji', value: '🎸' })
    expect(parseIcon('lucide:graduation-cap')).toEqual({ kind: 'lucide', name: 'graduation-cap' })
    expect(parseIcon(null)).toBeNull()
    expect(parseIcon('quatsch')).toBeNull()
  })

  it('schreibt sie wieder', () => {
    expect(formatIcon({ kind: 'emoji', value: '👨‍💻' })).toBe('emoji:👨‍💻')
    expect(formatIcon({ kind: 'lucide', name: 'house' })).toBe('lucide:house')
  })

  it('prüft Gültigkeit', () => {
    expect(isValidIcon('emoji:🎸')).toBe(true)
    expect(isValidIcon('emoji:👨‍👩‍👧‍👦')).toBe(true)
    expect(isValidIcon('emoji:abc')).toBe(false)
    expect(isValidIcon('emoji:')).toBe(false)
    expect(isValidIcon(`emoji:${'🎸'.repeat(9)}`)).toBe(false)
    expect(isValidIcon('lucide:graduation-cap')).toBe(true)
    expect(isValidIcon('lucide:Graduation Cap')).toBe(false)
    expect(isValidIcon('lucide:')).toBe(false)
    expect(isValidIcon('svg:<script>')).toBe(false)
  })
})
