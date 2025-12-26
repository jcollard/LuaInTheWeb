/**
 * Tests for CanvasController - Path2D tracking, hit testing, and pixel manipulation.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CanvasController } from '../src/CanvasController'
import { resetCapturedCallback, createTestController } from './CanvasController.path.setup'

describe('CanvasController Path API - Tracking and Testing', () => {
  let controller: CanvasController

  beforeEach(() => {
    resetCapturedCallback()
    const setup = createTestController()
    controller = setup.controller
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // Path2D Tracking for Hit Testing
  // ============================================================================

  describe('Path2D tracking', () => {
    it('should track path state for beginPath', () => {
      controller.beginPath()

      // After beginPath, current path should be reset
      const path = controller.getCurrentPath()
      expect(path).toBeDefined()
    })

    it('should track moveTo in path', () => {
      controller.beginPath()
      controller.moveTo(100, 150)

      const path = controller.getCurrentPath()
      expect(path).toBeDefined()
    })

    it('should track lineTo in path', () => {
      controller.beginPath()
      controller.moveTo(0, 0)
      controller.lineTo(100, 100)

      const path = controller.getCurrentPath()
      expect(path).toBeDefined()
    })

    it('should track closePath in path', () => {
      controller.beginPath()
      controller.moveTo(0, 0)
      controller.lineTo(100, 0)
      controller.lineTo(50, 100)
      controller.closePath()

      const path = controller.getCurrentPath()
      expect(path).toBeDefined()
    })

    it('should track arc in path', () => {
      controller.beginPath()
      controller.arc(100, 100, 50, 0, Math.PI * 2)

      const path = controller.getCurrentPath()
      expect(path).toBeDefined()
    })

    it('should track arcTo in path', () => {
      controller.beginPath()
      controller.moveTo(50, 50)
      controller.arcTo(100, 50, 100, 100, 20)

      const path = controller.getCurrentPath()
      expect(path).toBeDefined()
    })

    it('should track quadraticCurveTo in path', () => {
      controller.beginPath()
      controller.moveTo(0, 0)
      controller.quadraticCurveTo(50, 100, 100, 0)

      const path = controller.getCurrentPath()
      expect(path).toBeDefined()
    })

    it('should track bezierCurveTo in path', () => {
      controller.beginPath()
      controller.moveTo(0, 0)
      controller.bezierCurveTo(25, 100, 75, 100, 100, 0)

      const path = controller.getCurrentPath()
      expect(path).toBeDefined()
    })

    it('should track ellipse in path', () => {
      controller.beginPath()
      controller.ellipse(100, 100, 80, 40, 0, 0, Math.PI * 2)

      const path = controller.getCurrentPath()
      expect(path).toBeDefined()
    })

    it('should track roundRect in path', () => {
      controller.beginPath()
      controller.roundRect(50, 50, 200, 100, 15)

      const path = controller.getCurrentPath()
      expect(path).toBeDefined()
    })

    it('should reset path on beginPath', () => {
      controller.beginPath()
      controller.moveTo(0, 0)
      controller.lineTo(100, 100)

      const path1 = controller.getCurrentPath()

      controller.beginPath()
      const path2 = controller.getCurrentPath()

      // path2 should be a new Path2D, not the same as path1
      expect(path2).not.toBe(path1)
    })
  })

  // ============================================================================
  // Hit Testing Methods
  // ============================================================================

  describe('isPointInPath', () => {
    it('should return false when no renderer is available', () => {
      controller.beginPath()
      controller.moveTo(0, 0)
      controller.lineTo(100, 0)
      controller.lineTo(50, 100)
      controller.closePath()

      const result = controller.isPointInPath(50, 50)

      expect(result).toBe(false)
    })

    it('should accept fillRule parameter', () => {
      controller.beginPath()
      controller.arc(50, 50, 30, 0, Math.PI * 2)

      // Without renderer, should return false regardless of fillRule
      const result = controller.isPointInPath(50, 50, 'evenodd')

      expect(result).toBe(false)
    })
  })

  describe('isPointInStroke', () => {
    it('should return false when no renderer is available', () => {
      controller.beginPath()
      controller.moveTo(0, 0)
      controller.lineTo(100, 100)

      const result = controller.isPointInStroke(50, 50)

      expect(result).toBe(false)
    })
  })

  // ============================================================================
  // Pixel Manipulation Methods
  // ============================================================================

  describe('getImageData', () => {
    it('should return null when no renderer is available', () => {
      const result = controller.getImageData(0, 0, 100, 100)

      expect(result).toBeNull()
    })

    it('should accept x, y, width, height parameters', () => {
      // Without renderer, should return null regardless of parameters
      const result = controller.getImageData(10, 20, 50, 60)

      expect(result).toBeNull()
    })
  })

  describe('putImageData', () => {
    it('should not throw when no renderer is available', () => {
      const data = new Array(100 * 100 * 4).fill(0)

      expect(() => controller.putImageData(data, 100, 100, 0, 0)).not.toThrow()
    })

    it('should accept data, width, height, dx, dy parameters', () => {
      const data = [255, 0, 0, 255] // 1 red pixel

      expect(() => controller.putImageData(data, 1, 1, 50, 50)).not.toThrow()
    })
  })

  describe('createImageData', () => {
    it('should return array of zeros for width*height*4 elements', () => {
      const result = controller.createImageData(10, 10)

      expect(result).toHaveLength(10 * 10 * 4)
      expect(result.every(v => v === 0)).toBe(true)
    })

    it('should return empty array for zero dimensions', () => {
      const result = controller.createImageData(0, 0)

      expect(result).toHaveLength(0)
    })

    it('should create correct size for non-square dimensions', () => {
      const result = controller.createImageData(5, 3)

      expect(result).toHaveLength(5 * 3 * 4)
    })
  })
})
