/**
 * Tests for CanvasController class - Path API functionality.
 * Tests path drawing methods (beginPath, closePath, moveTo, lineTo, fill, stroke).
 * Core functionality tests are in CanvasController.test.ts
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CanvasController, type CanvasCallbacks } from '../src/CanvasController'

// Global to capture the frame callback for testing
let lastRenderFn: ReturnType<typeof vi.fn> | null = null

// Reset captured callback between tests
function resetCapturedCallback() {
  lastRenderFn = null
}

// Mock dependencies
vi.mock('@lua-learning/canvas-runtime', () => ({
  createCanvasRenderer: vi.fn(() => {
    lastRenderFn = vi.fn()
    return {
      render: lastRenderFn,
      dispose: vi.fn(),
    }
  }),
  createGameLoop: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
    isRunning: vi.fn(() => true),
  })),
  createInputCapture: vi.fn(() => ({
    getKeysDown: vi.fn(() => []),
    getKeysPressed: vi.fn(() => []),
    isKeyDown: vi.fn(() => false),
    isKeyPressed: vi.fn(() => false),
    getMouseX: vi.fn(() => 0),
    getMouseY: vi.fn(() => 0),
    isMouseButtonDown: vi.fn(() => false),
    isMouseButtonPressed: vi.fn(() => false),
    dispose: vi.fn(),
  })),
}))

describe('CanvasController Path API', () => {
  let controller: CanvasController
  let callbacks: CanvasCallbacks

  beforeEach(() => {
    resetCapturedCallback()

    // Create a mock canvas element
    const mockCanvas = document.createElement('canvas')
    mockCanvas.id = 'test-canvas'

    callbacks = {
      requestCanvasTab: vi.fn(() =>
        Promise.resolve({
          canvas: mockCanvas,
          closeTab: vi.fn(),
        })
      ),
      registerCanvasCloseHandler: vi.fn(),
      unregisterCanvasCloseHandler: vi.fn(),
    }

    controller = new CanvasController(callbacks)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('beginPath', () => {
    it('should add beginPath command', () => {
      controller.beginPath()

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'beginPath' })
    })
  })

  describe('closePath', () => {
    it('should add closePath command', () => {
      controller.closePath()

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'closePath' })
    })
  })

  describe('moveTo', () => {
    it('should add moveTo command', () => {
      controller.moveTo(100, 150)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'moveTo', x: 100, y: 150 })
    })

    it('should add moveTo command with zero coordinates', () => {
      controller.moveTo(0, 0)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'moveTo', x: 0, y: 0 })
    })

    it('should add moveTo command with negative coordinates', () => {
      controller.moveTo(-50, -75)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'moveTo', x: -50, y: -75 })
    })
  })

  describe('lineTo', () => {
    it('should add lineTo command', () => {
      controller.lineTo(200, 250)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'lineTo', x: 200, y: 250 })
    })

    it('should add lineTo command with zero coordinates', () => {
      controller.lineTo(0, 0)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'lineTo', x: 0, y: 0 })
    })

    it('should add lineTo command with negative coordinates', () => {
      controller.lineTo(-100, -200)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'lineTo', x: -100, y: -200 })
    })
  })

  describe('fill', () => {
    it('should add fill command', () => {
      controller.fill()

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'fill' })
    })
  })

  describe('stroke', () => {
    it('should add stroke command', () => {
      controller.stroke()

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'stroke' })
    })
  })

  describe('arc', () => {
    it('should add arc command with all parameters', () => {
      controller.arc(100, 100, 50, 0, Math.PI, true)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'arc',
        x: 100,
        y: 100,
        radius: 50,
        startAngle: 0,
        endAngle: Math.PI,
        counterclockwise: true,
      })
    })

    it('should add arc command without counterclockwise parameter', () => {
      controller.arc(200, 200, 75, Math.PI / 2, Math.PI * 2)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'arc',
        x: 200,
        y: 200,
        radius: 75,
        startAngle: Math.PI / 2,
        endAngle: Math.PI * 2,
        counterclockwise: undefined,
      })
    })

    it('should add arc command with counterclockwise false', () => {
      controller.arc(150, 150, 30, 0, Math.PI / 4, false)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'arc',
        x: 150,
        y: 150,
        radius: 30,
        startAngle: 0,
        endAngle: Math.PI / 4,
        counterclockwise: false,
      })
    })

    it('should add arc command with negative angles', () => {
      controller.arc(100, 100, 50, -Math.PI, 0)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'arc',
        x: 100,
        y: 100,
        radius: 50,
        startAngle: -Math.PI,
        endAngle: 0,
        counterclockwise: undefined,
      })
    })
  })

  describe('arcTo', () => {
    it('should add arcTo command', () => {
      controller.arcTo(100, 100, 100, 50, 20)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'arcTo',
        x1: 100,
        y1: 100,
        x2: 100,
        y2: 50,
        radius: 20,
      })
    })

    it('should add arcTo command with zero radius', () => {
      controller.arcTo(50, 50, 100, 50, 0)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'arcTo',
        x1: 50,
        y1: 50,
        x2: 100,
        y2: 50,
        radius: 0,
      })
    })

    it('should add arcTo command with negative coordinates', () => {
      controller.arcTo(-50, -50, -100, -50, 25)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'arcTo',
        x1: -50,
        y1: -50,
        x2: -100,
        y2: -50,
        radius: 25,
      })
    })
  })

  describe('quadraticCurveTo', () => {
    it('should add quadraticCurveTo command', () => {
      controller.quadraticCurveTo(100, 50, 200, 100)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'quadraticCurveTo',
        cpx: 100,
        cpy: 50,
        x: 200,
        y: 100,
      })
    })

    it('should add quadraticCurveTo command with zero coordinates', () => {
      controller.quadraticCurveTo(0, 0, 0, 0)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'quadraticCurveTo',
        cpx: 0,
        cpy: 0,
        x: 0,
        y: 0,
      })
    })

    it('should add quadraticCurveTo command with negative coordinates', () => {
      controller.quadraticCurveTo(-50, -100, -150, -200)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'quadraticCurveTo',
        cpx: -50,
        cpy: -100,
        x: -150,
        y: -200,
      })
    })
  })

  describe('bezierCurveTo', () => {
    it('should add bezierCurveTo command', () => {
      controller.bezierCurveTo(100, 50, 200, 150, 300, 100)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'bezierCurveTo',
        cp1x: 100,
        cp1y: 50,
        cp2x: 200,
        cp2y: 150,
        x: 300,
        y: 100,
      })
    })

    it('should add bezierCurveTo command with zero coordinates', () => {
      controller.bezierCurveTo(0, 0, 0, 0, 0, 0)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'bezierCurveTo',
        cp1x: 0,
        cp1y: 0,
        cp2x: 0,
        cp2y: 0,
        x: 0,
        y: 0,
      })
    })

    it('should add bezierCurveTo command with negative coordinates', () => {
      controller.bezierCurveTo(-50, -100, -150, -200, -250, -300)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'bezierCurveTo',
        cp1x: -50,
        cp1y: -100,
        cp2x: -150,
        cp2y: -200,
        x: -250,
        y: -300,
      })
    })
  })

  describe('path workflow', () => {
    it('should support complete triangle path workflow', () => {
      controller.beginPath()
      controller.moveTo(100, 100)
      controller.lineTo(150, 50)
      controller.lineTo(200, 100)
      controller.closePath()
      controller.fill()

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(6)
      expect(commands[0]).toEqual({ type: 'beginPath' })
      expect(commands[1]).toEqual({ type: 'moveTo', x: 100, y: 100 })
      expect(commands[2]).toEqual({ type: 'lineTo', x: 150, y: 50 })
      expect(commands[3]).toEqual({ type: 'lineTo', x: 200, y: 100 })
      expect(commands[4]).toEqual({ type: 'closePath' })
      expect(commands[5]).toEqual({ type: 'fill' })
    })

    it('should support stroke after path creation', () => {
      controller.beginPath()
      controller.moveTo(0, 0)
      controller.lineTo(100, 100)
      controller.stroke()

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(4)
      expect(commands[0]).toEqual({ type: 'beginPath' })
      expect(commands[1]).toEqual({ type: 'moveTo', x: 0, y: 0 })
      expect(commands[2]).toEqual({ type: 'lineTo', x: 100, y: 100 })
      expect(commands[3]).toEqual({ type: 'stroke' })
    })

    it('should support both fill and stroke on same path', () => {
      controller.beginPath()
      controller.moveTo(50, 50)
      controller.lineTo(100, 50)
      controller.lineTo(75, 100)
      controller.closePath()
      controller.fill()
      controller.stroke()

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(7)
      expect(commands[5]).toEqual({ type: 'fill' })
      expect(commands[6]).toEqual({ type: 'stroke' })
    })

    it('should support pie chart slice workflow with arc', () => {
      controller.beginPath()
      controller.moveTo(200, 200)
      controller.arc(200, 200, 100, 0, Math.PI / 2)
      controller.closePath()
      controller.fill()

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(5)
      expect(commands[0]).toEqual({ type: 'beginPath' })
      expect(commands[1]).toEqual({ type: 'moveTo', x: 200, y: 200 })
      expect(commands[2]).toEqual({
        type: 'arc',
        x: 200,
        y: 200,
        radius: 100,
        startAngle: 0,
        endAngle: Math.PI / 2,
        counterclockwise: undefined,
      })
      expect(commands[3]).toEqual({ type: 'closePath' })
      expect(commands[4]).toEqual({ type: 'fill' })
    })

    it('should support rounded corner workflow with arcTo', () => {
      controller.beginPath()
      controller.moveTo(50, 100)
      controller.arcTo(100, 100, 100, 50, 20)
      controller.stroke()

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(4)
      expect(commands[0]).toEqual({ type: 'beginPath' })
      expect(commands[1]).toEqual({ type: 'moveTo', x: 50, y: 100 })
      expect(commands[2]).toEqual({
        type: 'arcTo',
        x1: 100,
        y1: 100,
        x2: 100,
        y2: 50,
        radius: 20,
      })
      expect(commands[3]).toEqual({ type: 'stroke' })
    })
  })

  describe('ellipse', () => {
    it('should add ellipse command with all parameters', () => {
      controller.ellipse(200, 150, 100, 50, 0, 0, Math.PI * 2, false)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'ellipse',
        x: 200,
        y: 150,
        radiusX: 100,
        radiusY: 50,
        rotation: 0,
        startAngle: 0,
        endAngle: Math.PI * 2,
        counterclockwise: false,
      })
    })

    it('should add ellipse command without counterclockwise parameter', () => {
      controller.ellipse(100, 100, 80, 40, Math.PI / 4, 0, Math.PI)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'ellipse',
        x: 100,
        y: 100,
        radiusX: 80,
        radiusY: 40,
        rotation: Math.PI / 4,
        startAngle: 0,
        endAngle: Math.PI,
        counterclockwise: undefined,
      })
    })

    it('should add ellipse command with counterclockwise true', () => {
      controller.ellipse(150, 150, 60, 30, 0, 0, Math.PI / 2, true)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'ellipse',
        x: 150,
        y: 150,
        radiusX: 60,
        radiusY: 30,
        rotation: 0,
        startAngle: 0,
        endAngle: Math.PI / 2,
        counterclockwise: true,
      })
    })

    it('should add ellipse command with rotation', () => {
      controller.ellipse(200, 200, 100, 50, Math.PI / 6, 0, Math.PI * 2)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'ellipse',
        x: 200,
        y: 200,
        radiusX: 100,
        radiusY: 50,
        rotation: Math.PI / 6,
        startAngle: 0,
        endAngle: Math.PI * 2,
        counterclockwise: undefined,
      })
    })

    it('should add ellipse command with partial arc', () => {
      controller.ellipse(100, 100, 50, 25, 0, Math.PI / 4, Math.PI * 3 / 4)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'ellipse',
        x: 100,
        y: 100,
        radiusX: 50,
        radiusY: 25,
        rotation: 0,
        startAngle: Math.PI / 4,
        endAngle: Math.PI * 3 / 4,
        counterclockwise: undefined,
      })
    })
  })

  describe('roundRect', () => {
    it('should add roundRect command with single radius value', () => {
      controller.roundRect(50, 50, 200, 100, 15)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'roundRect',
        x: 50,
        y: 50,
        width: 200,
        height: 100,
        radii: 15,
      })
    })

    it('should add roundRect command with array of radii', () => {
      controller.roundRect(100, 100, 150, 80, [10, 20, 30, 40])

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'roundRect',
        x: 100,
        y: 100,
        width: 150,
        height: 80,
        radii: [10, 20, 30, 40],
      })
    })

    it('should add roundRect command with single-element radii array', () => {
      controller.roundRect(0, 0, 100, 50, [25])

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'roundRect',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        radii: [25],
      })
    })

    it('should add roundRect command with two-element radii array', () => {
      controller.roundRect(10, 20, 200, 100, [10, 20])

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'roundRect',
        x: 10,
        y: 20,
        width: 200,
        height: 100,
        radii: [10, 20],
      })
    })

    it('should add roundRect command with three-element radii array', () => {
      controller.roundRect(30, 40, 180, 90, [5, 10, 15])

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'roundRect',
        x: 30,
        y: 40,
        width: 180,
        height: 90,
        radii: [5, 10, 15],
      })
    })

    it('should add roundRect command with zero radius', () => {
      controller.roundRect(0, 0, 100, 100, 0)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'roundRect',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        radii: 0,
      })
    })
  })

  describe('clip', () => {
    it('should add clip command with no fill rule', () => {
      controller.clip()

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'clip',
        fillRule: undefined,
      })
    })

    it('should add clip command with nonzero fill rule', () => {
      controller.clip('nonzero')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'clip',
        fillRule: 'nonzero',
      })
    })

    it('should add clip command with evenodd fill rule', () => {
      controller.clip('evenodd')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'clip',
        fillRule: 'evenodd',
      })
    })
  })

  describe('setLineCap', () => {
    it('should add setLineCap command with butt', () => {
      controller.setLineCap('butt')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineCap',
        cap: 'butt',
      })
    })

    it('should add setLineCap command with round', () => {
      controller.setLineCap('round')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineCap',
        cap: 'round',
      })
    })

    it('should add setLineCap command with square', () => {
      controller.setLineCap('square')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineCap',
        cap: 'square',
      })
    })
  })

  describe('setLineJoin', () => {
    it('should add setLineJoin command with miter', () => {
      controller.setLineJoin('miter')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineJoin',
        join: 'miter',
      })
    })

    it('should add setLineJoin command with round', () => {
      controller.setLineJoin('round')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineJoin',
        join: 'round',
      })
    })

    it('should add setLineJoin command with bevel', () => {
      controller.setLineJoin('bevel')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineJoin',
        join: 'bevel',
      })
    })
  })

  describe('setMiterLimit', () => {
    it('should add setMiterLimit command', () => {
      controller.setMiterLimit(15)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setMiterLimit',
        limit: 15,
      })
    })

    it('should add setMiterLimit command with default value', () => {
      controller.setMiterLimit(10)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setMiterLimit',
        limit: 10,
      })
    })
  })

  describe('setLineDash', () => {
    it('should add setLineDash command with simple pattern', () => {
      controller.setLineDash([10, 5])

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineDash',
        segments: [10, 5],
      })
    })

    it('should add setLineDash command with complex pattern', () => {
      controller.setLineDash([15, 5, 5, 5])

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineDash',
        segments: [15, 5, 5, 5],
      })
    })

    it('should add setLineDash command with empty array for solid line', () => {
      controller.setLineDash([])

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineDash',
        segments: [],
      })
    })

    it('should store segments in internal state', () => {
      controller.setLineDash([10, 5])

      expect(controller.getLineDash()).toEqual([10, 5])
    })
  })

  describe('getLineDash', () => {
    it('should return empty array initially', () => {
      expect(controller.getLineDash()).toEqual([])
    })

    it('should return current dash pattern', () => {
      controller.setLineDash([10, 5])

      expect(controller.getLineDash()).toEqual([10, 5])
    })

    it('should return copy of internal array', () => {
      controller.setLineDash([10, 5])
      const result = controller.getLineDash()
      result.push(99)

      expect(controller.getLineDash()).toEqual([10, 5])
    })
  })

  describe('setLineDashOffset', () => {
    it('should add setLineDashOffset command', () => {
      controller.setLineDashOffset(5)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineDashOffset',
        offset: 5,
      })
    })

    it('should add setLineDashOffset command with zero', () => {
      controller.setLineDashOffset(0)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineDashOffset',
        offset: 0,
      })
    })

    it('should add setLineDashOffset command with negative value', () => {
      controller.setLineDashOffset(-10)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineDashOffset',
        offset: -10,
      })
    })
  })
})
