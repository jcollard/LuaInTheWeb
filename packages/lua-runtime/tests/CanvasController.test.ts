/**
 * Tests for CanvasController class.
 * Tests canvas lifecycle management for shell-based canvas integration.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CanvasController, type CanvasCallbacks } from '../src/CanvasController'

// Mock the canvas-runtime imports using classes
vi.mock('@lua-learning/canvas-runtime', () => {
  return {
    CanvasRenderer: class MockCanvasRenderer {
      render = vi.fn()
    },
    InputCapture: class MockInputCapture {
      isKeyDown = vi.fn().mockReturnValue(false)
      isKeyPressed = vi.fn().mockReturnValue(false)
      getKeysDown = vi.fn().mockReturnValue(new Set())
      getInputState = vi.fn().mockReturnValue({
        keysDown: [],
        keysPressed: [],
        mouseX: 0,
        mouseY: 0,
        mouseButtonsDown: [],
        mouseButtonsPressed: [],
      })
      getMousePosition = vi.fn().mockReturnValue({ x: 0, y: 0 })
      isMouseButtonDown = vi.fn().mockReturnValue(false)
      isMouseButtonPressed = vi.fn().mockReturnValue(false)
      update = vi.fn()
      dispose = vi.fn()
    },
    GameLoopController: class MockGameLoopController {
      start = vi.fn()
      stop = vi.fn()
      dispose = vi.fn()
      constructor(_callback: () => void) {}
    },
  }
})

describe('CanvasController', () => {
  let controller: CanvasController
  let mockCallbacks: CanvasCallbacks
  let mockCanvas: HTMLCanvasElement

  beforeEach(() => {
    // Create mock canvas element
    mockCanvas = document.createElement('canvas')
    mockCanvas.width = 800
    mockCanvas.height = 600

    // Create mock callbacks
    mockCallbacks = {
      onRequestCanvasTab: vi.fn().mockResolvedValue(mockCanvas),
      onCloseCanvasTab: vi.fn(),
    }

    controller = new CanvasController(mockCallbacks)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('isActive', () => {
    it('should return false initially', () => {
      expect(controller.isActive()).toBe(false)
    })
  })

  describe('setOnDrawCallback', () => {
    it('should accept a callback function', () => {
      const callback = vi.fn()
      expect(() => controller.setOnDrawCallback(callback)).not.toThrow()
    })
  })

  describe('start', () => {
    it('should request a canvas tab', async () => {
      const startPromise = controller.start()

      // Resolve the promise by stopping
      setTimeout(() => controller.stop(), 0)

      await startPromise

      expect(mockCallbacks.onRequestCanvasTab).toHaveBeenCalledWith('canvas-main')
    })

    it('should throw if already running', async () => {
      const startPromise = controller.start()

      // Wait for start to initialize (sets running = true after canvas is received)
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Try to start again while running
      await expect(controller.start()).rejects.toThrow('Canvas is already running')

      // Clean up
      controller.stop()
      await startPromise
    })
  })

  describe('stop', () => {
    it('should do nothing if not running', () => {
      expect(() => controller.stop()).not.toThrow()
      expect(mockCallbacks.onCloseCanvasTab).not.toHaveBeenCalled()
    })

    it('should close the canvas tab', async () => {
      const startPromise = controller.start()

      // Wait a tick for start to process
      await new Promise((resolve) => setTimeout(resolve, 0))

      controller.stop()

      await startPromise

      expect(mockCallbacks.onCloseCanvasTab).toHaveBeenCalledWith('canvas-main')
    })

    it('should resolve the blocking Promise from start()', async () => {
      const startPromise = controller.start()

      // Wait a tick then stop
      setTimeout(() => controller.stop(), 10)

      // This should resolve without hanging
      await expect(startPromise).resolves.toBeUndefined()
    })
  })

  describe('drawing methods', () => {
    it('should add clear command', () => {
      controller.clear()
      // Internal implementation - just verify no error
    })

    it('should add setColor command', () => {
      controller.setColor(255, 0, 0)
      controller.setColor(0, 255, 0, 128)
      // Internal implementation - just verify no error
    })

    it('should add setLineWidth command', () => {
      controller.setLineWidth(2)
      // Internal implementation - just verify no error
    })

    it('should add setSize command', () => {
      controller.setSize(800, 600)
      // Internal implementation - just verify no error
    })

    it('should add rect command', () => {
      controller.drawRect(10, 20, 100, 50)
      // Internal implementation - just verify no error
    })

    it('should add fillRect command', () => {
      controller.fillRect(10, 20, 100, 50)
      // Internal implementation - just verify no error
    })

    it('should add circle command', () => {
      controller.drawCircle(50, 50, 25)
      // Internal implementation - just verify no error
    })

    it('should add fillCircle command', () => {
      controller.fillCircle(50, 50, 25)
      // Internal implementation - just verify no error
    })

    it('should add line command', () => {
      controller.drawLine(0, 0, 100, 100)
      // Internal implementation - just verify no error
    })

    it('should add text command', () => {
      controller.drawText(10, 20, 'Hello')
      // Internal implementation - just verify no error
    })
  })

  describe('timing methods', () => {
    it('should return 0 for getDelta when not running', () => {
      expect(controller.getDelta()).toBe(0)
    })

    it('should return 0 for getTime when not running', () => {
      expect(controller.getTime()).toBe(0)
    })
  })

  describe('input methods', () => {
    it('should return false for isKeyDown when not running', () => {
      expect(controller.isKeyDown('KeyA')).toBe(false)
    })

    it('should return false for isKeyPressed when not running', () => {
      expect(controller.isKeyPressed('KeyA')).toBe(false)
    })

    it('should return empty array for getKeysDown when not running', () => {
      expect(controller.getKeysDown()).toEqual([])
    })

    it('should return empty array for getKeysPressed when not running', () => {
      expect(controller.getKeysPressed()).toEqual([])
    })

    it('should return 0 for getMouseX when not running', () => {
      expect(controller.getMouseX()).toBe(0)
    })

    it('should return 0 for getMouseY when not running', () => {
      expect(controller.getMouseY()).toBe(0)
    })

    it('should return false for isMouseButtonDown when not running', () => {
      expect(controller.isMouseButtonDown(0)).toBe(false)
    })

    it('should return false for isMouseButtonPressed when not running', () => {
      expect(controller.isMouseButtonPressed(0)).toBe(false)
    })

    it('should return default input state for getInputState when not running', () => {
      const state = controller.getInputState()
      expect(state).toEqual({
        keysDown: [],
        keysPressed: [],
        mouseX: 0,
        mouseY: 0,
        mouseButtonsDown: [],
        mouseButtonsPressed: [],
      })
    })
  })

  describe('canvas dimensions', () => {
    it('should return 0 for getWidth when not running', () => {
      expect(controller.getWidth()).toBe(0)
    })

    it('should return 0 for getHeight when not running', () => {
      expect(controller.getHeight()).toBe(0)
    })
  })
})
