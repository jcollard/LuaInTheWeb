import { describe, it, expect } from 'vitest'
import { computeScale, resolveRenderScale } from './panelHelpers'

describe('computeScale', () => {
  const CONTAINER = { w: 2000, h: 2000 }
  const BASE = { w: 640, h: 640 }

  it('returns 1 when base is zero (degenerate)', () => {
    expect(computeScale('integer-auto', CONTAINER, { w: 0, h: 100 })).toBe(1)
    expect(computeScale('integer-auto', CONTAINER, { w: 100, h: 0 })).toBe(1)
  })

  it('integer-1x always returns 1', () => {
    expect(computeScale('integer-1x', CONTAINER, BASE)).toBe(1)
  })

  it('integer-2x always returns 2', () => {
    expect(computeScale('integer-2x', CONTAINER, BASE)).toBe(2)
  })

  it('integer-3x always returns 3', () => {
    expect(computeScale('integer-3x', CONTAINER, BASE)).toBe(3)
  })

  it('integer-auto returns the largest integer that fits', () => {
    // 2000/640 = 3.125 → floor = 3
    expect(computeScale('integer-auto', CONTAINER, BASE)).toBe(3)
  })

  it('integer-auto clamps to ≥ 1 when canvas does not fit', () => {
    expect(computeScale('integer-auto', { w: 100, h: 100 }, BASE)).toBe(1)
  })

  it('fit returns the largest fractional ratio that fits', () => {
    expect(computeScale('fit', CONTAINER, BASE)).toBeCloseTo(3.125, 3)
  })

  it('fill returns the larger fractional ratio (may overflow)', () => {
    expect(computeScale('fill', { w: 1000, h: 200 }, BASE)).toBeCloseTo(1.5625, 3)
  })
})

describe('resolveRenderScale', () => {
  const CONTAINER = { w: 2000, h: 2000 }
  const BASE = { w: 640, h: 400 }

  it('returns the explicit zoom unchanged when provided', () => {
    expect(resolveRenderScale(2.5, 'integer-auto', CONTAINER, BASE)).toBe(2.5)
  })

  it('passes a non-integer zoom through unchanged (no integer-locking)', () => {
    expect(resolveRenderScale(1.22, 'integer-1x', CONTAINER, BASE)).toBe(1.22)
  })

  it('respects sub-1x explicit zoom', () => {
    expect(resolveRenderScale(0.25, 'integer-1x', CONTAINER, BASE)).toBe(0.25)
    expect(resolveRenderScale(0.5, 'integer-1x', CONTAINER, BASE)).toBe(0.5)
  })

  it('falls back to scaleMode-based computation when zoom is undefined', () => {
    expect(resolveRenderScale(undefined, 'integer-2x', CONTAINER, BASE)).toBe(2)
  })

  it('does not apply container-overflow guard to explicit zoom — scrollbars handle it', () => {
    // Tiny container vs huge zoom: explicit zoom keeps the user's choice
    // so scrollbars on the wrapper let them pan to it.
    expect(resolveRenderScale(8, 'integer-1x', { w: 100, h: 100 }, BASE)).toBe(8)
  })
})
