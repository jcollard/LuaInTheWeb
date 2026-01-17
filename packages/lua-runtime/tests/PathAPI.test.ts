/* eslint-disable max-lines */
/**
 * Tests for PathAPI class - Facade for canvas path operations.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Path2D for jsdom environment (which doesn't have Path2D)
class MockPath2D {
  commands: unknown[] = []
  moveTo(x: number, y: number) { this.commands.push(['moveTo', x, y]) }
  lineTo(x: number, y: number) { this.commands.push(['lineTo', x, y]) }
  closePath() { this.commands.push(['closePath']) }
  arc(...args: unknown[]) { this.commands.push(['arc', ...args]) }
  arcTo(...args: unknown[]) { this.commands.push(['arcTo', ...args]) }
  ellipse(...args: unknown[]) { this.commands.push(['ellipse', ...args]) }
  rect(...args: unknown[]) { this.commands.push(['rect', ...args]) }
  roundRect(...args: unknown[]) { this.commands.push(['roundRect', ...args]) }
  quadraticCurveTo(...args: unknown[]) { this.commands.push(['quadraticCurveTo', ...args]) }
  bezierCurveTo(...args: unknown[]) { this.commands.push(['bezierCurveTo', ...args]) }
}

// Assign to global for tests
;(globalThis as unknown as { Path2D: typeof MockPath2D }).Path2D = MockPath2D

import { PathAPI } from '../src/PathAPI'
import type { DrawCommand } from '@lua-learning/canvas-runtime'

describe('PathAPI', () => {
  let pathAPI: PathAPI
  let mockAddDrawCommand: ReturnType<typeof vi.fn<[DrawCommand], void>>

  beforeEach(() => {
    pathAPI = new PathAPI()
    mockAddDrawCommand = vi.fn()
  })

  describe('construction', () => {
    it('should construct with no arguments', () => {
      expect(pathAPI).toBeDefined()
    })

    it('should start with a Path2D instance', () => {
      expect(pathAPI.getCurrentPath()).toBeInstanceOf(Path2D)
    })
  })

  describe('setAddDrawCommand', () => {
    it('should allow setting the draw command callback', () => {
      pathAPI.setAddDrawCommand(mockAddDrawCommand)
      pathAPI.fill()
      expect(mockAddDrawCommand).toHaveBeenCalled()
    })

    it('should allow setting callback to null', () => {
      pathAPI.setAddDrawCommand(mockAddDrawCommand)
      pathAPI.setAddDrawCommand(null)
      pathAPI.fill()
      expect(mockAddDrawCommand).not.toHaveBeenCalled()
    })

    it('should not throw when addDrawCommand is null', () => {
      expect(() => pathAPI.beginPath()).not.toThrow()
      expect(() => pathAPI.closePath()).not.toThrow()
      expect(() => pathAPI.moveTo(0, 0)).not.toThrow()
      expect(() => pathAPI.lineTo(10, 10)).not.toThrow()
      expect(() => pathAPI.fill()).not.toThrow()
      expect(() => pathAPI.stroke()).not.toThrow()
      expect(() => pathAPI.arc(0, 0, 10, 0, Math.PI)).not.toThrow()
      expect(() => pathAPI.arcTo(0, 0, 10, 10, 5)).not.toThrow()
      expect(() => pathAPI.quadraticCurveTo(10, 10, 20, 20)).not.toThrow()
      expect(() => pathAPI.bezierCurveTo(10, 10, 20, 20, 30, 30)).not.toThrow()
      expect(() => pathAPI.ellipse(50, 50, 30, 20, 0, 0, Math.PI * 2)).not.toThrow()
      expect(() => pathAPI.roundRect(0, 0, 100, 50, 5)).not.toThrow()
      expect(() => pathAPI.rectPath(0, 0, 100, 100)).not.toThrow()
      expect(() => pathAPI.clip()).not.toThrow()
    })
  })

  describe('path lifecycle methods', () => {
    beforeEach(() => {
      pathAPI.setAddDrawCommand(mockAddDrawCommand)
    })

    describe('beginPath', () => {
      it('should add beginPath command', () => {
        pathAPI.beginPath()
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'beginPath' })
      })

      it('should create a new Path2D instance', () => {
        const oldPath = pathAPI.getCurrentPath()
        pathAPI.beginPath()
        const newPath = pathAPI.getCurrentPath()
        expect(newPath).not.toBe(oldPath)
        expect(newPath).toBeInstanceOf(Path2D)
      })
    })

    describe('closePath', () => {
      it('should add closePath command', () => {
        pathAPI.closePath()
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'closePath' })
      })
    })
  })

  describe('path building methods', () => {
    beforeEach(() => {
      pathAPI.setAddDrawCommand(mockAddDrawCommand)
    })

    describe('moveTo', () => {
      it('should add moveTo command', () => {
        pathAPI.moveTo(10, 20)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'moveTo', x: 10, y: 20 })
      })

      it('should handle zero coordinates', () => {
        pathAPI.moveTo(0, 0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'moveTo', x: 0, y: 0 })
      })

      it('should handle negative coordinates', () => {
        pathAPI.moveTo(-10, -20)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'moveTo', x: -10, y: -20 })
      })
    })

    describe('lineTo', () => {
      it('should add lineTo command', () => {
        pathAPI.lineTo(30, 40)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'lineTo', x: 30, y: 40 })
      })

      it('should handle zero coordinates', () => {
        pathAPI.lineTo(0, 0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'lineTo', x: 0, y: 0 })
      })

      it('should handle negative coordinates', () => {
        pathAPI.lineTo(-30, -40)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'lineTo', x: -30, y: -40 })
      })
    })

    describe('arc', () => {
      it('should add arc command with all parameters', () => {
        pathAPI.arc(50, 50, 25, 0, Math.PI, false)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'arc',
          x: 50,
          y: 50,
          radius: 25,
          startAngle: 0,
          endAngle: Math.PI,
          counterclockwise: false,
        })
      })

      it('should add arc command with counterclockwise true', () => {
        pathAPI.arc(50, 50, 25, 0, Math.PI, true)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'arc',
          x: 50,
          y: 50,
          radius: 25,
          startAngle: 0,
          endAngle: Math.PI,
          counterclockwise: true,
        })
      })

      it('should add arc command with optional counterclockwise omitted', () => {
        pathAPI.arc(50, 50, 25, 0, Math.PI * 2)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'arc',
          x: 50,
          y: 50,
          radius: 25,
          startAngle: 0,
          endAngle: Math.PI * 2,
          counterclockwise: undefined,
        })
      })

      it('should handle full circle', () => {
        pathAPI.arc(100, 100, 50, 0, Math.PI * 2)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'arc',
          x: 100,
          y: 100,
          radius: 50,
          startAngle: 0,
          endAngle: Math.PI * 2,
          counterclockwise: undefined,
        })
      })
    })

    describe('arcTo', () => {
      it('should add arcTo command', () => {
        pathAPI.arcTo(10, 20, 30, 40, 15)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'arcTo',
          x1: 10,
          y1: 20,
          x2: 30,
          y2: 40,
          radius: 15,
        })
      })

      it('should handle zero radius', () => {
        pathAPI.arcTo(10, 20, 30, 40, 0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'arcTo',
          x1: 10,
          y1: 20,
          x2: 30,
          y2: 40,
          radius: 0,
        })
      })
    })

    describe('quadraticCurveTo', () => {
      it('should add quadraticCurveTo command', () => {
        pathAPI.quadraticCurveTo(100, 25, 200, 100)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'quadraticCurveTo',
          cpx: 100,
          cpy: 25,
          x: 200,
          y: 100,
        })
      })

      it('should handle negative values', () => {
        pathAPI.quadraticCurveTo(-10, -20, -30, -40)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'quadraticCurveTo',
          cpx: -10,
          cpy: -20,
          x: -30,
          y: -40,
        })
      })
    })

    describe('bezierCurveTo', () => {
      it('should add bezierCurveTo command', () => {
        pathAPI.bezierCurveTo(20, 100, 200, 100, 200, 20)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'bezierCurveTo',
          cp1x: 20,
          cp1y: 100,
          cp2x: 200,
          cp2y: 100,
          x: 200,
          y: 20,
        })
      })

      it('should handle zero values', () => {
        pathAPI.bezierCurveTo(0, 0, 0, 0, 0, 0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'bezierCurveTo',
          cp1x: 0,
          cp1y: 0,
          cp2x: 0,
          cp2y: 0,
          x: 0,
          y: 0,
        })
      })
    })

    describe('ellipse', () => {
      it('should add ellipse command with all parameters', () => {
        pathAPI.ellipse(100, 100, 50, 30, 0, 0, Math.PI * 2, false)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'ellipse',
          x: 100,
          y: 100,
          radiusX: 50,
          radiusY: 30,
          rotation: 0,
          startAngle: 0,
          endAngle: Math.PI * 2,
          counterclockwise: false,
        })
      })

      it('should add ellipse command with counterclockwise true', () => {
        pathAPI.ellipse(100, 100, 50, 30, Math.PI / 4, 0, Math.PI, true)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'ellipse',
          x: 100,
          y: 100,
          radiusX: 50,
          radiusY: 30,
          rotation: Math.PI / 4,
          startAngle: 0,
          endAngle: Math.PI,
          counterclockwise: true,
        })
      })

      it('should add ellipse command with optional counterclockwise omitted', () => {
        pathAPI.ellipse(100, 100, 50, 30, 0, 0, Math.PI * 2)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'ellipse',
          x: 100,
          y: 100,
          radiusX: 50,
          radiusY: 30,
          rotation: 0,
          startAngle: 0,
          endAngle: Math.PI * 2,
          counterclockwise: undefined,
        })
      })

      it('should handle rotated ellipse', () => {
        pathAPI.ellipse(50, 50, 40, 20, Math.PI / 2, 0, Math.PI * 2)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'ellipse',
          x: 50,
          y: 50,
          radiusX: 40,
          radiusY: 20,
          rotation: Math.PI / 2,
          startAngle: 0,
          endAngle: Math.PI * 2,
          counterclockwise: undefined,
        })
      })
    })

    describe('roundRect', () => {
      it('should add roundRect command with single radius value', () => {
        pathAPI.roundRect(10, 20, 100, 50, 5)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'roundRect',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          radii: 5,
        })
      })

      it('should add roundRect command with array of radii', () => {
        pathAPI.roundRect(10, 20, 100, 50, [5, 10, 15, 20])
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'roundRect',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          radii: [5, 10, 15, 20],
        })
      })

      it('should handle zero radii', () => {
        pathAPI.roundRect(0, 0, 100, 100, 0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'roundRect',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          radii: 0,
        })
      })

      it('should handle single radius in array', () => {
        pathAPI.roundRect(0, 0, 100, 100, [10])
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'roundRect',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          radii: [10],
        })
      })

      it('should handle two radii in array', () => {
        pathAPI.roundRect(0, 0, 100, 100, [10, 20])
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'roundRect',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          radii: [10, 20],
        })
      })

      it('should handle three radii in array', () => {
        pathAPI.roundRect(0, 0, 100, 100, [5, 10, 15])
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'roundRect',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          radii: [5, 10, 15],
        })
      })
    })

    describe('rectPath', () => {
      it('should add rectPath command', () => {
        pathAPI.rectPath(10, 20, 100, 50)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'rectPath',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
        })
      })

      it('should handle zero values', () => {
        pathAPI.rectPath(0, 0, 0, 0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'rectPath',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        })
      })

      it('should handle negative position', () => {
        pathAPI.rectPath(-50, -50, 100, 100)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'rectPath',
          x: -50,
          y: -50,
          width: 100,
          height: 100,
        })
      })
    })
  })

  describe('path rendering methods', () => {
    beforeEach(() => {
      pathAPI.setAddDrawCommand(mockAddDrawCommand)
    })

    describe('fill', () => {
      it('should add fill command', () => {
        pathAPI.fill()
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'fill' })
      })
    })

    describe('stroke', () => {
      it('should add stroke command', () => {
        pathAPI.stroke()
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'stroke' })
      })
    })

    describe('clip', () => {
      it('should add clip command without fillRule', () => {
        pathAPI.clip()
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'clip', fillRule: undefined })
      })

      it('should add clip command with nonzero fillRule', () => {
        pathAPI.clip('nonzero')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'clip', fillRule: 'nonzero' })
      })

      it('should add clip command with evenodd fillRule', () => {
        pathAPI.clip('evenodd')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'clip', fillRule: 'evenodd' })
      })
    })
  })

  describe('getCurrentPath', () => {
    it('should return a Path2D instance', () => {
      expect(pathAPI.getCurrentPath()).toBeInstanceOf(Path2D)
    })

    it('should return the same Path2D until beginPath is called', () => {
      const path1 = pathAPI.getCurrentPath()
      const path2 = pathAPI.getCurrentPath()
      expect(path1).toBe(path2)
    })

    it('should return a new Path2D after beginPath', () => {
      pathAPI.setAddDrawCommand(mockAddDrawCommand)
      const path1 = pathAPI.getCurrentPath()
      pathAPI.beginPath()
      const path2 = pathAPI.getCurrentPath()
      expect(path1).not.toBe(path2)
    })
  })

  describe('edge cases', () => {
    beforeEach(() => {
      pathAPI.setAddDrawCommand(mockAddDrawCommand)
    })

    it('should handle rapid consecutive calls', () => {
      pathAPI.moveTo(0, 0)
      pathAPI.lineTo(10, 10)
      pathAPI.lineTo(20, 20)
      pathAPI.lineTo(30, 30)
      expect(mockAddDrawCommand).toHaveBeenCalledTimes(4)
    })

    it('should handle complete path building sequence', () => {
      pathAPI.beginPath()
      pathAPI.moveTo(0, 0)
      pathAPI.lineTo(100, 0)
      pathAPI.lineTo(100, 100)
      pathAPI.closePath()
      pathAPI.fill()

      expect(mockAddDrawCommand).toHaveBeenCalledTimes(6)
      expect(mockAddDrawCommand.mock.calls[0][0].type).toBe('beginPath')
      expect(mockAddDrawCommand.mock.calls[1][0].type).toBe('moveTo')
      expect(mockAddDrawCommand.mock.calls[2][0].type).toBe('lineTo')
      expect(mockAddDrawCommand.mock.calls[3][0].type).toBe('lineTo')
      expect(mockAddDrawCommand.mock.calls[4][0].type).toBe('closePath')
      expect(mockAddDrawCommand.mock.calls[5][0].type).toBe('fill')
    })

    it('should maintain command order', () => {
      pathAPI.beginPath()
      pathAPI.arc(50, 50, 25, 0, Math.PI * 2)
      pathAPI.stroke()

      expect(mockAddDrawCommand).toHaveBeenCalledTimes(3)
      expect(mockAddDrawCommand.mock.calls[0][0].type).toBe('beginPath')
      expect(mockAddDrawCommand.mock.calls[1][0].type).toBe('arc')
      expect(mockAddDrawCommand.mock.calls[2][0].type).toBe('stroke')
    })

    it('should handle all methods being called with null callback', () => {
      const api = new PathAPI()
      // No callback set, all methods should be no-ops
      expect(() => {
        api.beginPath()
        api.closePath()
        api.moveTo(0, 0)
        api.lineTo(10, 10)
        api.fill()
        api.stroke()
        api.arc(0, 0, 10, 0, Math.PI)
        api.arcTo(0, 0, 10, 10, 5)
        api.quadraticCurveTo(10, 10, 20, 20)
        api.bezierCurveTo(10, 10, 20, 20, 30, 30)
        api.ellipse(50, 50, 30, 20, 0, 0, Math.PI * 2)
        api.roundRect(0, 0, 100, 50, 5)
        api.rectPath(0, 0, 100, 100)
        api.clip()
      }).not.toThrow()

      // getCurrentPath should still work
      expect(api.getCurrentPath()).toBeInstanceOf(Path2D)
    })
  })
})
