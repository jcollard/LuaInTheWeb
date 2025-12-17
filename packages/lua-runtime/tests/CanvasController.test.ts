/**
 * Tests for CanvasController class.
 * Tests canvas lifecycle management for shell-based canvas integration.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CanvasController, type CanvasCallbacks } from '../src/CanvasController'
import type { IFileSystem } from '@lua-learning/shell-core'

// Store mock ImageCache instance for testing
let mockImageCacheInstance: {
  set: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
  has: ReturnType<typeof vi.fn>
  clear: ReturnType<typeof vi.fn>
} | null = null

// Store mock AssetLoader instance for testing
let mockAssetLoaderInstance: {
  loadAsset: ReturnType<typeof vi.fn>
  resolvePath: ReturnType<typeof vi.fn>
} | null = null

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
    ImageCache: class MockImageCache {
      set = vi.fn()
      get = vi.fn()
      has = vi.fn()
      clear = vi.fn()
      constructor() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        mockImageCacheInstance = this
      }
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
      constructor(_fs: IFileSystem, _scriptDir: string) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        mockAssetLoaderInstance = this
      }
    },
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

  describe('asset registration', () => {
    it('should register an asset with valid image extension', () => {
      controller.registerAsset('player', 'sprites/player.png')

      const manifest = controller.getAssetManifest()
      expect(manifest.has('player')).toBe(true)
      expect(manifest.get('player')).toEqual({
        name: 'player',
        path: 'sprites/player.png',
        type: 'image',
      })
    })

    it('should accept various valid image extensions', () => {
      const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp']
      extensions.forEach((ext) => {
        controller.registerAsset(ext, `image.${ext}`)
      })

      const manifest = controller.getAssetManifest()
      expect(manifest.size).toBe(5)
      extensions.forEach((ext) => {
        expect(manifest.has(ext)).toBe(true)
      })
    })

    it('should throw for unsupported file extensions', () => {
      expect(() => controller.registerAsset('data', 'file.txt')).toThrow(
        "Cannot load 'file.txt': unsupported format (expected PNG, JPG, GIF, or WebP)"
      )
    })

    it('should throw for files without extension', () => {
      expect(() => controller.registerAsset('noext', 'noextension')).toThrow(
        "Cannot load 'noextension': unsupported format (expected PNG, JPG, GIF, or WebP)"
      )
    })

    it('should throw if called after start', async () => {
      const startPromise = controller.start()

      // Wait for start to initialize
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(() => controller.registerAsset('player', 'sprites/player.png')).toThrow(
        'Cannot define assets after canvas.start()'
      )

      // Clean up
      controller.stop()
      await startPromise
    })

    it('should allow registering multiple assets with same name (overwrite)', () => {
      controller.registerAsset('player', 'old.png')
      controller.registerAsset('player', 'new.png')

      const manifest = controller.getAssetManifest()
      expect(manifest.size).toBe(1)
      expect(manifest.get('player')?.path).toBe('new.png')
    })

    it('should return the asset manifest', () => {
      controller.registerAsset('player', 'sprites/player.png')
      controller.registerAsset('enemy', '/my-files/enemy.gif')

      const manifest = controller.getAssetManifest()

      expect(manifest.size).toBe(2)
      expect(manifest.get('player')).toEqual({
        name: 'player',
        path: 'sprites/player.png',
        type: 'image',
      })
      expect(manifest.get('enemy')).toEqual({
        name: 'enemy',
        path: '/my-files/enemy.gif',
        type: 'image',
      })
    })
  })

  describe('asset loading', () => {
    let mockFileSystem: IFileSystem

    beforeEach(() => {
      // Reset mock instances
      mockImageCacheInstance = null
      mockAssetLoaderInstance = null

      // Create mock filesystem
      mockFileSystem = {
        exists: vi.fn().mockReturnValue(true),
        isFile: vi.fn().mockReturnValue(true),
        isDirectory: vi.fn().mockReturnValue(false),
        readFile: vi.fn().mockReturnValue(''),
        writeFile: vi.fn(),
        deleteFile: vi.fn(),
        createDirectory: vi.fn(),
        deleteDirectory: vi.fn(),
        listDirectory: vi.fn().mockReturnValue([]),
        readBinaryFile: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
        writeBinaryFile: vi.fn(),
        copyFile: vi.fn(),
        moveFile: vi.fn(),
        rename: vi.fn(),
      }
    })

    it('should load assets using AssetLoader', async () => {
      controller.registerAsset('player', 'sprites/player.png')

      await controller.loadAssets(mockFileSystem, '/game')

      // AssetLoader should have been created and loadAsset called
      expect(mockAssetLoaderInstance).not.toBeNull()
      expect(mockAssetLoaderInstance!.loadAsset).toHaveBeenCalledWith({
        name: 'player',
        path: 'sprites/player.png',
        type: 'image',
      })
    })

    it('should not throw if no assets registered', async () => {
      // No assets registered
      await expect(controller.loadAssets(mockFileSystem, '/game')).resolves.not.toThrow()
    })

    it('should store loaded images in ImageCache', async () => {
      controller.registerAsset('player', 'sprites/player.png')

      await controller.loadAssets(mockFileSystem, '/game')

      // ImageCache should have been created and set called with the asset name
      expect(mockImageCacheInstance).not.toBeNull()
      expect(mockImageCacheInstance!.set).toHaveBeenCalledWith('player', expect.any(Object))
    })
  })

  describe('drawImage', () => {
    let mockFileSystem: IFileSystem

    beforeEach(async () => {
      mockFileSystem = {
        exists: vi.fn().mockReturnValue(true),
        isFile: vi.fn().mockReturnValue(true),
        isDirectory: vi.fn().mockReturnValue(false),
        readFile: vi.fn().mockReturnValue(''),
        writeFile: vi.fn(),
        deleteFile: vi.fn(),
        createDirectory: vi.fn(),
        deleteDirectory: vi.fn(),
        listDirectory: vi.fn().mockReturnValue([]),
        readBinaryFile: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
        writeBinaryFile: vi.fn(),
        copyFile: vi.fn(),
        moveFile: vi.fn(),
        rename: vi.fn(),
      }
    })

    it('should add drawImage command to frame commands', async () => {
      controller.registerAsset('player', 'sprites/player.png')
      await controller.loadAssets(mockFileSystem, '/game')

      controller.drawImage('player', 100, 200)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'drawImage', name: 'player', x: 100, y: 200 })
    })

    it('should add drawImage command with explicit dimensions', async () => {
      controller.registerAsset('player', 'sprites/player.png')
      await controller.loadAssets(mockFileSystem, '/game')

      controller.drawImage('player', 100, 200, 128, 128)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'drawImage',
        name: 'player',
        x: 100,
        y: 200,
        width: 128,
        height: 128,
      })
    })

    it('should throw for unknown asset', async () => {
      // No assets loaded
      expect(() => controller.drawImage('unknown', 0, 0)).toThrow(
        "Unknown asset 'unknown' - did you call canvas.assets.image()?"
      )
    })
  })

  describe('asset dimensions', () => {
    let mockFileSystem: IFileSystem

    beforeEach(async () => {
      mockFileSystem = {
        exists: vi.fn().mockReturnValue(true),
        isFile: vi.fn().mockReturnValue(true),
        isDirectory: vi.fn().mockReturnValue(false),
        readFile: vi.fn().mockReturnValue(''),
        writeFile: vi.fn(),
        deleteFile: vi.fn(),
        createDirectory: vi.fn(),
        deleteDirectory: vi.fn(),
        listDirectory: vi.fn().mockReturnValue([]),
        readBinaryFile: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
        writeBinaryFile: vi.fn(),
        copyFile: vi.fn(),
        moveFile: vi.fn(),
        rename: vi.fn(),
      }
    })

    it('should return asset width after loading', async () => {
      controller.registerAsset('player', 'sprites/player.png')
      await controller.loadAssets(mockFileSystem, '/game')

      expect(controller.getAssetWidth('player')).toBe(64)
    })

    it('should return asset height after loading', async () => {
      controller.registerAsset('player', 'sprites/player.png')
      await controller.loadAssets(mockFileSystem, '/game')

      expect(controller.getAssetHeight('player')).toBe(64)
    })

    it('should throw for unknown asset width', () => {
      expect(() => controller.getAssetWidth('unknown')).toThrow(
        "Unknown asset 'unknown' - did you call canvas.assets.image()?"
      )
    })

    it('should throw for unknown asset height', () => {
      expect(() => controller.getAssetHeight('unknown')).toThrow(
        "Unknown asset 'unknown' - did you call canvas.assets.image()?"
      )
    })
  })
})
