import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { KnowledgeProgress } from '@shared/knowledge'

const refreshMock = vi.hoisted(() => vi.fn())

vi.mock('@renderer/api/client', () => ({
  api: {
    on: vi.fn(() => () => undefined),
    knowledge: { list: vi.fn(), progress: vi.fn(), refresh: refreshMock }
  }
}))

import { useKnowledge } from '@renderer/stores/knowledgeStore'

const IDLE: KnowledgeProgress = { active: false, total: 0, done: 0, deferred: 0, runs: [] }
const RUNNING: KnowledgeProgress = { active: true, total: 5, done: 2, deferred: 1, runs: [] }

describe('knowledgeStore', () => {
  beforeEach(() => {
    refreshMock.mockReset()
    useKnowledge.setState({ progress: IDLE })
  })

  it('applyProgress updates active flag', () => {
    useKnowledge.getState().applyProgress(RUNNING)
    expect(useKnowledge.getState().progress.active).toBe(true)
    useKnowledge.getState().applyProgress(IDLE)
    expect(useKnowledge.getState().progress.active).toBe(false)
  })

  it('refresh while active is ignored', async () => {
    useKnowledge.getState().applyProgress(RUNNING)
    await useKnowledge.getState().refresh()
    expect(refreshMock).not.toHaveBeenCalled()
  })
})
