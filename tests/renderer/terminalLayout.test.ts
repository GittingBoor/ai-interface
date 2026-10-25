import { describe, expect, it } from 'vitest'
import { fillSlots, moveInOrder, orchestratorFirst, placeInSlot, slotCount } from '../../src/renderer/src/lib/terminalLayout'

describe('slotCount', () => {
  it('kennt alle Modi', () => {
    expect([slotCount('tabs'), slotCount('columns'), slotCount('rows'), slotCount('grid')]).toEqual([1, 2, 2, 4])
  })
})

describe('fillSlots', () => {
  it('füllt leere Slots in Tab-Reihenfolge und zeigt das aktive Terminal', () => {
    expect(fillSlots(['a', 'b', 'c'], [], 'columns', 'c')).toEqual(['a', 'c'])
    expect(fillSlots(['a', 'b'], ['b', null], 'columns', 'b')).toEqual(['b', 'a'])
  })
  it('lässt Slots leer, wenn es zu wenige Terminals gibt', () => {
    expect(fillSlots(['a'], [], 'grid', 'a')).toEqual(['a', null, null, null])
  })
  it('zeigt im Tab-Modus nur das aktive Terminal', () => {
    expect(fillSlots(['a', 'b'], ['a', 'b'], 'tabs', 'b')).toEqual(['b'])
  })
  it('hält Positionen stabil: ein Terminal in einem leeren Slot bleibt dort', () => {
    expect(fillSlots(['a', 'b'], ['a', null, null, 'b'], 'grid', 'b')).toEqual(['a', null, null, 'b'])
  })
  it('entfernt geschlossene Terminals und verdoppelt keine', () => {
    expect(fillSlots(['a'], ['x', 'a'], 'columns', 'a')).toEqual([null, 'a'])
    expect(fillSlots(['a', 'b'], ['a', 'a'], 'columns', 'a')).toEqual(['a', 'b'])
  })
  it('kommt ohne Terminals aus', () => {
    expect(fillSlots([], [], 'columns', null)).toEqual([null, null])
  })
})

describe('placeInSlot', () => {
  it('tauscht, wenn das Terminal schon in einem anderen Slot steht', () => {
    expect(placeInSlot(['a', 'b'], 0, 'b')).toEqual(['b', 'a'])
  })
  it('setzt ein nicht angezeigtes Terminal ein', () => {
    expect(placeInSlot(['a', 'b'], 1, 'c')).toEqual(['a', 'c'])
  })
})

describe('moveInOrder', () => {
  it('verschiebt vor ein Ziel oder ans Ende', () => {
    expect(moveInOrder(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b'])
    expect(moveInOrder(['a', 'b', 'c'], 'a', null)).toEqual(['b', 'c', 'a'])
    expect(moveInOrder(['a', 'b', 'c'], 'b', 'b')).toEqual(['a', 'b', 'c'])
  })
})

describe('orchestratorFirst', () => {
  it('stellt den Orchestrator an den Anfang und lässt den Rest in Reihenfolge', () => {
    expect(orchestratorFirst(['a', 'o', 'b'], [{ id: 'a' }, { id: 'o', orchestrator: true }, { id: 'b' }])).toEqual(['o', 'a', 'b'])
  })

  it('ändert nichts ohne Orchestrator', () => {
    expect(orchestratorFirst(['a', 'b'], [{ id: 'a' }, { id: 'b' }])).toEqual(['a', 'b'])
  })
})
