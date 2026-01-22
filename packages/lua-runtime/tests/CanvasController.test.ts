/* eslint-disable max-lines */
/**
 * Tests for CanvasController class - Core functionality.
 * Tests canvas lifecycle management for shell-based canvas integration.
 * Asset-related tests are in CanvasController.assets.test.ts
 * Path API tests are in CanvasController.path.test.ts
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CanvasController, type CanvasCallbacks } from '../src/CanvasController'

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
(globalThis as unknown as { Path2D: typeof MockPath2D }).Path2D = MockPath2D

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
    createEmptyInputState: () => ({
      keysDown: [],
      keysPressed: [],
      mouseX: 0,
      mouseY: 0,
      mouseButtonsDown: [],
      mouseButtonsPressed: [],
      gamepads: [
        { connected: false, id: '', buttons: new Array(17).fill(0), buttonsPressed: [], axes: new Array(4).fill(0) },
        { connected: false, id: '', buttons: new Array(17).fill(0), buttonsPressed: [], axes: new Array(4).fill(0) },
        { connected: false, id: '', buttons: new Array(17).fill(0), buttonsPressed: [], axes: new Array(4).fill(0) },
        { connected: false, id: '', buttons: new Array(17).fill(0), buttonsPressed: [], axes: new Array(4).fill(0) },
      ],
    }),
    CanvasRenderer: class MockCanvasRenderer {
      render: ReturnType<typeof vi.fn>
      fillPath: ReturnType<typeof vi.fn>
      strokePath: ReturnType<typeof vi.fn>
      clipPath: ReturnType<typeof vi.fn>
      constructor() {
        this.render = vi.fn()
        this.fillPath = vi.fn()
        this.strokePath = vi.fn()
        this.clipPath = vi.fn()
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
        gamepads: [
          { connected: false, id: '', buttons: new Array(17).fill(0), buttonsPressed: [], axes: new Array(4).fill(0) },
          { connected: false, id: '', buttons: new Array(17).fill(0), buttonsPressed: [], axes: new Array(4).fill(0) },
          { connected: false, id: '', buttons: new Array(17).fill(0), buttonsPressed: [], axes: new Array(4).fill(0) },
          { connected: false, id: '', buttons: new Array(17).fill(0), buttonsPressed: [], axes: new Array(4).fill(0) },
        ],
      })
      getMousePosition = vi.fn().mockReturnValue({ x: 0, y: 0 })
      isMouseButtonDown = vi.fn().mockReturnValue(false)
      isMouseButtonPressed = vi.fn().mockReturnValue(false)
      getConnectedGamepadCount = vi.fn().mockReturnValue(0)
      pollGamepads = vi.fn()
      update = vi.fn()
      dispose = vi.fn()
    },
    GameLoopController: class MockGameLoopController {
      start = vi.fn()
      stop = vi.fn()
      dispose = vi.fn()
      isPaused = vi.fn().mockReturnValue(false)
      pause = vi.fn()
      resume = vi.fn()
      step = vi.fn()
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

  // Drawing methods tests moved to CanvasController.drawing.test.ts
  // Transformation methods tests moved to CanvasController.transforms.test.ts

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
        gamepads: [
          { connected: false, id: '', buttons: new Array(17).fill(0), buttonsPressed: [], axes: new Array(4).fill(0) },
          { connected: false, id: '', buttons: new Array(17).fill(0), buttonsPressed: [], axes: new Array(4).fill(0) },
          { connected: false, id: '', buttons: new Array(17).fill(0), buttonsPressed: [], axes: new Array(4).fill(0) },
          { connected: false, id: '', buttons: new Array(17).fill(0), buttonsPressed: [], axes: new Array(4).fill(0) },
        ],
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
      // Note: We can't check the contents of the render call because the array
      // is cleared in-place after render() returns (GC optimization).
      // The renderer processes commands synchronously, so this is fine in production.

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

  describe('Path2D rendering', () => {
    it('should render regular commands only without Path2D (fast path)', async () => {
      // Arrange - set up onDraw to add only regular commands
      const onDrawCallback = vi.fn(() => {
        controller.clear()
        controller.fillRect(0, 0, 100, 100)
        controller.drawCircle(50, 50, 25)
      })
      controller.setOnDrawCallback(onDrawCallback)

      const startPromise = controller.start()
      await new Promise((resolve) => setTimeout(resolve, 0))

      const renderFn = getLastRenderFn()
      expect(renderFn).not.toBeNull()
      renderFn!.mockClear()

      // Act - Simulate a frame
      const frameCallback = getCapturedFrameCallback()
      expect(frameCallback).not.toBeNull()
      frameCallback!({ deltaTime: 0.016, totalTime: 0.016, frameNumber: 1 })

      // Assert - render should be called once with all commands (fast path)
      expect(renderFn).toHaveBeenCalledTimes(1)
      expect(onDrawCallback).toHaveBeenCalled()

      // Cleanup
      controller.stop()
      await startPromise
    })

    it('should handle mixed regular and Path2D commands', async () => {
      // Arrange - set up onDraw to add both regular and Path2D commands
      const onDrawCallback = vi.fn(() => {
        // Add some regular commands first
        controller.clear()
        controller.fillRect(0, 0, 100, 100)
        // Create and fill a Path2D
        const path = controller.createPath()
        controller.pathRect(path.id, 10, 10, 50, 50)
        controller.fillPath(path.id)
        // Add more regular commands after
        controller.drawCircle(50, 50, 25)
      })
      controller.setOnDrawCallback(onDrawCallback)

      const startPromise = controller.start()
      await new Promise((resolve) => setTimeout(resolve, 0))

      const renderFn = getLastRenderFn()
      expect(renderFn).not.toBeNull()
      renderFn!.mockClear()

      // Act - Simulate a frame
      const frameCallback = getCapturedFrameCallback()
      expect(frameCallback).not.toBeNull()
      frameCallback!({ deltaTime: 0.016, totalTime: 0.016, frameNumber: 1 })

      // Assert - onDraw callback was called
      expect(onDrawCallback).toHaveBeenCalled()
      // render() should be called multiple times (for batched regular commands)
      expect(renderFn!.mock.calls.length).toBeGreaterThanOrEqual(1)

      // Cleanup
      controller.stop()
      await startPromise
    })

    it('should handle multiple Path2D commands in sequence', async () => {
      // Arrange - set up onDraw with multiple Path2D commands
      const onDrawCallback = vi.fn(() => {
        controller.clear()
        // Create multiple paths
        const path1 = controller.createPath()
        controller.pathRect(path1.id, 0, 0, 50, 50)
        const path2 = controller.createPath()
        controller.pathRect(path2.id, 60, 0, 50, 50)
        // Fill both paths
        controller.fillPath(path1.id)
        controller.strokePath(path2.id)
        // Add clip path
        const clipPath = controller.createPath()
        controller.pathRect(clipPath.id, 10, 10, 100, 100)
        controller.clipPath(clipPath.id)
      })
      controller.setOnDrawCallback(onDrawCallback)

      const startPromise = controller.start()
      await new Promise((resolve) => setTimeout(resolve, 0))

      const renderFn = getLastRenderFn()
      expect(renderFn).not.toBeNull()
      renderFn!.mockClear()

      // Act - Simulate a frame
      const frameCallback = getCapturedFrameCallback()
      expect(frameCallback).not.toBeNull()
      frameCallback!({ deltaTime: 0.016, totalTime: 0.016, frameNumber: 1 })

      // Assert - callback was invoked
      expect(onDrawCallback).toHaveBeenCalled()

      // Cleanup
      controller.stop()
      await startPromise
    })

    it('should handle fillPath with evenodd fill rule', async () => {
      // Arrange
      const onDrawCallback = vi.fn(() => {
        const path = controller.createPath()
        controller.pathRect(path.id, 0, 0, 100, 100)
        controller.fillPath(path.id, 'evenodd')
      })
      controller.setOnDrawCallback(onDrawCallback)

      const startPromise = controller.start()
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Act - Simulate a frame
      const frameCallback = getCapturedFrameCallback()
      expect(frameCallback).not.toBeNull()
      frameCallback!({ deltaTime: 0.016, totalTime: 0.016, frameNumber: 1 })

      // Assert - callback was invoked
      expect(onDrawCallback).toHaveBeenCalled()

      // Cleanup
      controller.stop()
      await startPromise
    })

    it('should render frame commands when there are no commands', async () => {
      // Arrange - set up onDraw that adds no commands
      const onDrawCallback = vi.fn()
      controller.setOnDrawCallback(onDrawCallback)

      const startPromise = controller.start()
      await new Promise((resolve) => setTimeout(resolve, 0))

      const renderFn = getLastRenderFn()
      expect(renderFn).not.toBeNull()
      renderFn!.mockClear()

      // Act - Simulate a frame with no commands
      const frameCallback = getCapturedFrameCallback()
      expect(frameCallback).not.toBeNull()
      frameCallback!({ deltaTime: 0.016, totalTime: 0.016, frameNumber: 1 })

      // Assert - render should not be called if there are no commands
      expect(renderFn).not.toHaveBeenCalled()
      expect(onDrawCallback).toHaveBeenCalled()

      // Cleanup
      controller.stop()
      await startPromise
    })

    it('should handle interleaved regular and Path2D commands', async () => {
      // This tests the batch flushing when Path2D commands appear mid-stream
      const onDrawCallback = vi.fn(() => {
        // Add regular commands
        controller.clear()
        controller.fillRect(0, 0, 50, 50)
        // Path2D fill (should flush batch)
        const path1 = controller.createPath()
        controller.pathRect(path1.id, 60, 0, 50, 50)
        controller.fillPath(path1.id)
        // More regular commands
        controller.fillRect(120, 0, 50, 50)
        // Path2D stroke (should flush batch again)
        const path2 = controller.createPath()
        controller.pathRect(path2.id, 180, 0, 50, 50)
        controller.strokePath(path2.id)
        // Final regular command
        controller.fillRect(240, 0, 50, 50)
      })
      controller.setOnDrawCallback(onDrawCallback)

      const startPromise = controller.start()
      await new Promise((resolve) => setTimeout(resolve, 0))

      const renderFn = getLastRenderFn()
      expect(renderFn).not.toBeNull()
      renderFn!.mockClear()

      // Act - Simulate a frame
      const frameCallback = getCapturedFrameCallback()
      frameCallback!({ deltaTime: 0.016, totalTime: 0.016, frameNumber: 1 })

      // Assert - render should be called multiple times for batches
      expect(renderFn!.mock.calls.length).toBeGreaterThanOrEqual(1)

      // Cleanup
      controller.stop()
      await startPromise
    })

    it('should handle clipPath with evenodd fill rule', async () => {
      // Arrange
      const onDrawCallback = vi.fn(() => {
        const path = controller.createPath()
        controller.pathRect(path.id, 0, 0, 100, 100)
        controller.clipPath(path.id, 'evenodd')
        controller.fillRect(0, 0, 50, 50) // This should be clipped
      })
      controller.setOnDrawCallback(onDrawCallback)

      const startPromise = controller.start()
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Act - Simulate a frame
      const frameCallback = getCapturedFrameCallback()
      frameCallback!({ deltaTime: 0.016, totalTime: 0.016, frameNumber: 1 })

      // Assert - callback was invoked
      expect(onDrawCallback).toHaveBeenCalled()

      // Cleanup
      controller.stop()
      await startPromise
    })
  })

  describe('GC optimization - frameCommands array reuse', () => {
    it('should reuse frameCommands array reference across frames', async () => {
      // Arrange
      const startPromise = controller.start()
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Get reference to the frameCommands array after start
      const initialArrayRef = controller.getFrameCommands()

      // Simulate a frame by calling the captured callback
      const frameCallback = getCapturedFrameCallback()
      expect(frameCallback).not.toBeNull()

      // Act - Simulate multiple frames
      frameCallback!({ deltaTime: 0.016, totalTime: 0.016, frameNumber: 1 })

      // Assert - The array reference should be the same (cleared in-place, not replaced)
      const afterFirstFrame = controller.getFrameCommands()
      expect(afterFirstFrame).toBe(initialArrayRef) // Same reference, not a new array

      frameCallback!({ deltaTime: 0.016, totalTime: 0.032, frameNumber: 2 })
      const afterSecondFrame = controller.getFrameCommands()
      expect(afterSecondFrame).toBe(initialArrayRef) // Still same reference

      // Cleanup
      controller.stop()
      await startPromise
    })

    it('should clear frameCommands in-place after start() renders pre-start commands', async () => {
      // Arrange - Add a command before start
      controller.setSize(800, 600)
      const initialArrayRef = controller.getFrameCommands()
      expect(initialArrayRef.length).toBe(1)

      // Act
      const startPromise = controller.start()
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Assert - Array should be cleared in-place (same reference, length 0)
      const afterStart = controller.getFrameCommands()
      expect(afterStart).toBe(initialArrayRef) // Same reference
      expect(afterStart.length).toBe(0) // But cleared

      // Cleanup
      controller.stop()
      await startPromise
    })

    it('should clear frameCommands in-place during onFrame callback', async () => {
      // Arrange
      const onDrawCallback = vi.fn(() => {
        // During onDraw, add some commands
        controller.clear()
        controller.fillRect(0, 0, 100, 100)
      })
      controller.setOnDrawCallback(onDrawCallback)

      const startPromise = controller.start()
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Get reference to the frameCommands array
      const arrayRef = controller.getFrameCommands()

      // Act - Simulate a frame
      const frameCallback = getCapturedFrameCallback()
      expect(frameCallback).not.toBeNull()
      frameCallback!({ deltaTime: 0.016, totalTime: 0.016, frameNumber: 1 })

      // Assert - Array should be cleared in-place at start of frame (same reference)
      // Note: After the frame, commands from onDraw will be in the array
      const afterFrame = controller.getFrameCommands()
      expect(afterFrame).toBe(arrayRef) // Same reference maintained throughout

      // Cleanup
      controller.stop()
      await startPromise
    })
  })

})
