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

// Mock FontFace for jsdom environment (which doesn't have FontFace)
class MockFontFace {
  family: string
  constructor(family: string, _source: ArrayBuffer | string) {
    this.family = family
  }
  load() { return Promise.resolve(this) }
}
(globalThis as unknown as { FontFace: typeof MockFontFace }).FontFace = MockFontFace

// Mock document.fonts for jsdom environment
Object.defineProperty(document, 'fonts', {
  value: {
    add: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    has: vi.fn().mockReturnValue(false),
  },
  writable: true,
})

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
      isPaused = vi.fn().mockReturnValue(false)
      pause = vi.fn()
      resume = vi.fn()
      step = vi.fn()
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
      scanDirectory = vi.fn().mockReturnValue([
        { filename: 'player.png', fullPath: '/sprites/player.png', type: 'image' as const, basePath: 'sprites', relativePath: 'player.png' },
        { filename: 'enemy.png', fullPath: '/sprites/enemy.png', type: 'image' as const, basePath: 'sprites', relativePath: 'enemy.png' },
      ])
      constructor(_fs: IFileSystem, _scriptDir: string) {
        setMockAssetLoaderInstance(this)
      }
    },
    VALID_IMAGE_EXTENSIONS: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'],
    VALID_FONT_EXTENSIONS: ['.ttf', '.otf', '.woff', '.woff2'],
    isAssetHandle: (obj: unknown): obj is { _type: string; _name: string; _file: string } => {
      return typeof obj === 'object' && obj !== null && '_type' in obj && '_name' in obj
    },
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

  describe('addAssetPath', () => {
    it('should register an asset path that gets scanned during loadAssets', async () => {
      const mockFileSystem = createMockFileSystem()
      controller.addAssetPath('sprites')
      controller.loadImageAsset('player', 'player.png')

      await controller.loadAssets(mockFileSystem, '/game')

      // Verify the path was scanned
      expect(mockAssetLoaderInstance!.scanDirectory).toHaveBeenCalledWith('sprites')
    })

    it('should register multiple asset paths that all get scanned', async () => {
      const mockFileSystem = createMockFileSystem()
      controller.addAssetPath('sprites')
      controller.addAssetPath('fonts')
      controller.loadImageAsset('player', 'player.png')

      await controller.loadAssets(mockFileSystem, '/game')

      // Verify both paths were scanned
      expect(mockAssetLoaderInstance!.scanDirectory).toHaveBeenCalledWith('sprites')
      expect(mockAssetLoaderInstance!.scanDirectory).toHaveBeenCalledWith('fonts')
    })

    it('should throw if called after start', async () => {
      const startPromise = controller.start()

      // Wait for start to initialize
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(() => controller.addAssetPath('sprites')).toThrow(
        'Cannot add asset paths after canvas.start()'
      )

      // Clean up
      controller.stop()
      await startPromise
    })
  })

  describe('loadImageAsset', () => {
    it('should register an image asset with name and filename', () => {
      controller.addAssetPath('sprites')
      const handle = controller.loadImageAsset('player', 'player.png')

      expect(handle).toEqual({
        _type: 'image',
        _name: 'player',
        _file: 'player.png',
      })

      const manifest = controller.getAssetManifest()
      expect(manifest.has('player')).toBe(true)
      expect(manifest.get('player')).toEqual({
        name: 'player',
        path: 'player.png',
        type: 'image',
      })
    })

    it('should allow registering multiple image assets', () => {
      controller.addAssetPath('sprites')
      controller.loadImageAsset('player', 'player.png')
      controller.loadImageAsset('enemy', 'enemy.png')

      const manifest = controller.getAssetManifest()
      expect(manifest.size).toBe(2)
      expect(manifest.has('player')).toBe(true)
      expect(manifest.has('enemy')).toBe(true)
    })

    it('should allow overwriting asset with same name', () => {
      controller.addAssetPath('sprites')
      controller.loadImageAsset('player', 'old.png')
      controller.loadImageAsset('player', 'new.png')

      const manifest = controller.getAssetManifest()
      expect(manifest.size).toBe(1)
      expect(manifest.get('player')?.path).toBe('new.png')
    })
  })

  describe('loadFontAsset', () => {
    it('should register a font asset with name and filename', () => {
      controller.addAssetPath('fonts')
      const handle = controller.loadFontAsset('GameFont', 'pixel.ttf')

      expect(handle).toEqual({
        _type: 'font',
        _name: 'GameFont',
        _file: 'pixel.ttf',
      })

      const manifest = controller.getAssetManifest()
      expect(manifest.has('GameFont')).toBe(true)
      expect(manifest.get('GameFont')).toEqual({
        name: 'GameFont',
        path: 'pixel.ttf',
        type: 'font',
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

    it('should not throw if no assets registered', async () => {
      // No assets registered
      await expect(controller.loadAssets(mockFileSystem, '/game')).resolves.not.toThrow()
    })

    it('should scan registered paths and load discovered files', async () => {
      controller.addAssetPath('sprites')
      controller.loadImageAsset('player', 'player.png')

      await controller.loadAssets(mockFileSystem, '/game')

      // AssetLoader should have been created and scanDirectory called
      expect(mockAssetLoaderInstance).not.toBeNull()
      expect(mockAssetLoaderInstance!.scanDirectory).toHaveBeenCalledWith('sprites')
    })

    it('should store loaded images in ImageCache', async () => {
      controller.addAssetPath('sprites')
      controller.loadImageAsset('player', 'player.png')

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
      controller.addAssetPath('sprites')
      controller.loadImageAsset('player', 'player.png')
      await controller.loadAssets(mockFileSystem, '/game')

      controller.drawImage('player', 100, 200)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({ type: 'drawImage', name: 'player', x: 100, y: 200 })
    })

    it('should add drawImage command with explicit dimensions', async () => {
      controller.addAssetPath('sprites')
      controller.loadImageAsset('player', 'player.png')
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
        "Unknown asset 'unknown' - did you call canvas.assets.load_image()?"
      )
    })

    it('should add drawImage command with source cropping (9-arg form)', async () => {
      controller.addAssetPath('sprites')
      controller.loadImageAsset('spritesheet', 'spritesheet.png')
      await controller.loadAssets(mockFileSystem, '/game')

      // Draw 32x32 region from source at (64, 0) to dest at (100, 100) scaled to 64x64
      controller.drawImage('spritesheet', 100, 200, 64, 64, 64, 0, 32, 32)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'drawImage',
        name: 'spritesheet',
        x: 100,
        y: 200,
        width: 64,
        height: 64,
        sx: 64,
        sy: 0,
        sw: 32,
        sh: 32,
      })
    })
  })

  describe('font data transfer', () => {
    it('should return empty array when no fonts loaded', () => {
      expect(controller.getFontDataForTransfer()).toEqual([])
    })

    it('should store font data for transfer when fonts are loaded', async () => {
      const mockFileSystem = createMockFileSystem()

      controller.addAssetPath('fonts')
      controller.loadFontAsset('TestFont', 'test.ttf')

      await controller.loadAssets(mockFileSystem, '/game')

      // The default mock returns data, which should be stored for font transfer
      const fontData = controller.getFontDataForTransfer()
      expect(fontData).toHaveLength(1)
      expect(fontData[0].name).toBe('TestFont')
      // Verify it's a valid data URL format
      expect(fontData[0].dataUrl).toMatch(/^data:[^;]+;base64,/)
    })

    it('should store multiple fonts for transfer', async () => {
      const mockFileSystem = createMockFileSystem()

      controller.addAssetPath('fonts')
      controller.loadFontAsset('Font1', 'font1.ttf')
      controller.loadFontAsset('Font2', 'font2.otf')

      await controller.loadAssets(mockFileSystem, '/game')

      const fontData = controller.getFontDataForTransfer()
      expect(fontData).toHaveLength(2)
      expect(fontData.map(f => f.name)).toContain('Font1')
      expect(fontData.map(f => f.name)).toContain('Font2')
    })

    it('should include correct data URL structure', async () => {
      const mockFileSystem = createMockFileSystem()

      controller.addAssetPath('fonts')
      controller.loadFontAsset('TestFont', 'test.ttf')

      await controller.loadAssets(mockFileSystem, '/game')

      const fontData = controller.getFontDataForTransfer()
      expect(fontData).toHaveLength(1)
      // Should have both name and dataUrl properties
      expect(fontData[0]).toHaveProperty('name')
      expect(fontData[0]).toHaveProperty('dataUrl')
      expect(typeof fontData[0].name).toBe('string')
      expect(typeof fontData[0].dataUrl).toBe('string')
      // Data URL should start with 'data:' prefix
      expect(fontData[0].dataUrl.startsWith('data:')).toBe(true)
    })
  })

  describe('font transfer callback', () => {
    it('should not call transferFontsToWindow when no fonts are loaded', async () => {
      const transferFontsToWindow = vi.fn()

      const controllerWithCallback = new CanvasController({
        onRequestCanvasTab: vi.fn().mockResolvedValue(mockCanvas),
        onCloseCanvasTab: vi.fn(),
        transferFontsToWindow,
      })

      // Start without loading any fonts
      const startPromise = controllerWithCallback.start()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(transferFontsToWindow).not.toHaveBeenCalled()

      controllerWithCallback.stop()
      await startPromise
    })

    it('should not call transferFontsToWindow when callback is not provided', async () => {
      const mockFileSystem = createMockFileSystem()

      // Controller without transferFontsToWindow callback
      const controllerNoCallback = new CanvasController({
        onRequestCanvasTab: vi.fn().mockResolvedValue(mockCanvas),
        onCloseCanvasTab: vi.fn(),
        // No transferFontsToWindow
      })

      controllerNoCallback.addAssetPath('fonts')
      controllerNoCallback.loadFontAsset('TestFont', 'test.ttf')
      await controllerNoCallback.loadAssets(mockFileSystem, '/game')

      // Should not throw when starting without the callback
      const startPromise = controllerNoCallback.start()
      await new Promise(resolve => setTimeout(resolve, 10))

      // Verify fonts were loaded but no error occurred
      expect(controllerNoCallback.getFontDataForTransfer()).toHaveLength(1)

      controllerNoCallback.stop()
      await startPromise
    })
  })

  describe('asset dimensions', () => {
    let mockFileSystem: IFileSystem

    beforeEach(() => {
      mockFileSystem = createMockFileSystem()
    })

    it('should return asset width after loading', async () => {
      controller.addAssetPath('sprites')
      controller.loadImageAsset('player', 'player.png')
      await controller.loadAssets(mockFileSystem, '/game')

      expect(controller.getAssetWidth('player')).toBe(64)
    })

    it('should return asset height after loading', async () => {
      controller.addAssetPath('sprites')
      controller.loadImageAsset('player', 'player.png')
      await controller.loadAssets(mockFileSystem, '/game')

      expect(controller.getAssetHeight('player')).toBe(64)
    })

    it('should throw for unknown asset width', () => {
      expect(() => controller.getAssetWidth('unknown')).toThrow(
        "Unknown asset 'unknown' - did you call canvas.assets.load_image()?"
      )
    })

    it('should throw for unknown asset height', () => {
      expect(() => controller.getAssetHeight('unknown')).toThrow(
        "Unknown asset 'unknown' - did you call canvas.assets.load_image()?"
      )
    })
  })
})
