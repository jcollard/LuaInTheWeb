/**
 * StyleAPI - Facade for canvas style operations.
 *
 * This class manages style-related canvas operations including:
 * - Line styles (cap, join, miter, dash)
 * - Fill and stroke styles
 * - Shadow properties
 * - Compositing (alpha, blend modes, image smoothing)
 *
 * It uses callback dependency injection for addDrawCommand() to integrate
 * with the CanvasController's command queue.
 */

import type {
  DrawCommand,
  FillStyle,
  GlobalCompositeOperation,
} from '@lua-learning/canvas-runtime'

/**
 * Interface for StyleAPI public methods.
 */
export interface IStyleAPI {
  // Line styles
  setLineCap(cap: 'butt' | 'round' | 'square'): void
  setLineJoin(join: 'miter' | 'round' | 'bevel'): void
  setMiterLimit(limit: number): void
  setLineDash(segments: number[]): void
  getLineDash(): number[]
  setLineDashOffset(offset: number): void

  // Fill/stroke styles
  setFillStyle(style: FillStyle): void
  setStrokeStyle(style: FillStyle): void

  // Shadow properties
  setShadowColor(color: string): void
  setShadowBlur(blur: number): void
  setShadowOffsetX(offset: number): void
  setShadowOffsetY(offset: number): void
  setShadow(color: string, blur: number, offsetX: number, offsetY: number): void
  clearShadow(): void

  // Compositing
  setGlobalAlpha(alpha: number): void
  setCompositeOperation(operation: GlobalCompositeOperation): void
  setImageSmoothing(enabled: boolean): void
}

/**
 * Facade for canvas style operations.
 * Provides null-safe access to style settings via callback dependency injection.
 */
export class StyleAPI implements IStyleAPI {
  private addDrawCommand: ((cmd: DrawCommand) => void) | null = null
  private lineDashSegments: number[] = []
  private lineDashCache: number[] | null = null

  /**
   * Set the callback for adding draw commands.
   * Required for all style operations to take effect.
   * @param fn - Callback to add a draw command, or null to disable
   */
  setAddDrawCommand(fn: ((cmd: DrawCommand) => void) | null): void {
    this.addDrawCommand = fn
  }

  // ============================================================================
  // Line Style Methods
  // ============================================================================

  /**
   * Set the line cap style for stroke endpoints.
   * @param cap - Line cap style: "butt" (default), "round", or "square"
   */
  setLineCap(cap: 'butt' | 'round' | 'square'): void {
    this.addDrawCommand?.({ type: 'setLineCap', cap })
  }

  /**
   * Set the line join style for stroke corners.
   * @param join - Line join style: "miter" (default), "round", or "bevel"
   */
  setLineJoin(join: 'miter' | 'round' | 'bevel'): void {
    this.addDrawCommand?.({ type: 'setLineJoin', join })
  }

  /**
   * Set the miter limit for sharp corners.
   * Only applies when lineJoin is "miter".
   * @param limit - Miter limit value (default: 10)
   */
  setMiterLimit(limit: number): void {
    this.addDrawCommand?.({ type: 'setMiterLimit', limit })
  }

  /**
   * Set the line dash pattern for strokes.
   * @param segments - Array of dash and gap lengths (e.g., [10, 5] for 10px dash, 5px gap)
   *                   Empty array resets to solid line.
   */
  setLineDash(segments: number[]): void {
    this.lineDashSegments = [...segments]
    this.lineDashCache = null
    this.addDrawCommand?.({ type: 'setLineDash', segments: this.lineDashSegments })
  }

  /**
   * Get the current line dash pattern.
   * Uses lazy caching to reduce GC pressure in animation loops.
   * @returns Cached copy of the current dash pattern array
   */
  getLineDash(): number[] {
    if (this.lineDashCache === null) {
      this.lineDashCache = [...this.lineDashSegments]
    }
    return this.lineDashCache
  }

  /**
   * Set the line dash offset for animating dashed lines.
   * @param offset - Offset to shift the dash pattern (useful for marching ants animation)
   */
  setLineDashOffset(offset: number): void {
    this.addDrawCommand?.({ type: 'setLineDashOffset', offset })
  }

  // ============================================================================
  // Fill/Stroke Style Methods
  // ============================================================================

  /**
   * Set the fill style (color or gradient).
   * @param style - CSS color string or gradient definition
   */
  setFillStyle(style: FillStyle): void {
    this.addDrawCommand?.({ type: 'setFillStyle', style })
  }

  /**
   * Set the stroke style (color or gradient).
   * @param style - CSS color string or gradient definition
   */
  setStrokeStyle(style: FillStyle): void {
    this.addDrawCommand?.({ type: 'setStrokeStyle', style })
  }

  // ============================================================================
  // Shadow Methods
  // ============================================================================

  /**
   * Set the shadow color.
   * @param color - CSS color string
   */
  setShadowColor(color: string): void {
    this.addDrawCommand?.({ type: 'setShadowColor', color })
  }

  /**
   * Set the shadow blur radius.
   * @param blur - Blur radius in pixels
   */
  setShadowBlur(blur: number): void {
    this.addDrawCommand?.({ type: 'setShadowBlur', blur })
  }

  /**
   * Set the shadow horizontal offset.
   * @param offset - Offset in pixels
   */
  setShadowOffsetX(offset: number): void {
    this.addDrawCommand?.({ type: 'setShadowOffsetX', offset })
  }

  /**
   * Set the shadow vertical offset.
   * @param offset - Offset in pixels
   */
  setShadowOffsetY(offset: number): void {
    this.addDrawCommand?.({ type: 'setShadowOffsetY', offset })
  }

  /**
   * Set all shadow properties at once.
   * @param color - CSS color string
   * @param blur - Blur radius in pixels
   * @param offsetX - Horizontal offset in pixels
   * @param offsetY - Vertical offset in pixels
   */
  setShadow(color: string, blur: number, offsetX: number, offsetY: number): void {
    this.addDrawCommand?.({ type: 'setShadow', color, blur, offsetX, offsetY })
  }

  /**
   * Clear all shadow properties.
   */
  clearShadow(): void {
    this.addDrawCommand?.({ type: 'clearShadow' })
  }

  // ============================================================================
  // Compositing Methods
  // ============================================================================

  /**
   * Set the global alpha (transparency) for all subsequent drawing.
   * @param alpha - Value from 0.0 (fully transparent) to 1.0 (fully opaque)
   */
  setGlobalAlpha(alpha: number): void {
    this.addDrawCommand?.({ type: 'setGlobalAlpha', alpha })
  }

  /**
   * Set the composite operation (blend mode) for all subsequent drawing.
   * @param operation - The blend mode to use
   */
  setCompositeOperation(operation: GlobalCompositeOperation): void {
    this.addDrawCommand?.({ type: 'setCompositeOperation', operation })
  }

  /**
   * Set image smoothing (anti-aliasing) for image rendering.
   * Disable for crisp pixel art, enable for smooth scaled images.
   * @param enabled - Whether to enable image smoothing (default: true)
   */
  setImageSmoothing(enabled: boolean): void {
    this.addDrawCommand?.({ type: 'setImageSmoothing', enabled })
  }
}
