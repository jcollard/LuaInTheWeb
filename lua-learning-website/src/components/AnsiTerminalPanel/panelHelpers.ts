/**
 * Helpers shared by the pixel and xterm AnsiTerminalPanel variants.
 */

import { useEffect } from 'react'
import { CrtShader, type CrtConfig } from '@lua-learning/lua-runtime'
import type { ScaleMode } from '../AnsiGraphicsEditor/types'

/**
 * Invoke `onChange` whenever `window.devicePixelRatio` changes (monitor
 * hot-swap, browser zoom). Uses `matchMedia` — the only reliable
 * cross-browser DPR-change event. No-op in non-browser environments.
 */
export function useDprChange(onChange: () => void): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  // Intentionally empty — we re-subscribe only on mount. The mq
  // captures the current DPR, and when DPR changes, onChange fires
  // exactly once and subsequent changes re-fire on the same listener.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/** Options for `computeScale`. */
export interface ComputeScaleOptions {
  /**
   * When true and the mode is an integer mode, snap the chosen scale UP
   * to the smallest multiple `N ≥ scale` such that `N × dpr` is integer.
   * This eliminates the 1-2-1-2 device-pixel distribution caused by
   * fractional DPR (the "column stretching" artifact at DPR=1.5 etc.).
   * No-op on fit / fill modes (already fractional by design).
   */
  dprCompensate?: boolean
  /** Current `window.devicePixelRatio`. Defaults to 1 when omitted. */
  dpr?: number
}

const INTEGER_MODES: ReadonlySet<ScaleMode> = new Set<ScaleMode>([
  'integer-auto',
  'integer-1x',
  'integer-2x',
  'integer-3x',
])

/**
 * Snap `scale` up to the smallest integer `N ≥ scale` such that `N × dpr`
 * is an integer. Useful for picking a CSS scale whose device-pixel mapping
 * is uniform (no 1-2-1-2 browser-nearest-neighbor pattern).
 *
 * Examples:
 *   DPR=1.5: scale=1 → 2 (1.5 × 2 = 3). scale=2 → 2. scale=3 → 4.
 *   DPR=1.25: scale=1 → 4 (1.25 × 4 = 5). scale=5 → 8.
 *   DPR=1.0 / 2.0 / 3.0: any integer is clean; returns `ceil(scale)`.
 *
 * Hard cap at 16 — protects against fractional DPRs we'd never expect
 * (e.g. 1.3333...) from looping. 16× source is already excessive.
 */
export function snapToDprCleanScale(scale: number, dpr: number): number {
  const MAX = 16
  let n = Math.max(1, Math.ceil(scale))
  while (n <= MAX) {
    const product = n * dpr
    // Tolerance accounts for floating-point imprecision in DPR values.
    if (Math.abs(product - Math.round(product)) < 0.001) return n
    n += 1
  }
  // Safety net — return the requested scale unmodified if no clean
  // multiple exists in [1, MAX]. Caller's visual will be fractional
  // but rendering is still correct.
  return Math.max(1, Math.ceil(scale))
}

/** Compute a numeric scale factor for the chosen mode. */
export function computeScale(
  mode: ScaleMode,
  container: { w: number; h: number },
  base: { w: number; h: number },
  options: ComputeScaleOptions = {},
): number {
  if (base.w === 0 || base.h === 0) return 1
  let scale: number
  switch (mode) {
    case 'integer-1x': scale = 1; break
    case 'integer-2x': scale = 2; break
    case 'integer-3x': scale = 3; break
    case 'fit': return Math.min(container.w / base.w, container.h / base.h)
    case 'fill': return Math.max(container.w / base.w, container.h / base.h)
    default: // 'integer-auto'
      scale = Math.max(1, Math.floor(Math.min(container.w / base.w, container.h / base.h)))
  }
  if (options.dprCompensate && INTEGER_MODES.has(mode) && options.dpr && options.dpr > 0) {
    const snapped = snapToDprCleanScale(scale, options.dpr)
    // Fall back to the nominal scale when the snapped value would overflow
    // the container — a fractional-DPR render is better than a canvas the
    // user can't see the whole of.
    if (snapped * base.w <= container.w && snapped * base.h <= container.h) {
      return snapped
    }
  }
  return scale
}

/**
 * Resolve the effective render scale for a panel that may be driven
 * either by an explicit numeric `zoom` (editor viewport) or by the
 * legacy `scaleMode` enum (runtime auto-fit). When `zoom` is provided
 * it bypasses the mode-driven path entirely and is fed straight into
 * the renderer's CSS sizing — the user picked this exact value, so we
 * respect it.
 *
 * DPR-compensate is intentionally NOT applied here. With the legacy
 * integer-only scale modes, DPR snap rounded `1× → 2×` on fractional
 * DPRs to dodge the "1-2-1-2" device-pixel pattern; with user-driven
 * fractional zoom the same logic would silently lock the slider to
 * integers (e.g. zoom=1.22 → 2). The DprWarning surfaces the artifact
 * to users at low zoom on fractional DPRs so they can choose to bump
 * up themselves.
 */
export function resolveRenderScale(
  zoom: number | undefined,
  mode: ScaleMode,
  container: { w: number; h: number },
  base: { w: number; h: number },
  options: ComputeScaleOptions = {},
): number {
  if (zoom !== undefined) return zoom
  return computeScale(mode, container, base, options)
}

/**
 * Snap fillRect calls to integer device pixels on an xterm canvas.
 * Prevents antialiasing seams between cells when xterm's glyph renderer
 * divides cells into eighths and produces fractional coordinates at
 * fractional DPRs.
 */
const patchedContexts = new WeakSet<CanvasRenderingContext2D>()

export function patchFillRect(canvas: Element): void {
  const ctx = (canvas as HTMLCanvasElement).getContext('2d')
  if (!ctx || patchedContexts.has(ctx)) return
  const orig = ctx.fillRect.bind(ctx)
  ctx.fillRect = (x: number, y: number, w: number, h: number) => {
    const x1 = Math.round(x)
    const y1 = Math.round(y)
    orig(x1, y1, Math.round(x + w) - x1, Math.round(y + h) - y1)
  }
  patchedContexts.add(ctx)
}

/**
 * Build a `setCrt` function that either drives a WebGL `CrtShader`
 * (when a canvas is available) or falls back to a CSS-only effect on
 * the outer container. Shared verbatim by both renderer variants.
 *
 * `getCanvas` is called lazily each time to pick up the canvas that
 * actually exists at toggle time — xterm recreates its canvas on font
 * size change, and the pixel renderer's canvas lives inside the
 * wrapper once the renderer initializes.
 */
export interface SetCrtDeps {
  /** Outer container element receiving the CSS fallback class. */
  getContainer: () => HTMLElement | null
  /** The xterm / pixel canvas to bind the shader to. May return null. */
  getCanvas: () => HTMLCanvasElement | null
  /** CSS module class to apply for the fallback effect. */
  crtEnabledClass: string
  /** Mutable shader holder (cleared in dispose). */
  shaderRef: { current: CrtShader | null }
}

export function makeSetCrt(deps: SetCrtDeps) {
  return (enabled: boolean, intensity?: number, config?: Partial<CrtConfig>) => {
    const el = deps.getContainer()
    if (!el) return
    if (enabled) {
      const canvas = deps.getCanvas()
      if (canvas) {
        deps.shaderRef.current ??= new CrtShader(canvas, el, {
          fallbackCssClass: deps.crtEnabledClass,
        })
        if (config) {
          deps.shaderRef.current.enable(config)
        } else {
          deps.shaderRef.current.enable(intensity ?? undefined)
        }
      } else {
        el.classList.add(deps.crtEnabledClass)
        el.style.setProperty('--crt-intensity', String(intensity ?? 0.7))
      }
    } else {
      if (deps.shaderRef.current) {
        deps.shaderRef.current.disable()
      } else {
        el.classList.remove(deps.crtEnabledClass)
        el.style.removeProperty('--crt-intensity')
      }
    }
  }
}
