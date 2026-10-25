import { describe, expect, it } from 'vitest'
import { niceTicks } from '../../src/renderer/src/components/charts/geometry'

describe('niceTicks', () => {
  it('ganzzahlige Kennzahlen bekommen mindestens Schritt 1, also keine doppelten Beschriftungen', () => {
    expect(niceTicks(2, 4, 1)).toEqual([0, 1, 2])
    expect(niceTicks(3, 4, 1)).toEqual([0, 1, 2, 3])
  })

  it('Kommazahlen (Stunden, Kosten) dürfen feinere Schritte haben', () => {
    expect(niceTicks(0.4)).toEqual([0, 0.1, 0.2, 0.3, 0.4])
  })

  it('große Werte bleiben rund', () => {
    expect(niceTicks(38_000_000, 4, 1)).toEqual([0, 10_000_000, 20_000_000, 30_000_000, 40_000_000])
  })
})
