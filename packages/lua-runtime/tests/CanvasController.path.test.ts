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
  })
})
