import { describe, it, expect } from 'vitest'
import { startPan, advancePan } from '../src/screenPan'

describe('startPan', () => {
  it('creates a pan state with given parameters', () => {
    const pan = startPan(2, 0, 0, 80, 0)
    expect(pan.startCol).toBe(0)
    expect(pan.startRow).toBe(0)
    expect(pan.endCol).toBe(80)
    expect(pan.endRow).toBe(0)
    expect(pan.duration).toBe(2)
    expect(pan.elapsed).toBe(0)
  })

  it('throws for non-positive duration', () => {
    expect(() => startPan(0, 0, 0, 80, 0)).toThrow()
    expect(() => startPan(-1, 0, 0, 80, 0)).toThrow()
  })
})

describe('advancePan', () => {
  it('interpolates position linearly', () => {
    const pan = startPan(2, 0, 0, 80, 0)
    const result = advancePan(pan, 1) // halfway
    expect(result.col).toBe(40)
    expect(result.row).toBe(0)
    expect(result.done).toBe(false)
  })

  it('accumulates elapsed across multiple calls', () => {
    const pan = startPan(4, 0, 0, 80, 0)
    advancePan(pan, 1) // 25%
    const result = advancePan(pan, 1) // 50%
    expect(result.col).toBe(40)
    expect(result.done).toBe(false)
  })

  it('clamps at end position when elapsed >= duration', () => {
    const pan = startPan(2, 0, 0, 80, 0)
    const result = advancePan(pan, 3) // overshoot
    expect(result.col).toBe(80)
    expect(result.row).toBe(0)
    expect(result.done).toBe(true)
  })

  it('returns done=true at exactly duration', () => {
    const pan = startPan(2, 0, 0, 80, 0)
    const result = advancePan(pan, 2)
    expect(result.col).toBe(80)
    expect(result.done).toBe(true)
  })

  it('interpolates both row and col', () => {
    const pan = startPan(2, 10, 5, 50, 25)
    const result = advancePan(pan, 1) // halfway
    expect(result.col).toBe(30) // 10 + (50-10)*0.5
    expect(result.row).toBe(15) // 5 + (25-5)*0.5
  })

  it('supports negative direction (panning left/up)', () => {
    const pan = startPan(2, 80, 0, 0, 0)
    const result = advancePan(pan, 1) // halfway
    expect(result.col).toBe(40)
    expect(result.row).toBe(0)
  })

  it('handles fractional delta times', () => {
    const pan = startPan(1, 0, 0, 100, 0)
    const result = advancePan(pan, 0.1) // 10%
    expect(result.col).toBeCloseTo(10)
    expect(result.done).toBe(false)
  })
})
