import { useCallback, useState } from 'react'

/** Minimum allowed zoom. The Fit calculator clamps to this when the canvas
 * doesn't fit at 1x — old `Integer Auto` behaved the same. */
export const MIN_ZOOM = 1

/** Maximum allowed zoom. Matches the toolbar slider range. */
export const MAX_ZOOM = 8

/** Absolute snap-to-integer tolerance: |z - round(z)| ≤ this snaps to the integer. */
export const SNAP_TOLERANCE = 0.04

export function clampZoom(z: number, min = MIN_ZOOM, max = MAX_ZOOM): number {
  if (Number.isNaN(z)) return min
  if (z < min) return min
  if (z > max) return max
  return z
}

export function snapZoom(z: number, tolerance = SNAP_TOLERANCE): number {
  const rounded = Math.round(z)
  return Math.abs(z - rounded) <= tolerance ? rounded : z
}

export function fitZoom(
  base: { w: number; h: number },
  viewport: { w: number; h: number },
): number {
  if (base.w <= 0 || base.h <= 0) return MIN_ZOOM
  const fit = Math.floor(Math.min(viewport.w / base.w, viewport.h / base.h))
  return clampZoom(fit)
}

/**
 * When zooming in/out at a fixed cursor anchor, return the new scroll
 * position that keeps the same content point under the cursor.
 *
 * `anchorLocal` is the cursor offset relative to the scroll wrapper's
 * top-left (i.e. `clientX - wrapperRect.left`). Caller is responsible
 * for clamping the result to the wrapper's actual scroll range.
 */
export function zoomAtPoint(
  oldZoom: number,
  newZoom: number,
  anchorLocal: { x: number; y: number },
  scroll: { x: number; y: number },
): { x: number; y: number } {
  const ratio = newZoom / oldZoom
  return {
    x: (anchorLocal.x + scroll.x) * ratio - anchorLocal.x,
    y: (anchorLocal.y + scroll.y) * ratio - anchorLocal.y,
  }
}

export interface UseViewportResult {
  zoom: number
  setZoom: (z: number) => void
}

/** Owns the zoom value with snap + clamp applied on every set. */
export function useViewport(initialZoom: number = 1): UseViewportResult {
  const [zoom, setZoomState] = useState(() => snapZoom(clampZoom(initialZoom)))
  const setZoom = useCallback((z: number) => {
    setZoomState(snapZoom(clampZoom(z)))
  }, [])
  return { zoom, setZoom }
}
