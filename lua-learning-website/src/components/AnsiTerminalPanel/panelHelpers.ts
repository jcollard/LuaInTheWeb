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


/** Compute a numeric scale factor for the chosen mode. */
export function computeScale(
  mode: ScaleMode,
  container: { w: number; h: number },
  base: { w: number; h: number },
): number {
  if (base.w === 0 || base.h === 0) return 1
  switch (mode) {
    case 'integer-1x': return 1
    case 'integer-2x': return 2
    case 'integer-3x': return 3
    case 'fit': return Math.min(container.w / base.w, container.h / base.h)
    case 'fill': return Math.max(container.w / base.w, container.h / base.h)
    default: // 'integer-auto'
      return Math.max(1, Math.floor(Math.min(container.w / base.w, container.h / base.h)))
  }
}

/**
 * Resolve the effective render scale for a panel that may be driven
 * either by an explicit numeric `zoom` (editor viewport) or by the
 * legacy `scaleMode` enum (runtime auto-fit). When `zoom` is provided
 * it bypasses the mode-driven path entirely — the user picked this
 * exact value, so we respect it. The crispness indicator + snap
 * button in the toolbar handle the "1-2-1-2 pattern" concern at the
 * UI level rather than silently mutating the user's chosen zoom.
 */
export function resolveRenderScale(
  zoom: number | undefined,
  mode: ScaleMode,
  container: { w: number; h: number },
  base: { w: number; h: number },
): number {
  if (zoom !== undefined) return zoom
  return computeScale(mode, container, base)
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
