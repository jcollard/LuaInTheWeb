/**
 * Tests for CanvasController error overlay functionality.
 * Verifies that showErrorOverlay callback is called when runtime errors occur.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CanvasController, type CanvasCallbacks } from '../src/CanvasController'

// Mock Path2D
class MockPath2D {
  commands: unknown[] = []
  moveTo() { }
  lineTo() { }
  closePath() { }
}
(globalThis as { Path2D: typeof MockPath2D }).Path2D = MockPath2D

// Global to capture the frame callback for testing
let capturedFrameCallback: ((timing: { deltaTime: number; totalTime: number; frameNumber: number }) => void) | null = null

// Helper to get the captured frame callback
export function getCapturedFrameCallback() {
  return capturedFrameCallback
}

// Reset captured callback between tests
export function resetCapturedCallback() {
  capturedFrameCallback = null
}

// Use the same mocks as CanvasController.test.ts
vi.mock('@lua-learning/canvas-runtime', async () => {
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
    CanvasRenderer: class {
      render = vi.fn()
      dispose = vi.fn()
    },
    InputCapture: class {
      pollGamepads = vi.fn()
      dispose = vi.fn()
    },
    GameLoopController: class {
      start = vi.fn()
      stop = vi.fn()
      pause = vi.fn()
      resume = vi.fn()
      step = vi.fn()
      dispose = vi.fn()
      isPaused = vi.fn(() => false)
      constructor(callback: (timing: { deltaTime: number; totalTime: number; frameNumber: number }) => void) {
        capturedFrameCallback = callback
      }
    },
    ImageCache: class {
      dispose = vi.fn()
    },
  }
})

describe('CanvasController - Error Overlay', () => {
  let controller: CanvasController
  let callbacks: CanvasCallbacks
  let mockCanvas: HTMLCanvasElement

  beforeEach(() => {
    resetCapturedCallback()

    // Create a real canvas element
    mockCanvas = document.createElement('canvas')
    mockCanvas.width = 800
    mockCanvas.height = 600

    // Create callbacks with mocks
    callbacks = {
      onRequestCanvasTab: vi.fn().mockResolvedValue(mockCanvas),
      onCloseCanvasTab: vi.fn(),
      onError: vi.fn(),
      showErrorOverlay: vi.fn(),
      clearErrorOverlay: vi.fn(),
    }

    controller = new CanvasController(callbacks, 'test-canvas')
  })

  it('should call showErrorOverlay when runtime error occurs in tick callback', async () => {
    // Register a tick callback that will throw an error
    controller.setOnDrawCallback(() => {
      throw new Error('attempt to concatenate a nil value')
    })

    // Start the canvas (returns promise that resolves when stopped)
    const startPromise = controller.start()

    // Wait for start to initialize
    await new Promise(resolve => setTimeout(resolve, 50))

    // Get the frame callback
    const onFrameCallback = getCapturedFrameCallback()
    expect(onFrameCallback).not.toBeNull()

    // Simulate a frame being processed (this should trigger the error)
    if (onFrameCallback) {
      onFrameCallback({
        deltaTime: 16,
        totalTime: 16,
        frameNumber: 1,
      })
    }

    // Wait for error handling
    await new Promise(resolve => setTimeout(resolve, 10))

    // Verify error callback was called
    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.stringContaining('attempt to concatenate a nil value')
    )

    // THIS IS THE KEY TEST - verify showErrorOverlay was called
    expect(callbacks.showErrorOverlay).toHaveBeenCalledWith(
      'test-canvas',
      expect.stringContaining('attempt to concatenate a nil value')
    )

    // Clean up
    controller.stop()
    await startPromise
  })

  it('should call clearErrorOverlay when resuming after error', async () => {
    // Start the canvas
    const startPromise = controller.start()

    await new Promise(resolve => setTimeout(resolve, 50))

    // Pause
    controller.pause()

    await new Promise(resolve => setTimeout(resolve, 10))

    // Clear the mock to see new calls
    vi.clearAllMocks()

    // Now resume - this should clear the error overlay
    controller.resume()

    // Verify clearErrorOverlay was called
    expect(callbacks.clearErrorOverlay).toHaveBeenCalledWith('test-canvas')

    // Clean up
    controller.stop()
    await startPromise
  })

  it('should call clearErrorOverlay when starting fresh', async () => {
    // Start the canvas
    const startPromise = controller.start()

    // Wait for start to complete
    await new Promise(resolve => setTimeout(resolve, 50))

    // Verify clearErrorOverlay was called on start
    expect(callbacks.clearErrorOverlay).toHaveBeenCalledWith('test-canvas')

    // Clean up
    controller.stop()
    await startPromise
  })
})
