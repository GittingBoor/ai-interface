import { describe, expect, it } from 'vitest'
import { CRASH_TEXT_LIMIT, crashReport } from '@shared/crashReport'

describe('crashReport', () => {
  it('übernimmt Meldung und Stack eines Error', () => {
    const error = new Error('kaputt')
    const report = crashReport('render', error, 'in ProjectsView')
    expect(report.source).toBe('render')
    expect(report.message).toBe('kaputt')
    expect(report.stack).toContain('kaputt')
    expect(report.stack).toContain('in ProjectsView')
  })

  it('macht aus beliebigen Werten Text', () => {
    expect(crashReport('rejection', 'nur Text').message).toBe('nur Text')
    expect(crashReport('rejection', { code: 42 }).message).toBe('{"code":42}')
    expect(crashReport('rejection', undefined).message).toBe('undefined')
  })

  it('kürzt zu lange Texte', () => {
    const report = crashReport('error', new Error('x'.repeat(CRASH_TEXT_LIMIT * 2)))
    expect(report.message.length).toBe(CRASH_TEXT_LIMIT)
    expect(report.stack.length).toBeLessThanOrEqual(CRASH_TEXT_LIMIT)
  })
})
