/**
 * Tests for TransformAPI class - Facade for canvas transformation operations.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TransformAPI } from '../src/TransformAPI'
import type { DrawCommand } from '@lua-learning/canvas-runtime'

describe('TransformAPI', () => {
  let transformAPI: TransformAPI
  let mockAddDrawCommand: ReturnType<typeof vi.fn<[DrawCommand], void>>

  beforeEach(() => {
    transformAPI = new TransformAPI()
    mockAddDrawCommand = vi.fn()
  })

  describe('construction', () => {
    it('should construct with no arguments', () => {
      expect(transformAPI).toBeDefined()
    })
  })

  describe('setAddDrawCommand', () => {
    it('should allow setting the draw command callback', () => {
      transformAPI.setAddDrawCommand(mockAddDrawCommand)
      transformAPI.save()
      expect(mockAddDrawCommand).toHaveBeenCalled()
    })

    it('should allow setting callback to null', () => {
      transformAPI.setAddDrawCommand(mockAddDrawCommand)
      transformAPI.setAddDrawCommand(null)
      transformAPI.save()
      expect(mockAddDrawCommand).not.toHaveBeenCalled()
    })

    it('should not throw when addDrawCommand is null', () => {
      expect(() => transformAPI.save()).not.toThrow()
      expect(() => transformAPI.restore()).not.toThrow()
      expect(() => transformAPI.translate(10, 20)).not.toThrow()
      expect(() => transformAPI.rotate(Math.PI)).not.toThrow()
      expect(() => transformAPI.scale(2, 2)).not.toThrow()
      expect(() => transformAPI.transform(1, 0, 0, 1, 0, 0)).not.toThrow()
      expect(() => transformAPI.setTransform(1, 0, 0, 1, 0, 0)).not.toThrow()
      expect(() => transformAPI.resetTransform()).not.toThrow()
    })
  })

  describe('state management methods', () => {
    beforeEach(() => {
      transformAPI.setAddDrawCommand(mockAddDrawCommand)
    })

    describe('save', () => {
      it('should add save command', () => {
        transformAPI.save()
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'save' })
      })

      it('should call save multiple times', () => {
        transformAPI.save()
        transformAPI.save()
        expect(mockAddDrawCommand).toHaveBeenCalledTimes(2)
      })
    })

    describe('restore', () => {
      it('should add restore command', () => {
        transformAPI.restore()
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'restore' })
      })

      it('should call restore multiple times', () => {
        transformAPI.restore()
        transformAPI.restore()
        expect(mockAddDrawCommand).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('basic transformation methods', () => {
    beforeEach(() => {
      transformAPI.setAddDrawCommand(mockAddDrawCommand)
    })

    describe('translate', () => {
      it('should add translate command with dx and dy', () => {
        transformAPI.translate(10, 20)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'translate',
          dx: 10,
          dy: 20,
        })
      })

      it('should handle zero values', () => {
        transformAPI.translate(0, 0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'translate',
          dx: 0,
          dy: 0,
        })
      })

      it('should handle negative values', () => {
        transformAPI.translate(-50, -100)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'translate',
          dx: -50,
          dy: -100,
        })
      })

      it('should handle floating point values', () => {
        transformAPI.translate(10.5, 20.5)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'translate',
          dx: 10.5,
          dy: 20.5,
        })
      })
    })

    describe('rotate', () => {
      it('should add rotate command with angle', () => {
        transformAPI.rotate(Math.PI / 4)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'rotate',
          angle: Math.PI / 4,
        })
      })

      it('should handle zero angle', () => {
        transformAPI.rotate(0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'rotate',
          angle: 0,
        })
      })

      it('should handle negative angle', () => {
        transformAPI.rotate(-Math.PI / 2)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'rotate',
          angle: -Math.PI / 2,
        })
      })

      it('should handle full rotation', () => {
        transformAPI.rotate(2 * Math.PI)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'rotate',
          angle: 2 * Math.PI,
        })
      })
    })

    describe('scale', () => {
      it('should add scale command with sx and sy', () => {
        transformAPI.scale(2, 3)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'scale',
          sx: 2,
          sy: 3,
        })
      })

      it('should handle uniform scale', () => {
        transformAPI.scale(2, 2)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'scale',
          sx: 2,
          sy: 2,
        })
      })

      it('should handle scale factor of 1 (identity)', () => {
        transformAPI.scale(1, 1)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'scale',
          sx: 1,
          sy: 1,
        })
      })

      it('should handle scale factor of 0', () => {
        transformAPI.scale(0, 0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'scale',
          sx: 0,
          sy: 0,
        })
      })

      it('should handle negative scale (flip)', () => {
        transformAPI.scale(-1, -1)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'scale',
          sx: -1,
          sy: -1,
        })
      })

      it('should handle fractional scale', () => {
        transformAPI.scale(0.5, 0.25)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'scale',
          sx: 0.5,
          sy: 0.25,
        })
      })
    })
  })

  describe('matrix operation methods', () => {
    beforeEach(() => {
      transformAPI.setAddDrawCommand(mockAddDrawCommand)
    })

    describe('transform', () => {
      it('should add transform command with all matrix values', () => {
        transformAPI.transform(1, 2, 3, 4, 5, 6)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'transform',
          a: 1,
          b: 2,
          c: 3,
          d: 4,
          e: 5,
          f: 6,
        })
      })

      it('should handle identity matrix', () => {
        transformAPI.transform(1, 0, 0, 1, 0, 0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'transform',
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          e: 0,
          f: 0,
        })
      })

      it('should handle zero matrix', () => {
        transformAPI.transform(0, 0, 0, 0, 0, 0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'transform',
          a: 0,
          b: 0,
          c: 0,
          d: 0,
          e: 0,
          f: 0,
        })
      })

      it('should handle negative values', () => {
        transformAPI.transform(-1, -2, -3, -4, -5, -6)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'transform',
          a: -1,
          b: -2,
          c: -3,
          d: -4,
          e: -5,
          f: -6,
        })
      })

      it('should handle floating point values', () => {
        transformAPI.transform(1.5, 0.5, 0.5, 1.5, 10.5, 20.5)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'transform',
          a: 1.5,
          b: 0.5,
          c: 0.5,
          d: 1.5,
          e: 10.5,
          f: 20.5,
        })
      })
    })

    describe('setTransform', () => {
      it('should add setTransform command with all matrix values', () => {
        transformAPI.setTransform(1, 2, 3, 4, 5, 6)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'setTransform',
          a: 1,
          b: 2,
          c: 3,
          d: 4,
          e: 5,
          f: 6,
        })
      })

      it('should handle identity matrix', () => {
        transformAPI.setTransform(1, 0, 0, 1, 0, 0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'setTransform',
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          e: 0,
          f: 0,
        })
      })

      it('should handle zero matrix', () => {
        transformAPI.setTransform(0, 0, 0, 0, 0, 0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'setTransform',
          a: 0,
          b: 0,
          c: 0,
          d: 0,
          e: 0,
          f: 0,
        })
      })

      it('should handle negative values', () => {
        transformAPI.setTransform(-1, -2, -3, -4, -5, -6)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'setTransform',
          a: -1,
          b: -2,
          c: -3,
          d: -4,
          e: -5,
          f: -6,
        })
      })

      it('should handle floating point values', () => {
        transformAPI.setTransform(1.5, 0.5, 0.5, 1.5, 10.5, 20.5)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'setTransform',
          a: 1.5,
          b: 0.5,
          c: 0.5,
          d: 1.5,
          e: 10.5,
          f: 20.5,
        })
      })
    })

    describe('resetTransform', () => {
      it('should add resetTransform command', () => {
        transformAPI.resetTransform()
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'resetTransform' })
      })

      it('should call resetTransform multiple times', () => {
        transformAPI.resetTransform()
        transformAPI.resetTransform()
        expect(mockAddDrawCommand).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('edge cases', () => {
    beforeEach(() => {
      transformAPI.setAddDrawCommand(mockAddDrawCommand)
    })

    it('should handle rapid consecutive calls', () => {
      transformAPI.save()
      transformAPI.translate(10, 20)
      transformAPI.rotate(Math.PI / 4)
      transformAPI.scale(2, 2)
      transformAPI.restore()
      expect(mockAddDrawCommand).toHaveBeenCalledTimes(5)
    })

    it('should maintain command order', () => {
      transformAPI.save()
      transformAPI.translate(100, 100)
      transformAPI.rotate(Math.PI)
      transformAPI.scale(0.5, 0.5)
      transformAPI.restore()

      expect(mockAddDrawCommand).toHaveBeenCalledTimes(5)
      expect(mockAddDrawCommand.mock.calls[0][0].type).toBe('save')
      expect(mockAddDrawCommand.mock.calls[1][0].type).toBe('translate')
      expect(mockAddDrawCommand.mock.calls[2][0].type).toBe('rotate')
      expect(mockAddDrawCommand.mock.calls[3][0].type).toBe('scale')
      expect(mockAddDrawCommand.mock.calls[4][0].type).toBe('restore')
    })

    it('should handle all methods being called with null callback', () => {
      const api = new TransformAPI()
      // No callback set, all methods should be no-ops
      expect(() => {
        api.save()
        api.restore()
        api.translate(10, 20)
        api.rotate(Math.PI)
        api.scale(2, 2)
        api.transform(1, 0, 0, 1, 0, 0)
        api.setTransform(1, 0, 0, 1, 0, 0)
        api.resetTransform()
      }).not.toThrow()
    })

    it('should handle switching callback to null mid-operation', () => {
      transformAPI.save()
      expect(mockAddDrawCommand).toHaveBeenCalledTimes(1)

      transformAPI.setAddDrawCommand(null)
      transformAPI.translate(10, 20)
      expect(mockAddDrawCommand).toHaveBeenCalledTimes(1) // Still 1, no new calls
    })

    it('should handle nested save/restore', () => {
      transformAPI.save()
      transformAPI.translate(10, 20)
      transformAPI.save()
      transformAPI.rotate(Math.PI / 2)
      transformAPI.restore()
      transformAPI.restore()

      expect(mockAddDrawCommand).toHaveBeenCalledTimes(6)
      expect(mockAddDrawCommand.mock.calls[0][0].type).toBe('save')
      expect(mockAddDrawCommand.mock.calls[1][0].type).toBe('translate')
      expect(mockAddDrawCommand.mock.calls[2][0].type).toBe('save')
      expect(mockAddDrawCommand.mock.calls[3][0].type).toBe('rotate')
      expect(mockAddDrawCommand.mock.calls[4][0].type).toBe('restore')
      expect(mockAddDrawCommand.mock.calls[5][0].type).toBe('restore')
    })

    it('should handle combined transformations', () => {
      // Simulate a typical transformation workflow
      transformAPI.save()
      transformAPI.translate(100, 100)
      transformAPI.rotate(Math.PI / 4)
      transformAPI.scale(2, 2)
      transformAPI.translate(-50, -50)
      transformAPI.restore()

      expect(mockAddDrawCommand).toHaveBeenCalledTimes(6)
    })

    it('should handle large values', () => {
      transformAPI.translate(1000000, 1000000)
      expect(mockAddDrawCommand).toHaveBeenCalledWith({
        type: 'translate',
        dx: 1000000,
        dy: 1000000,
      })
    })

    it('should handle very small values', () => {
      transformAPI.scale(0.0001, 0.0001)
      expect(mockAddDrawCommand).toHaveBeenCalledWith({
        type: 'scale',
        sx: 0.0001,
        sy: 0.0001,
      })
    })
  })
})
