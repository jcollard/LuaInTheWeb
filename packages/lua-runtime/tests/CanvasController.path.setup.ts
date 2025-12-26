/**
 * Shared test setup for CanvasController path tests.
 * Contains mocks and common setup used across split test files.
 * @vitest-environment jsdom
 */

import { vi } from 'vitest'
import { CanvasController, type CanvasCallbacks } from '../src/CanvasController'

// Mock Path2D (not available in jsdom)
export class MockPath2D {
  commands: unknown[] = [];
  moveTo(x: number, y: number) { this.commands.push(['moveTo', x, y]); }
  lineTo(x: number, y: number) { this.commands.push(['lineTo', x, y]); }
  closePath() { this.commands.push(['closePath']); }
  arc(...args: unknown[]) { this.commands.push(['arc', ...args]); }
  arcTo(...args: unknown[]) { this.commands.push(['arcTo', ...args]); }
  ellipse(...args: unknown[]) { this.commands.push(['ellipse', ...args]); }
  rect(...args: unknown[]) { this.commands.push(['rect', ...args]); }
  roundRect(...args: unknown[]) { this.commands.push(['roundRect', ...args]); }
  quadraticCurveTo(...args: unknown[]) { this.commands.push(['quadraticCurveTo', ...args]); }
  bezierCurveTo(...args: unknown[]) { this.commands.push(['bezierCurveTo', ...args]); }
}

// Assign to global for tests
(globalThis as unknown as { Path2D: typeof MockPath2D }).Path2D = MockPath2D;

// Global to capture the frame callback for testing
export let lastRenderFn: ReturnType<typeof vi.fn> | null = null

// Reset captured callback between tests
export function resetCapturedCallback(): void {
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

/**
 * Creates a test controller with mock callbacks.
 * Call in beforeEach after resetting captured callback.
 */
export function createTestController(): {
  controller: CanvasController
  callbacks: CanvasCallbacks
} {
  const mockCanvas = document.createElement('canvas')
  mockCanvas.id = 'test-canvas'

  const callbacks: CanvasCallbacks = {
    requestCanvasTab: vi.fn(() =>
      Promise.resolve({
        canvas: mockCanvas,
        closeTab: vi.fn(),
      })
    ),
    registerCanvasCloseHandler: vi.fn(),
    unregisterCanvasCloseHandler: vi.fn(),
  }

  const controller = new CanvasController(callbacks)

  return { controller, callbacks }
}
