/**
 * Tests for CanvasController - Drawing methods.
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
      configureScaling = vi.fn()
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
      setLogicalSize = vi.fn()
    },
    GameLoopController: class MockGameLoopController {
      start = vi.fn()
      stop = vi.fn()
      dispose = vi.fn()
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

describe('CanvasController - Drawing', () => {
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

  it('should add clear command to frame commands', () => {
    controller.clear()

    const commands = controller.getFrameCommands()
    expect(commands).toHaveLength(1)
    expect(commands[0]).toEqual({ type: 'clear' })
  })

  it('should add clearRect command to frame commands', () => {
    controller.clearRect(50, 50, 100, 100)

    const commands = controller.getFrameCommands()
    expect(commands).toHaveLength(1)
    expect(commands[0]).toEqual({ type: 'clearRect', x: 50, y: 50, width: 100, height: 100 })
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

  it('should add strokeText command', () => {
    controller.strokeText(10, 20, 'Outlined Text')

    const commands = controller.getFrameCommands()
    expect(commands).toHaveLength(1)
    expect(commands[0]).toEqual({ type: 'strokeText', x: 10, y: 20, text: 'Outlined Text' })
  })

  it('should add strokeText command with font overrides', () => {
    controller.strokeText(10, 20, 'Large Outlined', { fontSize: 24, fontFamily: 'Arial' })

    const commands = controller.getFrameCommands()
    expect(commands).toHaveLength(1)
    expect(commands[0]).toEqual({
      type: 'strokeText',
      x: 10,
      y: 20,
      text: 'Large Outlined',
      fontSize: 24,
      fontFamily: 'Arial'
    })
  })

  it('should return text metrics with width and height', () => {
    // Mock the canvas context for text measurement
    const mockMeasureText = vi.fn().mockReturnValue({
      width: 100,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: 100,
      actualBoundingBoxAscent: 12,
      actualBoundingBoxDescent: 3,
      fontBoundingBoxAscent: 14,
      fontBoundingBoxDescent: 4,
    })
    const mockContext = {
      font: '',
      measureText: mockMeasureText,
    }
    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
    }
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return mockCanvas as unknown as HTMLCanvasElement
      return originalCreateElement(tag)
    })

    const metrics = controller.getTextMetrics('Hello World')

    // Should return an object with all metric properties
    expect(metrics).toHaveProperty('width')
    expect(typeof metrics.width).toBe('number')
    expect(metrics.width).toBe(100)

    // Should also include font height metrics
    expect(metrics).toHaveProperty('fontBoundingBoxAscent')
    expect(metrics).toHaveProperty('fontBoundingBoxDescent')
    expect(metrics.fontBoundingBoxAscent).toBe(14)
    expect(metrics.fontBoundingBoxDescent).toBe(4)

    // Clean up mock
    vi.restoreAllMocks()
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
