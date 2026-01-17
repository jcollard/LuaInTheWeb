/**
 * Path2DRegistry - Registry for reusable Path2D objects.
 *
 * This class manages the lifecycle of Path2D objects that can be created,
 * manipulated, and rendered from Lua. It provides:
 * - Path creation, cloning, and disposal
 * - Path building operations (moveTo, lineTo, arc, etc.)
 * - Rendering operations via callback (fillPath, strokePath, clipPath)
 * - Hit testing operations via renderer dependency
 */

import type { DrawCommand, FillRule } from '@lua-learning/canvas-runtime'

/**
 * Interface for the renderer methods used by Path2DRegistry.
 * This allows for easier testing and type flexibility.
 */
export interface IPath2DRenderer {
  isPointInPath(path: Path2D, x: number, y: number, fillRule?: FillRule): boolean
  isPointInStroke(path: Path2D, x: number, y: number): boolean
}

/**
 * Interface for Path2DRegistry public methods.
 */
export interface IPath2DRegistry {
  // Registry management
  createPath(svgPath?: string): { id: number }
  clonePath(pathId: number): { id: number } | null
  disposePath(pathId: number): void

  // Path building
  pathMoveTo(pathId: number, x: number, y: number): void
  pathLineTo(pathId: number, x: number, y: number): void
  pathClosePath(pathId: number): void
  pathRect(pathId: number, x: number, y: number, width: number, height: number): void
  pathRoundRect(pathId: number, x: number, y: number, width: number, height: number, radii: number | number[]): void
  pathArc(pathId: number, x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void
  pathArcTo(pathId: number, x1: number, y1: number, x2: number, y2: number, radius: number): void
  pathEllipse(pathId: number, x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void
  pathQuadraticCurveTo(pathId: number, cpx: number, cpy: number, x: number, y: number): void
  pathBezierCurveTo(pathId: number, cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void
  pathAddPath(pathId: number, sourcePathId: number): void

  // Rendering (via addDrawCommand callback)
  fillPath(pathId: number, fillRule?: FillRule): void
  strokePath(pathId: number): void
  clipPath(pathId: number, fillRule?: FillRule): void

  // Hit testing (requires renderer)
  isPointInStoredPath(pathId: number, x: number, y: number, fillRule?: FillRule): boolean
  isPointInStoredStroke(pathId: number, x: number, y: number): boolean
}

/**
 * Registry for managing reusable Path2D objects.
 * Provides null-safe access to path operations.
 */
export class Path2DRegistry implements IPath2DRegistry {
  private pathRegistry: Map<number, Path2D> = new Map()
  private nextPathId = 1
  private addDrawCommand: ((cmd: DrawCommand) => void) | null = null
  private renderer: IPath2DRenderer | null = null

  /**
   * Set the callback for adding draw commands.
   * Required for fillPath, strokePath, and clipPath operations.
   * @param fn - Callback to add a draw command, or null to disable
   */
  setAddDrawCommand(fn: ((cmd: DrawCommand) => void) | null): void {
    this.addDrawCommand = fn
  }

  /**
   * Set the renderer for hit testing operations.
   * Required for isPointInStoredPath and isPointInStoredStroke.
   * @param renderer - Renderer to use, or null to disable
   */
  setRenderer(renderer: IPath2DRenderer | null): void {
    this.renderer = renderer
  }

  /**
   * Get a path from the registry by ID (for internal/testing use).
   * @param pathId - ID of the path
   * @returns The Path2D or undefined if not found
   */
  getPath(pathId: number): Path2D | undefined {
    return this.pathRegistry.get(pathId)
  }

  /**
   * Check if a path exists in the registry.
   * @param pathId - ID of the path
   * @returns true if the path exists
   */
  hasPath(pathId: number): boolean {
    return this.pathRegistry.has(pathId)
  }

  // ============================================================================
  // Registry Management
  // ============================================================================

  /**
   * Create a new Path2D object, optionally from an SVG path string.
   * @param svgPath - Optional SVG path data string (e.g., "M10 10 L50 50 Z")
   * @returns Object with `id` for referencing the path
   */
  createPath(svgPath?: string): { id: number } {
    const path = svgPath ? new Path2D(svgPath) : new Path2D()
    const id = this.nextPathId++
    this.pathRegistry.set(id, path)
    return { id }
  }

  /**
   * Clone an existing Path2D object.
   * @param pathId - ID of the path to clone
   * @returns Object with `id` for the new path, or null if source not found
   */
  clonePath(pathId: number): { id: number } | null {
    const source = this.pathRegistry.get(pathId)
    if (!source) return null
    const cloned = new Path2D(source)
    const id = this.nextPathId++
    this.pathRegistry.set(id, cloned)
    return { id }
  }

  /**
   * Dispose a Path2D object to free memory.
   * @param pathId - ID of the path to dispose
   */
  disposePath(pathId: number): void {
    this.pathRegistry.delete(pathId)
  }

  // ============================================================================
  // Path Building Methods
  // ============================================================================

  /**
   * Move to a point on a stored path.
   * @param pathId - ID of the path
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  pathMoveTo(pathId: number, x: number, y: number): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.moveTo(x, y)
  }

  /**
   * Draw line to a point on a stored path.
   * @param pathId - ID of the path
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  pathLineTo(pathId: number, x: number, y: number): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.lineTo(x, y)
  }

  /**
   * Close a stored path.
   * @param pathId - ID of the path
   */
  pathClosePath(pathId: number): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.closePath()
  }

  /**
   * Add a rectangle to a stored path.
   * @param pathId - ID of the path
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param width - Rectangle width
   * @param height - Rectangle height
   */
  pathRect(pathId: number, x: number, y: number, width: number, height: number): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.rect(x, y, width, height)
  }

  /**
   * Add a rounded rectangle to a stored path.
   * @param pathId - ID of the path
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param width - Rectangle width
   * @param height - Rectangle height
   * @param radii - Corner radii (single value or array of 1-4 values)
   */
  pathRoundRect(pathId: number, x: number, y: number, width: number, height: number, radii: number | number[]): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.roundRect(x, y, width, height, radii)
  }

  /**
   * Add an arc to a stored path.
   * @param pathId - ID of the path
   * @param x - X coordinate of center
   * @param y - Y coordinate of center
   * @param radius - Arc radius
   * @param startAngle - Start angle in radians
   * @param endAngle - End angle in radians
   * @param counterclockwise - Draw counterclockwise (default: false)
   */
  pathArc(pathId: number, x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.arc(x, y, radius, startAngle, endAngle, counterclockwise)
  }

  /**
   * Add an arc to a stored path using control points.
   * @param pathId - ID of the path
   * @param x1 - X coordinate of first control point
   * @param y1 - Y coordinate of first control point
   * @param x2 - X coordinate of second control point
   * @param y2 - Y coordinate of second control point
   * @param radius - Arc radius
   */
  pathArcTo(pathId: number, x1: number, y1: number, x2: number, y2: number, radius: number): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.arcTo(x1, y1, x2, y2, radius)
  }

  /**
   * Add an ellipse to a stored path.
   * @param pathId - ID of the path
   * @param x - X coordinate of center
   * @param y - Y coordinate of center
   * @param radiusX - Horizontal radius
   * @param radiusY - Vertical radius
   * @param rotation - Rotation in radians
   * @param startAngle - Start angle in radians
   * @param endAngle - End angle in radians
   * @param counterclockwise - Draw counterclockwise (default: false)
   */
  pathEllipse(pathId: number, x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise)
  }

  /**
   * Add a quadratic curve to a stored path.
   * @param pathId - ID of the path
   * @param cpx - X coordinate of control point
   * @param cpy - Y coordinate of control point
   * @param x - X coordinate of end point
   * @param y - Y coordinate of end point
   */
  pathQuadraticCurveTo(pathId: number, cpx: number, cpy: number, x: number, y: number): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.quadraticCurveTo(cpx, cpy, x, y)
  }

  /**
   * Add a bezier curve to a stored path.
   * @param pathId - ID of the path
   * @param cp1x - X coordinate of first control point
   * @param cp1y - Y coordinate of first control point
   * @param cp2x - X coordinate of second control point
   * @param cp2y - Y coordinate of second control point
   * @param x - X coordinate of end point
   * @param y - Y coordinate of end point
   */
  pathBezierCurveTo(pathId: number, cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    const path = this.pathRegistry.get(pathId)
    if (path) path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
  }

  /**
   * Add another path to a stored path.
   * @param pathId - ID of the target path
   * @param sourcePathId - ID of the source path to add
   */
  pathAddPath(pathId: number, sourcePathId: number): void {
    const path = this.pathRegistry.get(pathId)
    const source = this.pathRegistry.get(sourcePathId)
    if (path && source) path.addPath(source)
  }

  // ============================================================================
  // Rendering Methods (via addDrawCommand callback)
  // ============================================================================

  /**
   * Fill a stored path.
   * Adds a command to the draw queue for proper rendering order.
   * @param pathId - ID of the path to fill
   * @param fillRule - Fill rule: 'nonzero' (default) or 'evenodd'
   */
  fillPath(pathId: number, fillRule?: FillRule): void {
    if (!this.pathRegistry.has(pathId)) return
    if (!this.addDrawCommand) return
    this.addDrawCommand({ type: 'fillPath', pathId, fillRule })
  }

  /**
   * Stroke a stored path.
   * Adds a command to the draw queue for proper rendering order.
   * @param pathId - ID of the path to stroke
   */
  strokePath(pathId: number): void {
    if (!this.pathRegistry.has(pathId)) return
    if (!this.addDrawCommand) return
    this.addDrawCommand({ type: 'strokePath', pathId })
  }

  /**
   * Clip to a stored path.
   * Adds a command to the draw queue for proper rendering order.
   * @param pathId - ID of the path to clip to
   * @param fillRule - Fill rule: 'nonzero' (default) or 'evenodd'
   */
  clipPath(pathId: number, fillRule?: FillRule): void {
    if (!this.pathRegistry.has(pathId)) return
    if (!this.addDrawCommand) return
    this.addDrawCommand({ type: 'clipPath', pathId, fillRule })
  }

  // ============================================================================
  // Hit Testing Methods (requires renderer)
  // ============================================================================

  /**
   * Check if a point is in a stored path.
   * @param pathId - ID of the path
   * @param x - X coordinate of point
   * @param y - Y coordinate of point
   * @param fillRule - Fill rule: 'nonzero' (default) or 'evenodd'
   * @returns true if point is in path, false otherwise or if path/renderer not available
   */
  isPointInStoredPath(pathId: number, x: number, y: number, fillRule?: FillRule): boolean {
    const path = this.pathRegistry.get(pathId)
    if (!path) return false
    return this.renderer?.isPointInPath(path, x, y, fillRule) ?? false
  }

  /**
   * Check if a point is in a stored path's stroke.
   * @param pathId - ID of the path
   * @param x - X coordinate of point
   * @param y - Y coordinate of point
   * @returns true if point is in stroke, false otherwise or if path/renderer not available
   */
  isPointInStoredStroke(pathId: number, x: number, y: number): boolean {
    const path = this.pathRegistry.get(pathId)
    if (!path) return false
    return this.renderer?.isPointInStroke(path, x, y) ?? false
  }
}
