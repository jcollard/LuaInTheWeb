/**
 * Helpers shared by the pixel and xterm AnsiTerminalPanel variants.
 */

import { CrtShader, type CrtConfig } from '@lua-learning/lua-runtime'
import type { ScaleMode } from '../AnsiGraphicsEditor/types'

/** Compute a numeric scale factor for the chosen mode. */
export function computeScale(
  mode: ScaleMode,
  containerW: number,
  containerH: number,
  baseW: number,
  baseH: number,
): number {
  if (baseW === 0 || baseH === 0) return 1
  switch (mode) {
    case 'integer-1x': return 1
    case 'integer-2x': return 2
    case 'integer-3x': return 3
    case 'fit': return Math.min(containerW / baseW, containerH / baseH)
    case 'fill': return Math.max(containerW / baseW, containerH / baseH)
    default: // 'integer-auto'
      return Math.max(1, Math.floor(Math.min(containerW / baseW, containerH / baseH)))
  }
}

/**
 * Snap fillRect calls to integer device pixels on an xterm canvas.
 * Prevents antialiasing seams between cells when xterm's glyph renderer
 * divides cells into eighths and produces fractional coordinates at
 * fractional DPRs.
 */
export function patchFillRect(canvas: Element): void {
  const ctx = (canvas as HTMLCanvasElement).getContext('2d')
  if (!ctx) return
  const patched = ctx as unknown as Record<string, unknown>
  if (patched.__patchedFR) return
  const orig = ctx.fillRect.bind(ctx)
  ctx.fillRect = (x: number, y: number, w: number, h: number) => {
    const x1 = Math.round(x)
    const y1 = Math.round(y)
    orig(x1, y1, Math.round(x + w) - x1, Math.round(y + h) - y1)
  }
  patched.__patchedFR = true
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
