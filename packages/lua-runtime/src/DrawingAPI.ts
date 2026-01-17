/**
 * DrawingAPI - Facade for canvas drawing primitive operations.
 *
 * This class manages drawing-related canvas operations including:
 * - Canvas clearing (clear, clearRect)
 * - Color and line width settings (setColor, setLineWidth)
 * - Shape primitives (drawRect, fillRect, drawCircle, fillCircle, drawLine)
 * - Text rendering (drawText, strokeText)
 *
 * It uses callback dependency injection for addDrawCommand() to integrate
 * with the CanvasController's command queue.
 */

import type { DrawCommand } from '@lua-learning/canvas-runtime'

/**
 * Options for text drawing methods.
 */
export interface TextOptions {
  fontSize?: number
  fontFamily?: string
  maxWidth?: number
}

/**
 * Interface for DrawingAPI public methods.
 */
export interface IDrawingAPI {
  // Canvas clearing
  clear(): void
  clearRect(x: number, y: number, width: number, height: number): void

  // Color and line settings
  setColor(r: number, g: number, b: number, a?: number): void
  setLineWidth(width: number): void

  // Shape primitives
  drawRect(x: number, y: number, width: number, height: number): void
  fillRect(x: number, y: number, width: number, height: number): void
  drawCircle(x: number, y: number, radius: number): void
  fillCircle(x: number, y: number, radius: number): void
  drawLine(x1: number, y1: number, x2: number, y2: number): void

  // Text rendering
  drawText(x: number, y: number, text: string, options?: TextOptions): void
  strokeText(x: number, y: number, text: string, options?: TextOptions): void
}

/**
 * Facade for canvas drawing primitive operations.
 * Provides null-safe access to drawing operations via callback dependency injection.
 */
export class DrawingAPI implements IDrawingAPI {
  private addDrawCommand: ((cmd: DrawCommand) => void) | null = null

  /**
   * Set the callback for adding draw commands.
   * Required for all drawing operations to take effect.
   * @param fn - Callback to add a draw command, or null to disable
   */
  setAddDrawCommand(fn: ((cmd: DrawCommand) => void) | null): void {
    this.addDrawCommand = fn
  }

  // ============================================================================
  // Canvas Clearing Methods
  // ============================================================================

  /**
   * Clear the entire canvas.
   */
  clear(): void {
    this.addDrawCommand?.({ type: 'clear' })
  }

  /**
   * Clear a rectangular area of the canvas to transparent.
   * @param x - X coordinate of the top-left corner
   * @param y - Y coordinate of the top-left corner
   * @param width - Width of the rectangle
   * @param height - Height of the rectangle
   */
  clearRect(x: number, y: number, width: number, height: number): void {
    this.addDrawCommand?.({ type: 'clearRect', x, y, width, height })
  }

  // ============================================================================
  // Color and Line Width Methods
  // ============================================================================

  /**
   * Set the drawing color using RGB(A) values.
   * @param r - Red component (0-255)
   * @param g - Green component (0-255)
   * @param b - Blue component (0-255)
   * @param a - Optional alpha component (0-255 or 0-1 depending on renderer)
   */
  setColor(r: number, g: number, b: number, a?: number): void {
    const command: DrawCommand = { type: 'setColor', r, g, b }
    if (a !== undefined && a !== null) {
      (command as { type: 'setColor'; r: number; g: number; b: number; a?: number }).a = a
    }
    this.addDrawCommand?.(command)
  }

  /**
   * Set the line width for stroke operations.
   * @param width - Line width in pixels
   */
  setLineWidth(width: number): void {
    this.addDrawCommand?.({ type: 'setLineWidth', width })
  }

  // ============================================================================
  // Shape Primitive Methods
  // ============================================================================

  /**
   * Draw a rectangle outline.
   * @param x - X coordinate of the top-left corner
   * @param y - Y coordinate of the top-left corner
   * @param width - Width of the rectangle
   * @param height - Height of the rectangle
   */
  drawRect(x: number, y: number, width: number, height: number): void {
    this.addDrawCommand?.({ type: 'rect', x, y, width, height })
  }

  /**
   * Draw a filled rectangle.
   * @param x - X coordinate of the top-left corner
   * @param y - Y coordinate of the top-left corner
   * @param width - Width of the rectangle
   * @param height - Height of the rectangle
   */
  fillRect(x: number, y: number, width: number, height: number): void {
    this.addDrawCommand?.({ type: 'fillRect', x, y, width, height })
  }

  /**
   * Draw a circle outline.
   * @param x - X coordinate of the center
   * @param y - Y coordinate of the center
   * @param radius - Radius of the circle
   */
  drawCircle(x: number, y: number, radius: number): void {
    this.addDrawCommand?.({ type: 'circle', x, y, radius })
  }

  /**
   * Draw a filled circle.
   * @param x - X coordinate of the center
   * @param y - Y coordinate of the center
   * @param radius - Radius of the circle
   */
  fillCircle(x: number, y: number, radius: number): void {
    this.addDrawCommand?.({ type: 'fillCircle', x, y, radius })
  }

  /**
   * Draw a line between two points.
   * @param x1 - X coordinate of the start point
   * @param y1 - Y coordinate of the start point
   * @param x2 - X coordinate of the end point
   * @param y2 - Y coordinate of the end point
   */
  drawLine(x1: number, y1: number, x2: number, y2: number): void {
    this.addDrawCommand?.({ type: 'line', x1, y1, x2, y2 })
  }

  // ============================================================================
  // Text Rendering Methods
  // ============================================================================

  /**
   * Draw filled text at the specified position.
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param text - Text to draw
   * @param options - Optional font overrides for this text only
   */
  drawText(x: number, y: number, text: string, options?: TextOptions): void {
    const command: DrawCommand = { type: 'text', x, y, text }
    if (options?.fontSize !== undefined) {
      (command as { fontSize?: number }).fontSize = options.fontSize
    }
    if (options?.fontFamily !== undefined) {
      (command as { fontFamily?: string }).fontFamily = options.fontFamily
    }
    if (options?.maxWidth !== undefined) {
      (command as { maxWidth?: number }).maxWidth = options.maxWidth
    }
    this.addDrawCommand?.(command)
  }

  /**
   * Draw text outline (stroke) at the specified position.
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param text - Text to draw
   * @param options - Optional font overrides for this text only
   */
  strokeText(x: number, y: number, text: string, options?: TextOptions): void {
    const command: DrawCommand = { type: 'strokeText', x, y, text }
    if (options?.fontSize !== undefined) {
      (command as { fontSize?: number }).fontSize = options.fontSize
    }
    if (options?.fontFamily !== undefined) {
      (command as { fontFamily?: string }).fontFamily = options.fontFamily
    }
    if (options?.maxWidth !== undefined) {
      (command as { maxWidth?: number }).maxWidth = options.maxWidth
    }
    this.addDrawCommand?.(command)
  }
}
