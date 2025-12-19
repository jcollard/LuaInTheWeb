/**
 * Tests for CanvasController class - Core functionality.
 * Tests canvas lifecycle management for shell-based canvas integration.
 * Asset-related tests are in CanvasController.assets.test.ts
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CanvasController, type CanvasCallbacks } from '../src/CanvasController'

// Global to capture the frame callback for testing
let capturedFrameCallback: ((timing: { deltaTime: number; totalTime: number; frameNumber: number }) => void) | null = null
let lastRenderFn: ReturnType<typeof vi.fn> | null = null

// Helper to get the captured frame callback
export function getCapturedFrameCallback() {
  return capturedFrameCallback
}

// Helper to get the last renderer's render function
export function getLastRenderFn() {
  return lastRenderFn
}

// Reset captured callback between tests
export function resetCapturedCallback() {
  capturedFrameCallback = null
  lastRenderFn = null
}

// Mock the canvas-runtime imports using classes
vi.mock('@lua-learning/canvas-runtime', () => {
  return {
    CanvasRenderer: class MockCanvasRenderer {
      render: ReturnType<typeof vi.fn>
      constructor() {
        this.render = vi.fn()
        lastRenderFn = this.render
      }
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
      constructor(callback: (timing: { deltaTime: number; totalTime: number; frameNumber: number }) => void) {
        capturedFrameCallback = callback
      }
    },
    ImageCache: class MockImageCache {
      set = vi.fn()
      get = vi.fn()
      has = vi.fn()
      clear = vi.fn()
    },
    AssetLoader: class MockAssetLoader {
      loadAsset = vi.fn().mockResolvedValue({
        name: 'test',
        data: new ArrayBuffer(8),
        width: 64,
        height: 64,
        mimeType: 'image/png',
      })
      resolvePath = vi.fn((path: string) => path.startsWith('/') ? path : `/test/${path}`)
    },
    VALID_IMAGE_EXTENSIONS: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'],
  }
})

describe('CanvasController', () => {
  let controller: CanvasController
  let mockCallbacks: CanvasCallbacks
  let mockCanvas: HTMLCanvasElement
  let originalImage: typeof Image

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

    // Mock the Image class to simulate immediate loading
    originalImage = global.Image
    global.Image = class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      src = ''

      constructor() {
        // Simulate async image load completion
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 0)
      }
    } as unknown as typeof Image
  })

  afterEach(() => {
    vi.clearAllMocks()
    global.Image = originalImage
    resetCapturedCallback()
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
    it('should add clear command to frame commands', () => {
      controller.clear()

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'clear' })
    })

    it('should add setColor command with RGB values', () => {
      controller.setColor(255, 0, 0)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'setColor', r: 255, g: 0, b: 0 })
    })

    it('should add setColor command with alpha value', () => {
      controller.setColor(0, 255, 0, 128)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'setColor', r: 0, g: 255, b: 0, a: 128 })
    })

    it('should add setLineWidth command', () => {
      controller.setLineWidth(2)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'setLineWidth', width: 2 })
    })

    it('should add setSize command', () => {
      controller.setSize(800, 600)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'setSize', width: 800, height: 600 })
    })

    it('should add rect command', () => {
      controller.drawRect(10, 20, 100, 50)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'rect', x: 10, y: 20, width: 100, height: 50 })
    })

    it('should add fillRect command', () => {
      controller.fillRect(10, 20, 100, 50)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'fillRect', x: 10, y: 20, width: 100, height: 50 })
    })

    it('should add circle command', () => {
      controller.drawCircle(50, 50, 25)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'circle', x: 50, y: 50, radius: 25 })
    })

    it('should add fillCircle command', () => {
      controller.fillCircle(50, 50, 25)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'fillCircle', x: 50, y: 50, radius: 25 })
    })

    it('should add line command', () => {
      controller.drawLine(0, 0, 100, 100)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'line', x1: 0, y1: 0, x2: 100, y2: 100 })
    })

    it('should add text command', () => {
      controller.drawText(10, 20, 'Hello')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'text', x: 10, y: 20, text: 'Hello' })
    })

    it('should accumulate multiple commands', () => {
      controller.clear()
      controller.setColor(255, 0, 0)
      controller.fillRect(10, 20, 100, 50)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(3)
      expect(commands[0].type).toBe('clear')
      expect(commands[1].type).toBe('setColor')
      expect(commands[2].type).toBe('fillRect')
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

  describe('canvas close handler registration', () => {
    it('should register close handler when starting', async () => {
      // Arrange
      const registerHandler = vi.fn()
      const unregisterHandler = vi.fn()
      const callbacksWithHandler: CanvasCallbacks = {
        ...mockCallbacks,
        registerCanvasCloseHandler: registerHandler,
        unregisterCanvasCloseHandler: unregisterHandler,
      }
      const controllerWithHandler = new CanvasController(callbacksWithHandler)
      const startPromise = controllerWithHandler.start()

      // Wait for start to process
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Assert - handler should be registered with the canvasId
      expect(registerHandler).toHaveBeenCalledWith('canvas-main', expect.any(Function))

      // Cleanup
      controllerWithHandler.stop()
      await startPromise
    })

    it('should unregister close handler when stopping', async () => {
      // Arrange
      const registerHandler = vi.fn()
      const unregisterHandler = vi.fn()
      const callbacksWithHandler: CanvasCallbacks = {
        ...mockCallbacks,
        registerCanvasCloseHandler: registerHandler,
        unregisterCanvasCloseHandler: unregisterHandler,
      }
      const controllerWithHandler = new CanvasController(callbacksWithHandler)
      const startPromise = controllerWithHandler.start()

      // Wait for start to process
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Act - stop the canvas
      controllerWithHandler.stop()
      await startPromise

      // Assert - handler should be unregistered
      expect(unregisterHandler).toHaveBeenCalledWith('canvas-main')
    })

    it('should stop when close handler is invoked by UI', async () => {
      // Arrange
      let registeredHandler: (() => void) | null = null
      const registerHandler = vi.fn((_id: string, handler: () => void) => {
        registeredHandler = handler
      })
      const callbacksWithHandler: CanvasCallbacks = {
        ...mockCallbacks,
        registerCanvasCloseHandler: registerHandler,
        unregisterCanvasCloseHandler: vi.fn(),
      }
      const controllerWithHandler = new CanvasController(callbacksWithHandler)
      const startPromise = controllerWithHandler.start()

      // Wait for start to process
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Act - simulate UI closing the tab by invoking the registered handler
      expect(registeredHandler).not.toBeNull()
      registeredHandler!()

      // Assert - controller should stop and Promise should resolve
      await expect(startPromise).resolves.toBeUndefined()
      expect(controllerWithHandler.isActive()).toBe(false)
    })

    it('should work without registerCanvasCloseHandler for backward compatibility', async () => {
      // Arrange - callbacks without the new handler methods
      const startPromise = controller.start()

      // Wait for start to process
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Assert - should work without errors
      expect(controller.isActive()).toBe(true)

      // Cleanup
      controller.stop()
      await startPromise
    })
  })

  describe('pre-start commands (issue #358)', () => {
    it('should process setSize command added before start()', async () => {
      // Arrange - Call setSize before start
      controller.setSize(800, 600)

      // Verify command is in frameCommands before start
      expect(controller.getFrameCommands()).toContainEqual({
        type: 'setSize',
        width: 800,
        height: 600,
      })

      const startPromise = controller.start()

      // Wait for start to initialize
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Assert - renderer should have received the setSize command during start()
      // (pre-start commands are processed in start() before the game loop begins)
      const renderFn = getLastRenderFn()
      expect(renderFn).not.toBeNull()
      expect(renderFn).toHaveBeenCalled()
      const renderCalls = renderFn!.mock.calls
      const firstRenderCommands = renderCalls[0]?.[0] ?? []
      expect(firstRenderCommands).toContainEqual({
        type: 'setSize',
        width: 800,
        height: 600,
      })

      // frameCommands should be cleared after processing
      expect(controller.getFrameCommands()).toHaveLength(0)

      // Cleanup
      controller.stop()
      await startPromise
    })

    it('should not call render if no pre-start commands exist', async () => {
      // Arrange - Don't add any commands before start

      const startPromise = controller.start()

      // Wait for start to initialize
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Assert - renderer should NOT have been called (no pre-start commands)
      const renderFn = getLastRenderFn()
      expect(renderFn).not.toBeNull()
      expect(renderFn).not.toHaveBeenCalled()

      // Cleanup
      controller.stop()
      await startPromise
    })
  })

})
