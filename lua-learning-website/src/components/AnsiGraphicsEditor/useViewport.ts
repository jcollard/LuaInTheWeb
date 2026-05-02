import { useCallback, useState } from 'react'

/** Minimum allowed zoom for user-driven setZoom (slider / numeric input /
 * Ctrl+wheel). Allows shrinking below 1× so a user can preview an
 * oversized canvas in one frame. */
export const MIN_ZOOM = 0.25

/** Maximum allowed zoom. Matches the toolbar slider range. */
export const MAX_ZOOM = 8

/** Floor used by the Fit calculator. Preserves the prior `Integer Auto`
 * behavior (largest integer ≥ 1 that fits) so existing files don't
 * suddenly load at sub-1× zoom. */
export const FIT_MIN_ZOOM = 1

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
  if (base.w <= 0 || base.h <= 0) return FIT_MIN_ZOOM
  const fit = Math.floor(Math.min(viewport.w / base.w, viewport.h / base.h))
  return clampZoom(Math.max(FIT_MIN_ZOOM, fit))
}

/** Tolerance for `zoom × dpr` equaling an integer. Tight enough that
 *  legit fractional values aren't accidentally classified as crisp. */
const CRISP_TOLERANCE = 0.001

/**
 * True when `zoom × dpr` lands on (or near) an integer — i.e. one
 * source pixel maps to a whole number of device pixels and the canvas
 * displays without the "1-2-1-2" subpixel-resampling pattern.
 */
export function isCrisp(zoom: number, dpr: number): boolean {
  if (dpr <= 0) return false
  const product = zoom * dpr
  return Math.abs(product - Math.round(product)) < CRISP_TOLERANCE
}

/**
 * Smallest crisp zoom ≥ the current zoom. Returns `null` when no crisp
 * value exists in `[zoom, MAX_ZOOM]` — caller should treat that as
 * "can't snap up; user is already past the highest crisp tick."
 */
export function nextCrispZoom(zoom: number, dpr: number): number | null {
  if (dpr <= 0) return null
  if (isCrisp(zoom, dpr)) return zoom
  // Crisp values are k/dpr for integer k. Next k above zoom × dpr.
  const k = Math.floor(zoom * dpr) + 1
  const candidate = k / dpr
  if (candidate > MAX_ZOOM + CRISP_TOLERANCE) return null
  return Math.min(candidate, MAX_ZOOM)
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
