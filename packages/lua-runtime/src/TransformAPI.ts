/**
 * TransformAPI - Facade for canvas transformation operations.
 *
 * This class manages transformation-related canvas operations including:
 * - Translation (translate)
 * - Rotation (rotate)
 * - Scaling (scale)
 * - State save/restore (save, restore)
 * - Matrix operations (transform, setTransform, resetTransform)
 *
 * It uses callback dependency injection for addDrawCommand() to integrate
 * with the CanvasController's command queue.
 */

import type { DrawCommand } from '@lua-learning/canvas-runtime'

/**
 * Interface for TransformAPI public methods.
 */
export interface ITransformAPI {
  // State management
  save(): void
  restore(): void

  // Basic transformations
  translate(dx: number, dy: number): void
  rotate(angle: number): void
  scale(sx: number, sy: number): void

  // Matrix operations
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void
  resetTransform(): void
}

/**
 * Facade for canvas transformation operations.
 * Provides null-safe access to transformation operations via callback dependency injection.
 */
export class TransformAPI implements ITransformAPI {
  private addDrawCommand: ((cmd: DrawCommand) => void) | null = null

  /**
   * Set the callback for adding draw commands.
   * Required for all transformation operations to take effect.
   * @param fn - Callback to add a draw command, or null to disable
   */
  setAddDrawCommand(fn: ((cmd: DrawCommand) => void) | null): void {
    this.addDrawCommand = fn
  }

  // ============================================================================
  // State Management Methods
  // ============================================================================

  /**
   * Save the current transformation state to the stack.
   */
  save(): void {
    this.addDrawCommand?.({ type: 'save' })
  }

  /**
   * Restore the most recently saved transformation state.
   */
  restore(): void {
    this.addDrawCommand?.({ type: 'restore' })
  }

  // ============================================================================
  // Basic Transformation Methods
  // ============================================================================

  /**
   * Translate (move) the canvas origin.
   * @param dx - Horizontal translation distance
   * @param dy - Vertical translation distance
   */
  translate(dx: number, dy: number): void {
    this.addDrawCommand?.({ type: 'translate', dx, dy })
  }

  /**
   * Rotate the canvas around the current origin.
   * @param angle - Rotation angle in radians
   */
  rotate(angle: number): void {
    this.addDrawCommand?.({ type: 'rotate', angle })
  }

  /**
   * Scale the canvas from the current origin.
   * @param sx - Horizontal scale factor
   * @param sy - Vertical scale factor
   */
  scale(sx: number, sy: number): void {
    this.addDrawCommand?.({ type: 'scale', sx, sy })
  }

  // ============================================================================
  // Matrix Operation Methods
  // ============================================================================

  /**
   * Multiply the current transformation matrix by the specified matrix.
   * @param a - Horizontal scaling
   * @param b - Horizontal skewing
   * @param c - Vertical skewing
   * @param d - Vertical scaling
   * @param e - Horizontal translation
   * @param f - Vertical translation
   */
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.addDrawCommand?.({ type: 'transform', a, b, c, d, e, f })
  }

  /**
   * Reset to identity matrix, then apply the specified transformation matrix.
   * @param a - Horizontal scaling
   * @param b - Horizontal skewing
   * @param c - Vertical skewing
   * @param d - Vertical scaling
   * @param e - Horizontal translation
   * @param f - Vertical translation
   */
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.addDrawCommand?.({ type: 'setTransform', a, b, c, d, e, f })
  }

  /**
   * Reset the transformation matrix to identity.
   */
  resetTransform(): void {
    this.addDrawCommand?.({ type: 'resetTransform' })
  }
}
