import { describe, expect, it } from 'vitest'
import { NotFoundError } from '../../src/main/errors'
import { assertOwnProtocol } from '../../src/main/knowledge/protocolGuard'
import type { ProtocolEntry } from '../../src/shared/types'

const entry = (path: string): ProtocolEntry => ({ path, name: path.split('/').pop() ?? path, modifiedAt: 0, size: 1 })

describe('assertOwnProtocol', () => {
  const entries = [entry('Programmieren/App/Protokoll/2026-11-01.md'), entry('Programmieren/App/Protokoll/2026-11-02.md')]

  it('lässt Protokolle des Projekts durch', () => {
    expect(() => assertOwnProtocol(entries, 'Programmieren/App/Protokoll/2026-11-02.md')).not.toThrow()
  })

  it('lehnt fremde Pfade mit NotFoundError ab', () => {
    expect(() => assertOwnProtocol(entries, 'Programmieren/Andere/Protokoll/2026-11-02.md')).toThrow(NotFoundError)
    expect(() => assertOwnProtocol([], 'x.md')).toThrow(NotFoundError)
  })
})
