import { describe, it, expect } from 'vitest'
import { computeScale, resolveRenderScale, snapToDprCleanScale } from './panelHelpers'

describe('snapToDprCleanScale', () => {
  it('returns ceil(scale) when DPR is already integer', () => {
    for (const dpr of [1, 2, 3, 4]) {
      for (const s of [1, 2, 3, 5]) {
        expect(snapToDprCleanScale(s, dpr)).toBe(s)
      }
    }
  })

  it('snaps 1 → 2 at DPR 1.5 (smallest N where N*1.5 is integer)', () => {
    expect(snapToDprCleanScale(1, 1.5)).toBe(2)
  })

  it('returns 2 at DPR 1.5 for scale 2 (already clean)', () => {
    expect(snapToDprCleanScale(2, 1.5)).toBe(2)
  })

  it('snaps 3 → 4 at DPR 1.5', () => {
    expect(snapToDprCleanScale(3, 1.5)).toBe(4)
  })

  it('snaps 1 → 4 at DPR 1.25 (smallest N where N*1.25 is integer)', () => {
    expect(snapToDprCleanScale(1, 1.25)).toBe(4)
  })

  it('snaps 1 → 4 at DPR 1.75', () => {
    expect(snapToDprCleanScale(1, 1.75)).toBe(4)
  })

  it('snaps 1 → 2 at DPR 2.5', () => {
    expect(snapToDprCleanScale(1, 2.5)).toBe(2)
  })
})

describe('computeScale — dprCompensate', () => {
  const CONTAINER = 2000
  const BASE = 640

  it('unchanged on integer DPR (1.0)', () => {
    const s = computeScale('integer-auto', { w: CONTAINER, h: CONTAINER }, { w: BASE, h: BASE }, { dprCompensate: true, dpr: 1.0 })
    expect(s).toBe(3) // floor(2000/640) = 3
  })

  it('snaps integer-1x up to 2 at DPR=1.5', () => {
    const s = computeScale('integer-1x', { w: CONTAINER, h: CONTAINER }, { w: BASE, h: BASE }, { dprCompensate: true, dpr: 1.5 })
    expect(s).toBe(2)
  })

  it('integer-auto on typical editor container snaps 1→2 at DPR=1.5', () => {
    // A typical editor canvas area: 1200×700. baseW=640, baseH=200 (8×8 font).
    // integer-auto = floor(min(1200/640, 700/200)) = floor(min(1.875, 3.5)) = 1.
    // DPR=1.5 snap: 1 → 2. 2 × 640 = 1280 > 1200 → fails container fit,
    // falls back to 1 (unsnapped). This test documents the common case:
    // for fractional DPR displays, scaling up enough to be clean often
    // requires headroom the editor may not have → user gets nominal scale.
    const s = computeScale('integer-auto', { w: 1200, h: 700 }, { w: 640, h: 200 }, { dprCompensate: true, dpr: 1.5 })
    expect(s).toBe(1)
  })

  it('integer-auto snaps 1→2 when container has room', () => {
    // 1400×600 editor area, 8×8 font at 80×25: base=640×200.
    // integer-auto = floor(min(1400/640, 600/200)) = 1. Snap to 2 → 1280×400, fits.
    const s = computeScale('integer-auto', { w: 1400, h: 600 }, { w: 640, h: 200 }, { dprCompensate: true, dpr: 1.5 })
    expect(s).toBe(2)
  })

  it('integer-3x snaps 3→4 at DPR=1.5 when container has room', () => {
    const s = computeScale('integer-3x', { w: 3000, h: 3000 }, { w: BASE, h: BASE }, { dprCompensate: true, dpr: 1.5 })
    expect(s).toBe(4)
  })

  it('honors flag only on integer modes (fit unchanged)', () => {
    const s = computeScale('fit', { w: CONTAINER, h: CONTAINER }, { w: BASE, h: BASE }, { dprCompensate: true, dpr: 1.5 })
    expect(s).toBeCloseTo(3.125, 3)
  })

  it('honors flag only on integer modes (fill unchanged)', () => {
    const s = computeScale('fill', { w: CONTAINER, h: 400 }, { w: BASE, h: BASE }, { dprCompensate: true, dpr: 1.5 })
    expect(s).toBeCloseTo(3.125, 3)
  })

  it('falls back to nominal scale when snapped value would overflow container', () => {
    // Tiny container: 700×700. baseW=640. Nominal integer-1x = 1, fits.
    // DPR=1.25, snap wants 4 → 2560×2560, way bigger than 700×700.
    const s = computeScale('integer-1x', { w: 700, h: 700 }, { w: BASE, h: BASE }, { dprCompensate: true, dpr: 1.25 })
    expect(s).toBe(1) // unsnapped — better than overflowing
  })

  it('disabled flag: behaves as before (integer-auto on DPR=1.5 container 2000)', () => {
    const s = computeScale('integer-auto', { w: CONTAINER, h: CONTAINER }, { w: BASE, h: BASE }, { dprCompensate: false, dpr: 1.5 })
    expect(s).toBe(3) // no snap
  })

  it('omitting options produces legacy behavior', () => {
    const s = computeScale('integer-auto', { w: CONTAINER, h: CONTAINER }, { w: BASE, h: BASE })
    expect(s).toBe(3)
  })
})

describe('resolveRenderScale', () => {
  const CONTAINER = { w: 2000, h: 2000 }
  const BASE = { w: 640, h: 400 }

  it('returns the explicit zoom when provided (no DPR snap)', () => {
    expect(resolveRenderScale(2.5, 'integer-auto', CONTAINER, BASE)).toBe(2.5)
  })

  it('passes a non-integer zoom through unchanged', () => {
    expect(resolveRenderScale(1.22, 'integer-1x', CONTAINER, BASE)).toBe(1.22)
  })

  it('falls back to scaleMode-based computation when zoom is undefined', () => {
    expect(resolveRenderScale(undefined, 'integer-2x', CONTAINER, BASE)).toBe(2)
  })

  it('applies DPR snap to explicit zoom when dprCompensate is on', () => {
    // zoom=1, dpr=1.5 → snap up to 2 (smallest N where N*1.5 is integer)
    expect(resolveRenderScale(1, 'integer-1x', CONTAINER, BASE, { dprCompensate: true, dpr: 1.5 })).toBe(2)
  })

  it('does not apply DPR snap when dprCompensate is off', () => {
    expect(resolveRenderScale(1, 'integer-1x', CONTAINER, BASE, { dprCompensate: false, dpr: 1.5 })).toBe(1)
  })

  it('does not apply container-overflow guard to explicit zoom — scrollbars handle it', () => {
    // Tiny container vs huge zoom: scaleMode-based computeScale would
    // fall back to nominal; explicit zoom keeps the user's choice so
    // scrollbars on the wrapper let them pan to it.
    const tiny = { w: 100, h: 100 }
    expect(resolveRenderScale(8, 'integer-1x', tiny, BASE, { dprCompensate: true, dpr: 1.5 })).toBe(8)
  })
})
