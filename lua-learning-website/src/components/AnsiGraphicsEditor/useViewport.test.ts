/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  FIT_MIN_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  SNAP_TOLERANCE,
  clampZoom,
  fitZoom,
  snapZoom,
  useViewport,
  zoomAtPoint,
} from './useViewport'

describe('clampZoom', () => {
  it('returns the input when within range', () => {
    expect(clampZoom(2.5)).toBe(2.5)
  })

  it('allows sub-1x values (down to MIN_ZOOM)', () => {
    expect(clampZoom(0.5)).toBe(0.5)
    expect(clampZoom(MIN_ZOOM)).toBe(MIN_ZOOM)
  })

  it('clamps to MIN_ZOOM when below', () => {
    expect(clampZoom(MIN_ZOOM - 0.1)).toBe(MIN_ZOOM)
  })

  it('clamps to MAX_ZOOM when above', () => {
    expect(clampZoom(MAX_ZOOM + 1)).toBe(MAX_ZOOM)
  })

  it('returns NaN-safe MIN when given NaN', () => {
    expect(clampZoom(Number.NaN)).toBe(MIN_ZOOM)
  })
})

describe('snapZoom', () => {
  it('snaps to nearest integer when within tolerance', () => {
    expect(snapZoom(2 + SNAP_TOLERANCE / 2)).toBe(2)
    expect(snapZoom(2 - SNAP_TOLERANCE / 2)).toBe(2)
  })

  it('does not snap when outside tolerance', () => {
    const z = 2 + SNAP_TOLERANCE * 2
    expect(snapZoom(z)).toBe(z)
  })

  it('does not snap just outside tolerance', () => {
    const just = 3 + SNAP_TOLERANCE + 0.001
    expect(snapZoom(just)).toBe(just)
  })

  it('snaps just inside tolerance', () => {
    const just = 3 + SNAP_TOLERANCE - 0.001
    expect(snapZoom(just)).toBe(3)
  })

  it('snaps integers to themselves', () => {
    expect(snapZoom(1)).toBe(1)
    expect(snapZoom(5)).toBe(5)
  })

  it('respects custom tolerance', () => {
    expect(snapZoom(2.1, 0.2)).toBe(2)
    expect(snapZoom(2.1, 0.05)).toBe(2.1)
  })
})

describe('fitZoom', () => {
  it('returns largest integer that fits in both axes', () => {
    expect(fitZoom({ w: 80, h: 25 }, { w: 320, h: 100 })).toBe(4)
  })

  it('clamps to FIT_MIN_ZOOM (1x) when canvas does not fit at 1x — preserves Integer Auto behavior even though MIN_ZOOM is 0.25', () => {
    expect(fitZoom({ w: 200, h: 100 }, { w: 100, h: 50 })).toBe(FIT_MIN_ZOOM)
  })

  it('uses the smaller axis ratio (height-constrained)', () => {
    // wide viewport, short canvas: limited by height
    expect(fitZoom({ w: 80, h: 25 }, { w: 1600, h: 75 })).toBe(3)
  })

  it('uses the smaller axis ratio (width-constrained)', () => {
    // narrow viewport, tall canvas: limited by width.
    // Independently exercises the viewport.w/base.w path so a mutation
    // that swaps the operator there doesn't survive behind a dominant h-axis.
    expect(fitZoom({ w: 80, h: 25 }, { w: 240, h: 200 })).toBe(3)
  })

  it('floors fractional ratios', () => {
    expect(fitZoom({ w: 80, h: 25 }, { w: 200, h: 62 })).toBe(2)
  })

  it('clamps to MAX_ZOOM for tiny canvases in huge viewports', () => {
    expect(fitZoom({ w: 1, h: 1 }, { w: 9999, h: 9999 })).toBe(MAX_ZOOM)
  })

  it('returns FIT_MIN_ZOOM when base size is zero', () => {
    expect(fitZoom({ w: 0, h: 25 }, { w: 800, h: 600 })).toBe(FIT_MIN_ZOOM)
    expect(fitZoom({ w: 80, h: 0 }, { w: 800, h: 600 })).toBe(FIT_MIN_ZOOM)
  })
})

describe('zoomAtPoint', () => {
  it('keeps the anchor point fixed when zooming in', () => {
    // Before: zoom=1, anchor at viewport (50, 50), no scroll.
    // Content point under cursor = (50, 50).
    // After zoom=2, content point doubles to (100, 100); to keep cursor over
    // it, scroll must be (50, 50).
    expect(zoomAtPoint(1, 2, { x: 50, y: 50 }, { x: 0, y: 0 })).toEqual({ x: 50, y: 50 })
  })

  it('returns current scroll when zoom is unchanged', () => {
    expect(zoomAtPoint(2, 2, { x: 100, y: 100 }, { x: 30, y: 40 })).toEqual({ x: 30, y: 40 })
  })

  it('symmetrically zooms out: reverses zoom-in math', () => {
    // From state {zoom=2, scroll=(50,50)} zooming out at anchor (50,50)
    // back to zoom=1 should reach scroll=(0,0).
    expect(zoomAtPoint(2, 1, { x: 50, y: 50 }, { x: 50, y: 50 })).toEqual({ x: 0, y: 0 })
  })

  it('handles non-zero scroll positions', () => {
    // zoom 1->2 at anchor (10, 10) with prior scroll (40, 40):
    // Content point under anchor = (10+40, 10+40) = (50, 50).
    // After 2x: content point = (100, 100). New scroll = 100-10 = 90 each.
    expect(zoomAtPoint(1, 2, { x: 10, y: 10 }, { x: 40, y: 40 })).toEqual({ x: 90, y: 90 })
  })

  it('preserves x/y independence', () => {
    const result = zoomAtPoint(1, 3, { x: 10, y: 50 }, { x: 0, y: 0 })
    expect(result.x).toBe(20) // 10*3 - 10
    expect(result.y).toBe(100) // 50*3 - 50
  })
})

describe('useViewport', () => {
  it('initializes at the given zoom', () => {
    const { result } = renderHook(() => useViewport(2))
    expect(result.current.zoom).toBe(2)
  })

  it('defaults to 1x when no initial zoom is provided', () => {
    const { result } = renderHook(() => useViewport())
    expect(result.current.zoom).toBe(1)
  })

  it('clamps the initial zoom', () => {
    const { result } = renderHook(() => useViewport(MAX_ZOOM + 5))
    expect(result.current.zoom).toBe(MAX_ZOOM)
  })

  it('snaps the initial zoom when within tolerance', () => {
    const { result } = renderHook(() => useViewport(2 + SNAP_TOLERANCE / 2))
    expect(result.current.zoom).toBe(2)
  })

  it('updates zoom via setZoom and snaps to integers', () => {
    const { result } = renderHook(() => useViewport(1))
    act(() => result.current.setZoom(2 + SNAP_TOLERANCE / 2))
    expect(result.current.zoom).toBe(2)
  })

  it('clamps zoom values via setZoom', () => {
    const { result } = renderHook(() => useViewport(1))
    act(() => result.current.setZoom(MAX_ZOOM + 100))
    expect(result.current.zoom).toBe(MAX_ZOOM)
    act(() => result.current.setZoom(-1))
    expect(result.current.zoom).toBe(MIN_ZOOM)
  })

  it('allows sub-1x values via setZoom', () => {
    const { result } = renderHook(() => useViewport(1))
    act(() => result.current.setZoom(0.5))
    expect(result.current.zoom).toBe(0.5)
    act(() => result.current.setZoom(0.25))
    expect(result.current.zoom).toBe(0.25)
  })

  it('preserves non-integer zoom outside snap zone', () => {
    const { result } = renderHook(() => useViewport(1))
    act(() => result.current.setZoom(2.5))
    expect(result.current.zoom).toBe(2.5)
  })
})
