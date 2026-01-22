/**
 * PathAPI - Facade for canvas path operations.
 *
 * This class manages path-related canvas operations including:
 * - Path lifecycle (begin, close)
 * - Path building (moveTo, lineTo, curves, arcs)
 * - Path rendering (fill, stroke, clip)
 * - Path access for hit testing
 *
 * It uses callback dependency injection for addDrawCommand() to integrate
 * with the CanvasController's command queue.
 */

import type { DrawCommand } from '@lua-learning/canvas-runtime'

/** Fill rule for path operations. */
export type FillRule = 'nonzero' | 'evenodd'

/**
 * Interface for PathAPI public methods.
 */
export interface IPathAPI {
  // Path lifecycle
  beginPath(): void
  closePath(): void

  // Path building
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ): void
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ): void
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ): void
  roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radii: number | number[]
  ): void
  rectPath(x: number, y: number, width: number, height: number): void

  // Path rendering
  fill(): void
  stroke(): void
  clip(fillRule?: FillRule): void

  // Path access
  getCurrentPath(): Path2D
}

/**
 * Facade for canvas path operations.
 * Provides null-safe access to path operations via callback dependency injection.
 */
export class PathAPI implements IPathAPI {
  private currentPath: Path2D = new Path2D()
  private needsNewPath = false
  private addDrawCommand: ((cmd: DrawCommand) => void) | null = null

  /**
   * Ensure currentPath is ready for use.
   * Creates a new Path2D lazily if needed (after beginPath was called).
   * This reduces GC pressure by avoiding Path2D creation when beginPath
   * is called but no path operations follow.
   */
  private ensurePath(): void {
    if (this.needsNewPath) {
      this.currentPath = new Path2D()
      this.needsNewPath = false
    }
  }

  /**
   * Set the callback for adding draw commands.
   * Required for all path operations to take effect.
   * @param fn - Callback to add a draw command, or null to disable
   */
  setAddDrawCommand(fn: ((cmd: DrawCommand) => void) | null): void {
    this.addDrawCommand = fn
  }

  // ============================================================================
  // Path Lifecycle Methods
  // ============================================================================

  /**
   * Begin a new path, clearing any existing path data.
   * Uses lazy Path2D creation to reduce GC pressure - the new Path2D
   * is only created when a path operation is actually performed.
   */
  beginPath(): void {
    this.needsNewPath = true
    this.addDrawCommand?.({ type: 'beginPath' })
  }

  /**
   * Close the current path by drawing a line to the starting point.
   */
  closePath(): void {
    this.ensurePath()
    this.currentPath.closePath()
    this.addDrawCommand?.({ type: 'closePath' })
  }

  // ============================================================================
  // Path Building Methods
  // ============================================================================

  /**
   * Move the current point to a new position without drawing.
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  moveTo(x: number, y: number): void {
    this.ensurePath()
    this.currentPath.moveTo(x, y)
    this.addDrawCommand?.({ type: 'moveTo', x, y })
  }

  /**
   * Draw a line from the current point to a new position.
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  lineTo(x: number, y: number): void {
    this.ensurePath()
    this.currentPath.lineTo(x, y)
    this.addDrawCommand?.({ type: 'lineTo', x, y })
  }

  /**
   * Draw an arc (portion of a circle) on the current path.
   * @param x - X coordinate of the arc's center
   * @param y - Y coordinate of the arc's center
   * @param radius - Arc radius
   * @param startAngle - Start angle in radians
   * @param endAngle - End angle in radians
   * @param counterclockwise - Draw counterclockwise (default: false)
   */
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ): void {
    this.ensurePath()
    this.currentPath.arc(x, y, radius, startAngle, endAngle, counterclockwise)
    this.addDrawCommand?.({ type: 'arc', x, y, radius, startAngle, endAngle, counterclockwise })
  }

  /**
   * Draw an arc using tangent control points (for rounded corners).
   * @param x1 - X coordinate of first control point
   * @param y1 - Y coordinate of first control point
   * @param x2 - X coordinate of second control point
   * @param y2 - Y coordinate of second control point
   * @param radius - Arc radius
   */
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
    this.ensurePath()
    this.currentPath.arcTo(x1, y1, x2, y2, radius)
    this.addDrawCommand?.({ type: 'arcTo', x1, y1, x2, y2, radius })
  }

  /**
   * Draw a quadratic Bezier curve from the current point.
   * @param cpx - X coordinate of the control point
   * @param cpy - Y coordinate of the control point
   * @param x - X coordinate of the end point
   * @param y - Y coordinate of the end point
   */
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.ensurePath()
    this.currentPath.quadraticCurveTo(cpx, cpy, x, y)
    this.addDrawCommand?.({ type: 'quadraticCurveTo', cpx, cpy, x, y })
  }

  /**
   * Draw a cubic Bezier curve from the current point.
   * @param cp1x - X coordinate of the first control point
   * @param cp1y - Y coordinate of the first control point
   * @param cp2x - X coordinate of the second control point
   * @param cp2y - Y coordinate of the second control point
   * @param x - X coordinate of the end point
   * @param y - Y coordinate of the end point
   */
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ): void {
    this.ensurePath()
    this.currentPath.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
    this.addDrawCommand?.({ type: 'bezierCurveTo', cp1x, cp1y, cp2x, cp2y, x, y })
  }

  /**
   * Draw an ellipse on the current path.
   * @param x - X coordinate of the ellipse's center
   * @param y - Y coordinate of the ellipse's center
   * @param radiusX - Horizontal radius of the ellipse
   * @param radiusY - Vertical radius of the ellipse
   * @param rotation - Rotation of the ellipse in radians
   * @param startAngle - Start angle in radians
   * @param endAngle - End angle in radians
   * @param counterclockwise - Draw counterclockwise (default: false)
   */
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ): void {
    this.ensurePath()
    this.currentPath.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise)
    this.addDrawCommand?.({
      type: 'ellipse',
      x,
      y,
      radiusX,
      radiusY,
      rotation,
      startAngle,
      endAngle,
      counterclockwise,
    })
  }

  /**
   * Draw a rounded rectangle on the current path.
   * @param x - X coordinate of the rectangle's starting point
   * @param y - Y coordinate of the rectangle's starting point
   * @param width - Width of the rectangle
   * @param height - Height of the rectangle
   * @param radii - Corner radii (single value or array of 1-4 values)
   */
  roundRect(x: number, y: number, width: number, height: number, radii: number | number[]): void {
    this.ensurePath()
    this.currentPath.roundRect(x, y, width, height, radii)
    this.addDrawCommand?.({ type: 'roundRect', x, y, width, height, radii })
  }

  /**
   * Add a rectangle to the current path.
   * Unlike rect() which draws immediately, this adds to the path for later fill()/stroke().
   * @param x - X coordinate of the rectangle's starting point
   * @param y - Y coordinate of the rectangle's starting point
   * @param width - Width of the rectangle
   * @param height - Height of the rectangle
   */
  rectPath(x: number, y: number, width: number, height: number): void {
    this.ensurePath()
    this.currentPath.rect(x, y, width, height)
    this.addDrawCommand?.({ type: 'rectPath', x, y, width, height })
  }

  // ============================================================================
  // Path Rendering Methods
  // ============================================================================

  /**
   * Fill the current path with the current fill style.
   */
  fill(): void {
    this.addDrawCommand?.({ type: 'fill' })
  }

  /**
   * Stroke the current path with the current stroke style.
   */
  stroke(): void {
    this.addDrawCommand?.({ type: 'stroke' })
  }

  /**
   * Clip all future drawing to the current path.
   * Use with save()/restore() to manage clipping regions.
   * @param fillRule - Fill rule: "nonzero" (default) or "evenodd"
   */
  clip(fillRule?: FillRule): void {
    this.addDrawCommand?.({ type: 'clip', fillRule })
  }

  // ============================================================================
  // Path Access Methods
  // ============================================================================

  /**
   * Get the current path for hit testing.
   * Triggers lazy Path2D creation if needed.
   * @returns The current Path2D object
   */
  getCurrentPath(): Path2D {
    this.ensurePath()
    return this.currentPath
  }
}
