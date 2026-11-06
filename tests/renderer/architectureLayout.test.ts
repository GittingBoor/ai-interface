import { describe, expect, it } from 'vitest'
import type { KnowledgeEdge, KnowledgeNode } from '../../src/shared/knowledge'
import { layoutArchitecture, NODE_HEIGHT, NODE_WIDTH } from '../../src/renderer/src/views/knowledge/architectureLayout'

const node = (id: string): KnowledgeNode => ({ id, label: id.toUpperCase(), kind: 'service' })
const edge = (from: string, to: string): KnowledgeEdge => ({ from, to })

function layerOf(result: ReturnType<typeof layoutArchitecture>, id: string): number | undefined {
  return result.nodes.find((n) => n.id === id)?.layer
}

describe('layoutArchitecture', () => {
  it('chain a→b→c gets layers 0,1,2', () => {
    const result = layoutArchitecture([node('c'), node('a'), node('b')], [edge('a', 'b'), edge('b', 'c')])
    expect([layerOf(result, 'a'), layerOf(result, 'b'), layerOf(result, 'c')]).toEqual([0, 1, 2])
  })

  it('Schicht ist der längste Pfad von einer Quelle', () => {
    const result = layoutArchitecture([node('a'), node('b'), node('c'), node('d')], [edge('a', 'b'), edge('b', 'c'), edge('a', 'c'), edge('d', 'c')])
    expect(layerOf(result, 'c')).toBe(2)
    expect(layerOf(result, 'd')).toBe(0)
  })

  it('cycle does not loop forever', () => {
    const result = layoutArchitecture([node('a'), node('b'), node('c')], [edge('a', 'b'), edge('b', 'c'), edge('c', 'a')])
    expect(result.nodes).toHaveLength(3)
    expect([layerOf(result, 'a'), layerOf(result, 'b'), layerOf(result, 'c')]).toEqual([0, 1, 2])
  })

  it('isolated node in layer 0', () => {
    const result = layoutArchitecture([node('a'), node('b'), node('solo')], [edge('a', 'b')])
    expect(layerOf(result, 'solo')).toBe(0)
  })

  it('Kanten zu unbekannten Knoten werden ignoriert', () => {
    const result = layoutArchitecture([node('a')], [edge('a', 'ghost'), edge('ghost', 'a')])
    expect(layerOf(result, 'a')).toBe(0)
  })

  it('no overlapping nodes in a layer', () => {
    const nodes = ['root', 'x', 'y', 'z'].map(node)
    const result = layoutArchitecture(nodes, [edge('root', 'x'), edge('root', 'y'), edge('root', 'z')])
    const layer1 = result.nodes.filter((n) => n.layer === 1).sort((a, b) => a.y - b.y)
    expect(layer1).toHaveLength(3)
    for (let i = 1; i < layer1.length; i += 1) {
      const previous = layer1[i - 1]
      const current = layer1[i]
      expect(previous && current && current.y - previous.y).toBeGreaterThanOrEqual(NODE_HEIGHT)
    }
    expect(new Set(layer1.map((n) => n.x)).size).toBe(1)
  })

  it('Gesamtgröße umfasst alle Knoten', () => {
    const result = layoutArchitecture([node('a'), node('b'), node('c')], [edge('a', 'b'), edge('a', 'c')])
    for (const n of result.nodes) {
      expect(n.x + NODE_WIDTH).toBeLessThanOrEqual(result.width)
      expect(n.y + NODE_HEIGHT).toBeLessThanOrEqual(result.height)
    }
  })

  it('leere Architektur hat keine Fläche', () => {
    expect(layoutArchitecture([], [])).toEqual({ nodes: [], width: 0, height: 0 })
  })
})
