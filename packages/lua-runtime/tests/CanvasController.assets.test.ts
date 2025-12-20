/**
 * Tests for CanvasController class - Asset functionality.
 * Tests asset registration, loading, and drawing for shell-based canvas integration.
 * Core lifecycle tests are in CanvasController.test.ts
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CanvasController, type CanvasCallbacks } from '../src/CanvasController'
import {
  setMockImageCacheInstance,
  setMockAssetLoaderInstance,
  resetMockInstances,
  createMockFileSystem,
  mockImageCacheInstance,
  mockAssetLoaderInstance,
} from './canvasControllerTestSetup'
import type { IFileSystem } from '@lua-learning/shell-core'

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
        setMockImageCacheInstance(this)
      }
    },
    FontCache: class MockFontCache {
      set = vi.fn()
      get = vi.fn()
      has = vi.fn()
      getLoadedFonts = vi.fn().mockReturnValue([])
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
      resolvePath = vi.fn((path: string) => (path.startsWith('/') ? path : `/test/${path}`))
      constructor(_fs: IFileSystem, _scriptDir: string) {
        setMockAssetLoaderInstance(this)
      }
    },
    VALID_IMAGE_EXTENSIONS: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'],
    VALID_FONT_EXTENSIONS: ['.ttf', '.otf', '.woff', '.woff2'],
  }
})

describe('CanvasController Assets', () => {
  let controller: CanvasController
  let mockCallbacks: CanvasCallbacks
  let mockCanvas: HTMLCanvasElement
  let originalImage: typeof Image

  beforeEach(() => {
    // Reset mock instances
    resetMockInstances()

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
      width = 64
      height = 64

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
      // Reset mock instances before each test
      resetMockInstances()

      // Create mock filesystem
      mockFileSystem = createMockFileSystem()
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

    beforeEach(() => {
      mockFileSystem = createMockFileSystem()
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

    it('should throw for unknown asset', () => {
      // No assets loaded
      expect(() => controller.drawImage('unknown', 0, 0)).toThrow(
        "Unknown asset 'unknown' - did you call canvas.assets.image()?"
      )
    })
  })

  describe('asset dimensions', () => {
    let mockFileSystem: IFileSystem

    beforeEach(() => {
      mockFileSystem = createMockFileSystem()
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
