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
})
