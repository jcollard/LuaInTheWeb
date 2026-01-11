/**
 * Tests for CanvasController - Transformation methods.
 * Extracted from CanvasController.test.ts to manage file size.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CanvasController, type CanvasCallbacks } from '../src/CanvasController'

// Mock Path2D for jsdom environment
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

// Mock the canvas-runtime imports
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
      isPaused = vi.fn().mockReturnValue(false)
      pause = vi.fn()
      resume = vi.fn()
      step = vi.fn()
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
    VALID_FONT_EXTENSIONS: ['.ttf', '.otf', '.woff', '.woff2'],
  }
})

describe('CanvasController - Transformations', () => {
  let controller: CanvasController
  let mockCallbacks: CanvasCallbacks

  beforeEach(() => {
    const canvas = document.createElement('canvas')
    mockCallbacks = {
      onError: vi.fn(),
      onPrint: vi.fn(),
      onAssetRequest: vi.fn().mockResolvedValue(undefined),
    }
    controller = new CanvasController(canvas, '/test/', mockCallbacks)
  })

  afterEach(() => {
    controller.stop()
    vi.clearAllMocks()
  })

  it('should add translate command', () => {
    controller.translate(100, 50)

    const commands = controller.getFrameCommands()
    expect(commands).toHaveLength(1)
    expect(commands[0]).toEqual({ type: 'translate', dx: 100, dy: 50 })
  })

  it('should add translate command with negative values', () => {
    controller.translate(-25, -75)

    const commands = controller.getFrameCommands()
    expect(commands).toHaveLength(1)
    expect(commands[0]).toEqual({ type: 'translate', dx: -25, dy: -75 })
  })

  it('should add rotate command', () => {
    const angle = Math.PI / 4
    controller.rotate(angle)

    const commands = controller.getFrameCommands()
    expect(commands).toHaveLength(1)
    expect(commands[0]).toEqual({ type: 'rotate', angle })
  })

  it('should add rotate command with negative angle', () => {
    const angle = -Math.PI / 2
    controller.rotate(angle)

    const commands = controller.getFrameCommands()
    expect(commands).toHaveLength(1)
    expect(commands[0]).toEqual({ type: 'rotate', angle })
  })

  it('should add scale command', () => {
    controller.scale(2, 3)

    const commands = controller.getFrameCommands()
    expect(commands).toHaveLength(1)
    expect(commands[0]).toEqual({ type: 'scale', sx: 2, sy: 3 })
  })

  it('should add scale command with fractional values', () => {
    controller.scale(0.5, 0.25)

    const commands = controller.getFrameCommands()
    expect(commands).toHaveLength(1)
    expect(commands[0]).toEqual({ type: 'scale', sx: 0.5, sy: 0.25 })
  })

  it('should add scale command with negative values (mirroring)', () => {
    controller.scale(-1, 1)

    const commands = controller.getFrameCommands()
    expect(commands).toHaveLength(1)
    expect(commands[0]).toEqual({ type: 'scale', sx: -1, sy: 1 })
  })

  it('should add save command', () => {
    controller.save()

    const commands = controller.getFrameCommands()
    expect(commands).toHaveLength(1)
    expect(commands[0]).toEqual({ type: 'save' })
  })

  it('should add restore command', () => {
    controller.restore()

    const commands = controller.getFrameCommands()
    expect(commands).toHaveLength(1)
    expect(commands[0]).toEqual({ type: 'restore' })
  })

  it('should add transform command', () => {
    controller.transform(1, 0, 0, 1, 100, 50)

    const commands = controller.getFrameCommands()
    expect(commands).toHaveLength(1)
    expect(commands[0]).toEqual({ type: 'transform', a: 1, b: 0, c: 0, d: 1, e: 100, f: 50 })
  })

  it('should add setTransform command', () => {
    controller.setTransform(2, 0, 0, 2, 50, 50)

    const commands = controller.getFrameCommands()
    expect(commands).toHaveLength(1)
    expect(commands[0]).toEqual({ type: 'setTransform', a: 2, b: 0, c: 0, d: 2, e: 50, f: 50 })
  })

  it('should add resetTransform command', () => {
    controller.resetTransform()

    const commands = controller.getFrameCommands()
    expect(commands).toHaveLength(1)
    expect(commands[0]).toEqual({ type: 'resetTransform' })
  })

  it('should support typical save/restore workflow', () => {
    controller.save()
    controller.translate(100, 100)
    controller.rotate(Math.PI / 4)
    controller.fillRect(-25, -25, 50, 50)
    controller.restore()

    const commands = controller.getFrameCommands()
    expect(commands).toHaveLength(5)
    expect(commands[0]).toEqual({ type: 'save' })
    expect(commands[1]).toEqual({ type: 'translate', dx: 100, dy: 100 })
    expect(commands[2]).toEqual({ type: 'rotate', angle: Math.PI / 4 })
    expect(commands[3]).toEqual({ type: 'fillRect', x: -25, y: -25, width: 50, height: 50 })
    expect(commands[4]).toEqual({ type: 'restore' })
  })
})
