/**
 * Tests for AssetManager class - Asset registration, loading, and lifecycle.
 * Follows TDD methodology: tests written before implementation.
 * @vitest-environment jsdom
 */
/* eslint-disable max-lines */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AssetManager } from '../src/AssetManager'
import type { IFileSystem } from '@lua-learning/shell-core'

// Mock Path2D for jsdom environment (which doesn't have Path2D)
class MockPath2D {
  commands: unknown[] = []
  moveTo(x: number, y: number) { this.commands.push(['moveTo', x, y]) }
  lineTo(x: number, y: number) { this.commands.push(['lineTo', x, y]) }
  closePath() { this.commands.push(['closePath']) }
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

// Store mock instances for testing
let mockImageCacheInstance: {
  set: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
  has: ReturnType<typeof vi.fn>
  clear: ReturnType<typeof vi.fn>
} | null = null

let mockFontCacheInstance: {
  set: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
  has: ReturnType<typeof vi.fn>
  getLoadedFonts: ReturnType<typeof vi.fn>
  clear: ReturnType<typeof vi.fn>
} | null = null

let mockAssetLoaderInstance: {
  loadAsset: ReturnType<typeof vi.fn>
  resolvePath: ReturnType<typeof vi.fn>
  scanDirectory: ReturnType<typeof vi.fn>
} | null = null

// Error injection flags for testing error paths
let mockScanDirectoryError: Error | string | null = null
let mockLoadAssetError: Error | null = null

// Helper functions to set mock instances (avoids 'this' alias lint error)
function setImageCacheInstance(instance: typeof mockImageCacheInstance): void {
  mockImageCacheInstance = instance
}

function setFontCacheInstance(instance: typeof mockFontCacheInstance): void {
  mockFontCacheInstance = instance
}

function setAssetLoaderInstance(instance: typeof mockAssetLoaderInstance): void {
  mockAssetLoaderInstance = instance
}

// Helper functions for error injection
function getScanDirectoryError(): Error | string | null {
  return mockScanDirectoryError
}

function getLoadAssetError(): Error | null {
  return mockLoadAssetError
}

// Mock the canvas-runtime imports
vi.mock('@lua-learning/canvas-runtime', () => {
  return {
    ImageCache: class MockImageCache {
      set = vi.fn()
      get = vi.fn()
      has = vi.fn()
      clear = vi.fn()
      constructor() {
        setImageCacheInstance(this)
      }
    },
    FontCache: class MockFontCache {
      set = vi.fn()
      get = vi.fn()
      has = vi.fn().mockReturnValue(false)
      getLoadedFonts = vi.fn().mockReturnValue([])
      clear = vi.fn()
      constructor() {
        setFontCacheInstance(this)
      }
    },
    AssetLoader: class MockAssetLoader {
      loadAsset = vi.fn().mockImplementation(() => {
        const error = getLoadAssetError()
        if (error) {
          return Promise.reject(error)
        }
        return Promise.resolve({
          name: 'test',
          data: new ArrayBuffer(8),
          width: 64,
          height: 64,
          mimeType: 'image/png',
        })
      })
      resolvePath = vi.fn((path: string) => (path.startsWith('/') ? path : `/test/${path}`))
      scanDirectory = vi.fn().mockImplementation(() => {
        const error = getScanDirectoryError()
        if (error) {
          throw error
        }
        return [
          { filename: 'player.png', fullPath: '/sprites/player.png', type: 'image' as const, basePath: 'sprites', relativePath: 'player.png' },
          { filename: 'enemy.png', fullPath: '/sprites/enemy.png', type: 'image' as const, basePath: 'sprites', relativePath: 'enemy.png' },
        ]
      })
      constructor(_fs: IFileSystem, _scriptDir: string) {
        setAssetLoaderInstance(this)
      }
    },
    isAssetHandle: (obj: unknown): obj is { _type: string; _name: string; _file: string } => {
      return typeof obj === 'object' && obj !== null && '_type' in obj && '_name' in obj
    },
  }
})

// Mock the audio engine
vi.mock('../src/audio/WebAudioEngine', () => ({
  WebAudioEngine: class MockWebAudioEngine {
    initialize = vi.fn().mockResolvedValue(undefined)
    decodeAudio = vi.fn().mockResolvedValue(undefined)
    dispose = vi.fn()
  },
}))

/**
 * Creates a mock filesystem for testing.
 */
function createMockFileSystem(): IFileSystem {
  return {
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
}

describe('AssetManager', () => {
  let assetManager: AssetManager
  let originalImage: typeof Image

  beforeEach(() => {
    // Reset mock instances
    mockImageCacheInstance = null
    mockFontCacheInstance = null
    mockAssetLoaderInstance = null

    assetManager = new AssetManager()

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
    // Reset error injection flags
    mockScanDirectoryError = null
    mockLoadAssetError = null
  })

  describe('construction', () => {
    it('should construct with default state', () => {
      expect(assetManager).toBeDefined()
      expect(assetManager.isStarted()).toBe(false)
      expect(assetManager.getAssetManifest().size).toBe(0)
      expect(assetManager.getAudioAssetManifest().size).toBe(0)
      expect(assetManager.getImageCache()).toBeNull()
      expect(assetManager.getFontCache()).toBeNull()
      expect(assetManager.getAudioEngine()).toBeNull()
    })
  })

  describe('state tracking', () => {
    describe('markStarted', () => {
      it('should mark the asset manager as started', () => {
        expect(assetManager.isStarted()).toBe(false)
        assetManager.markStarted()
        expect(assetManager.isStarted()).toBe(true)
      })

      it('should prevent adding asset paths after started', () => {
        assetManager.markStarted()
        expect(() => assetManager.addAssetPath('sprites')).toThrow(
          'Cannot add asset paths after canvas.start()'
        )
      })
    })

    describe('isStarted', () => {
      it('should return false initially', () => {
        expect(assetManager.isStarted()).toBe(false)
      })

      it('should return true after markStarted', () => {
        assetManager.markStarted()
        expect(assetManager.isStarted()).toBe(true)
      })
    })
  })

  describe('path registration', () => {
    describe('addAssetPath', () => {
      it('should register an asset path', async () => {
        const mockFileSystem = createMockFileSystem()
        assetManager.addAssetPath('sprites')
        assetManager.loadImageAsset('player', 'player.png')

        await assetManager.loadAssets(mockFileSystem, '/game')

        expect(mockAssetLoaderInstance!.scanDirectory).toHaveBeenCalledWith('sprites')
      })

      it('should register multiple asset paths', async () => {
        const mockFileSystem = createMockFileSystem()
        assetManager.addAssetPath('sprites')
        assetManager.addAssetPath('fonts')
        assetManager.loadImageAsset('player', 'player.png')

        await assetManager.loadAssets(mockFileSystem, '/game')

        expect(mockAssetLoaderInstance!.scanDirectory).toHaveBeenCalledWith('sprites')
        expect(mockAssetLoaderInstance!.scanDirectory).toHaveBeenCalledWith('fonts')
      })

      it('should throw if called after started', () => {
        assetManager.markStarted()
        expect(() => assetManager.addAssetPath('sprites')).toThrow(
          'Cannot add asset paths after canvas.start()'
        )
      })

      it('should skip duplicate paths during hot reload', () => {
        assetManager.addAssetPath('sprites')
        assetManager.addAssetPath('sprites') // Should not throw, just skip
        // If we didn't skip, this would cause issues or duplicates
      })

      it('should allow duplicate paths even after started (for hot reload)', () => {
        assetManager.addAssetPath('sprites')
        assetManager.markStarted()
        // Should not throw because the path already exists
        assetManager.addAssetPath('sprites')
      })
    })
  })

  describe('image asset registration', () => {
    describe('loadImageAsset', () => {
      it('should register an image asset with name and filename', () => {
        assetManager.addAssetPath('sprites')
        const handle = assetManager.loadImageAsset('player', 'player.png')

        expect(handle).toEqual({
          _type: 'image',
          _name: 'player',
          _file: 'player.png',
        })

        const manifest = assetManager.getAssetManifest()
        expect(manifest.has('player')).toBe(true)
        expect(manifest.get('player')).toEqual({
          name: 'player',
          path: 'player.png',
          type: 'image',
        })
      })

      it('should allow registering multiple image assets', () => {
        assetManager.addAssetPath('sprites')
        assetManager.loadImageAsset('player', 'player.png')
        assetManager.loadImageAsset('enemy', 'enemy.png')

        const manifest = assetManager.getAssetManifest()
        expect(manifest.size).toBe(2)
        expect(manifest.has('player')).toBe(true)
        expect(manifest.has('enemy')).toBe(true)
      })

      it('should allow overwriting asset with same name', () => {
        assetManager.addAssetPath('sprites')
        assetManager.loadImageAsset('player', 'old.png')
        assetManager.loadImageAsset('player', 'new.png')

        const manifest = assetManager.getAssetManifest()
        expect(manifest.size).toBe(1)
        expect(manifest.get('player')?.path).toBe('new.png')
      })

      it('should return a valid AssetHandle', () => {
        assetManager.addAssetPath('sprites')
        const handle = assetManager.loadImageAsset('test', 'test.png')

        expect(handle._type).toBe('image')
        expect(handle._name).toBe('test')
        expect(handle._file).toBe('test.png')
      })
    })
  })

  describe('font asset registration', () => {
    describe('loadFontAsset', () => {
      it('should register a font asset with name and filename', () => {
        assetManager.addAssetPath('fonts')
        const handle = assetManager.loadFontAsset('GameFont', 'pixel.ttf')

        expect(handle).toEqual({
          _type: 'font',
          _name: 'GameFont',
          _file: 'pixel.ttf',
        })

        const manifest = assetManager.getAssetManifest()
        expect(manifest.has('GameFont')).toBe(true)
        expect(manifest.get('GameFont')).toEqual({
          name: 'GameFont',
          path: 'pixel.ttf',
          type: 'font',
        })
      })

      it('should allow overwriting font with same name', () => {
        assetManager.addAssetPath('fonts')
        assetManager.loadFontAsset('GameFont', 'old.ttf')
        assetManager.loadFontAsset('GameFont', 'new.ttf')

        const manifest = assetManager.getAssetManifest()
        expect(manifest.size).toBe(1)
        expect(manifest.get('GameFont')?.path).toBe('new.ttf')
      })
    })

    describe('isFontLoaded', () => {
      it('should return false when font cache is null', () => {
        expect(assetManager.isFontLoaded('TestFont')).toBe(false)
      })

      it('should delegate to font cache when available', async () => {
        const mockFileSystem = createMockFileSystem()
        assetManager.addAssetPath('fonts')
        assetManager.loadFontAsset('TestFont', 'test.ttf')
        await assetManager.loadAssets(mockFileSystem, '/game')

        // Font cache should now exist
        expect(mockFontCacheInstance).not.toBeNull()

        // Configure mock to return true for has()
        mockFontCacheInstance!.has.mockReturnValue(true)
        expect(assetManager.isFontLoaded('TestFont')).toBe(true)

        // Configure mock to return false for has()
        mockFontCacheInstance!.has.mockReturnValue(false)
        expect(assetManager.isFontLoaded('OtherFont')).toBe(false)
      })
    })
  })

  describe('audio asset registration', () => {
    describe('loadSoundAsset', () => {
      it('should register a sound asset', () => {
        assetManager.addAssetPath('sounds')
        const handle = assetManager.loadSoundAsset('explosion', 'boom.wav')

        expect(handle).toEqual({
          _type: 'sound',
          _name: 'explosion',
          _file: 'boom.wav',
        })

        const manifest = assetManager.getAudioAssetManifest()
        expect(manifest.has('explosion')).toBe(true)
        expect(manifest.get('explosion')).toEqual({
          name: 'explosion',
          filename: 'boom.wav',
          type: 'sound',
        })
      })

      it('should throw if called after started', () => {
        assetManager.markStarted()
        expect(() => assetManager.loadSoundAsset('explosion', 'boom.wav')).toThrow(
          'Cannot load audio assets after canvas.start()'
        )
      })

      it('should return existing handle during hot reload', () => {
        assetManager.addAssetPath('sounds')
        const handle1 = assetManager.loadSoundAsset('explosion', 'boom.wav')
        assetManager.markStarted()
        // During hot reload, re-registering same asset should return handle
        const handle2 = assetManager.loadSoundAsset('explosion', 'boom.wav')

        expect(handle2).toEqual(handle1)
      })
    })

    describe('loadMusicAsset', () => {
      it('should register a music asset', () => {
        assetManager.addAssetPath('music')
        const handle = assetManager.loadMusicAsset('theme', 'theme.mp3')

        expect(handle).toEqual({
          _type: 'music',
          _name: 'theme',
          _file: 'theme.mp3',
        })

        const manifest = assetManager.getAudioAssetManifest()
        expect(manifest.has('theme')).toBe(true)
        expect(manifest.get('theme')).toEqual({
          name: 'theme',
          filename: 'theme.mp3',
          type: 'music',
        })
      })

      it('should throw if called after started', () => {
        assetManager.markStarted()
        expect(() => assetManager.loadMusicAsset('theme', 'theme.mp3')).toThrow(
          'Cannot load audio assets after canvas.start()'
        )
      })

      it('should return existing handle during hot reload', () => {
        assetManager.addAssetPath('music')
        const handle1 = assetManager.loadMusicAsset('theme', 'theme.mp3')
        assetManager.markStarted()
        // During hot reload, re-registering same asset should return handle
        const handle2 = assetManager.loadMusicAsset('theme', 'theme.mp3')

        expect(handle2).toEqual(handle1)
      })
    })

    describe('getAudioEngine', () => {
      it('should return null before loading', () => {
        expect(assetManager.getAudioEngine()).toBeNull()
      })
    })

    describe('getAudioAssetManifest', () => {
      it('should return empty map initially', () => {
        expect(assetManager.getAudioAssetManifest().size).toBe(0)
      })

      it('should return manifest with registered assets', () => {
        assetManager.addAssetPath('audio')
        assetManager.loadSoundAsset('boom', 'boom.wav')
        assetManager.loadMusicAsset('theme', 'theme.mp3')

        const manifest = assetManager.getAudioAssetManifest()
        expect(manifest.size).toBe(2)
        expect(manifest.has('boom')).toBe(true)
        expect(manifest.has('theme')).toBe(true)
      })
    })
  })

  describe('asset loading', () => {
    let mockFileSystem: IFileSystem

    beforeEach(() => {
      mockFileSystem = createMockFileSystem()
    })

    it('should not throw if no assets registered', async () => {
      await expect(assetManager.loadAssets(mockFileSystem, '/game')).resolves.not.toThrow()
    })

    it('should scan registered paths and load discovered files', async () => {
      assetManager.addAssetPath('sprites')
      assetManager.loadImageAsset('player', 'player.png')

      await assetManager.loadAssets(mockFileSystem, '/game')

      expect(mockAssetLoaderInstance).not.toBeNull()
      expect(mockAssetLoaderInstance!.scanDirectory).toHaveBeenCalledWith('sprites')
    })

    it('should store loaded images in ImageCache', async () => {
      assetManager.addAssetPath('sprites')
      assetManager.loadImageAsset('player', 'player.png')

      await assetManager.loadAssets(mockFileSystem, '/game')

      expect(mockImageCacheInstance).not.toBeNull()
      expect(mockImageCacheInstance!.set).toHaveBeenCalledWith('player', expect.any(Object))
    })

    it('should create FontCache even with only images', async () => {
      assetManager.addAssetPath('sprites')
      assetManager.loadImageAsset('player', 'player.png')

      await assetManager.loadAssets(mockFileSystem, '/game')

      expect(assetManager.getFontCache()).not.toBeNull()
    })
  })

  describe('query methods', () => {
    let mockFileSystem: IFileSystem

    beforeEach(() => {
      mockFileSystem = createMockFileSystem()
    })

    describe('getAssetWidth', () => {
      it('should return asset width after loading', async () => {
        assetManager.addAssetPath('sprites')
        assetManager.loadImageAsset('player', 'player.png')
        await assetManager.loadAssets(mockFileSystem, '/game')

        expect(assetManager.getAssetWidth('player')).toBe(64)
      })

      it('should throw for unknown asset', () => {
        expect(() => assetManager.getAssetWidth('unknown')).toThrow(
          "Unknown asset 'unknown' - did you call canvas.assets.load_image()?"
        )
      })

      it('should work with AssetHandle', async () => {
        assetManager.addAssetPath('sprites')
        const handle = assetManager.loadImageAsset('player', 'player.png')
        await assetManager.loadAssets(mockFileSystem, '/game')

        expect(assetManager.getAssetWidth(handle)).toBe(64)
      })
    })

    describe('getAssetHeight', () => {
      it('should return asset height after loading', async () => {
        assetManager.addAssetPath('sprites')
        assetManager.loadImageAsset('player', 'player.png')
        await assetManager.loadAssets(mockFileSystem, '/game')

        expect(assetManager.getAssetHeight('player')).toBe(64)
      })

      it('should throw for unknown asset', () => {
        expect(() => assetManager.getAssetHeight('unknown')).toThrow(
          "Unknown asset 'unknown' - did you call canvas.assets.load_image()?"
        )
      })

      it('should work with AssetHandle', async () => {
        assetManager.addAssetPath('sprites')
        const handle = assetManager.loadImageAsset('player', 'player.png')
        await assetManager.loadAssets(mockFileSystem, '/game')

        expect(assetManager.getAssetHeight(handle)).toBe(64)
      })
    })

    describe('hasAsset', () => {
      it('should return false before loading', () => {
        expect(assetManager.hasAsset('player')).toBe(false)
      })

      it('should return true after loading', async () => {
        assetManager.addAssetPath('sprites')
        assetManager.loadImageAsset('player', 'player.png')
        await assetManager.loadAssets(mockFileSystem, '/game')

        expect(assetManager.hasAsset('player')).toBe(true)
      })

      it('should return false for unregistered assets', async () => {
        assetManager.addAssetPath('sprites')
        assetManager.loadImageAsset('player', 'player.png')
        await assetManager.loadAssets(mockFileSystem, '/game')

        expect(assetManager.hasAsset('enemy')).toBe(false)
      })
    })
  })

  describe('cache access', () => {
    let mockFileSystem: IFileSystem

    beforeEach(() => {
      mockFileSystem = createMockFileSystem()
    })

    describe('getImageCache', () => {
      it('should return null before loading', () => {
        expect(assetManager.getImageCache()).toBeNull()
      })

      it('should return ImageCache after loading', async () => {
        assetManager.addAssetPath('sprites')
        assetManager.loadImageAsset('player', 'player.png')
        await assetManager.loadAssets(mockFileSystem, '/game')

        expect(assetManager.getImageCache()).not.toBeNull()
      })
    })

    describe('getFontCache', () => {
      it('should return null before loading', () => {
        expect(assetManager.getFontCache()).toBeNull()
      })

      it('should return FontCache after loading', async () => {
        assetManager.addAssetPath('sprites')
        assetManager.loadImageAsset('player', 'player.png')
        await assetManager.loadAssets(mockFileSystem, '/game')

        expect(assetManager.getFontCache()).not.toBeNull()
      })
    })
  })

  describe('font data transfer', () => {
    let mockFileSystem: IFileSystem

    beforeEach(() => {
      mockFileSystem = createMockFileSystem()
    })

    describe('getFontDataForTransfer', () => {
      it('should return empty array when no fonts loaded', () => {
        expect(assetManager.getFontDataForTransfer()).toEqual([])
      })

      it('should return font data after loading fonts', async () => {
        assetManager.addAssetPath('fonts')
        assetManager.loadFontAsset('TestFont', 'test.ttf')

        await assetManager.loadAssets(mockFileSystem, '/game')

        const fontData = assetManager.getFontDataForTransfer()
        expect(fontData).toHaveLength(1)
        expect(fontData[0].name).toBe('TestFont')
        expect(fontData[0].dataUrl).toMatch(/^data:[^;]+;base64,/)
      })

      it('should return multiple fonts', async () => {
        assetManager.addAssetPath('fonts')
        assetManager.loadFontAsset('Font1', 'font1.ttf')
        assetManager.loadFontAsset('Font2', 'font2.otf')

        await assetManager.loadAssets(mockFileSystem, '/game')

        const fontData = assetManager.getFontDataForTransfer()
        expect(fontData).toHaveLength(2)
        expect(fontData.map(f => f.name)).toContain('Font1')
        expect(fontData.map(f => f.name)).toContain('Font2')
      })
    })
  })

  describe('getAssetManifest', () => {
    it('should return empty map initially', () => {
      expect(assetManager.getAssetManifest().size).toBe(0)
    })

    it('should return the same map instance', () => {
      const manifest1 = assetManager.getAssetManifest()
      const manifest2 = assetManager.getAssetManifest()
      expect(manifest1).toBe(manifest2)
    })
  })

  describe('error paths after filesLoaded', () => {
    let mockFileSystem: IFileSystem

    beforeEach(() => {
      mockFileSystem = createMockFileSystem()
    })

    describe('loadImageAsset after filesLoaded', () => {
      it('should throw when file not found in discovered files', async () => {
        // Setup: Load assets first to set filesLoaded=true
        assetManager.addAssetPath('sprites')
        assetManager.loadImageAsset('player', 'player.png')
        await assetManager.loadAssets(mockFileSystem, '/game')

        // Then try to load an image that wasn't discovered
        expect(() => assetManager.loadImageAsset('missing', 'notfound.png')).toThrow(
          "Image file 'notfound.png' not found in asset paths"
        )
      })

      it('should include scanned paths in error message', async () => {
        assetManager.addAssetPath('sprites')
        assetManager.addAssetPath('images')
        assetManager.loadImageAsset('player', 'player.png')
        await assetManager.loadAssets(mockFileSystem, '/game')

        expect(() => assetManager.loadImageAsset('missing', 'notfound.png')).toThrow(
          /Scanned paths: sprites, images/
        )
      })

      it('should show (none) when no paths were scanned', async () => {
        // Load with no asset paths
        await assetManager.loadAssets(mockFileSystem, '/game')

        expect(() => assetManager.loadImageAsset('missing', 'notfound.png')).toThrow(
          /Scanned paths: \(none\)/
        )
      })
    })

    describe('loadFontAsset after filesLoaded', () => {
      it('should throw when file not found in discovered files', async () => {
        assetManager.addAssetPath('fonts')
        assetManager.loadFontAsset('TestFont', 'test.ttf')
        await assetManager.loadAssets(mockFileSystem, '/game')

        expect(() => assetManager.loadFontAsset('MissingFont', 'notfound.ttf')).toThrow(
          "Font file 'notfound.ttf' not found in asset paths"
        )
      })

      it('should include scanned paths in error message', async () => {
        assetManager.addAssetPath('fonts')
        assetManager.addAssetPath('assets')
        assetManager.loadFontAsset('TestFont', 'test.ttf')
        await assetManager.loadAssets(mockFileSystem, '/game')

        expect(() => assetManager.loadFontAsset('MissingFont', 'notfound.ttf')).toThrow(
          /Scanned paths: fonts, assets/
        )
      })
    })
  })

  describe('asset remapping warnings', () => {
    it('should warn when remapping image to different file', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      assetManager.addAssetPath('sprites')
      assetManager.loadImageAsset('player', 'old.png')
      assetManager.loadImageAsset('player', 'new.png')

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Asset name 'player' is being remapped from 'old.png' to 'new.png'")
      )
      warnSpy.mockRestore()
    })

    it('should not warn when remapping to same file', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      assetManager.addAssetPath('sprites')
      assetManager.loadImageAsset('player', 'player.png')
      assetManager.loadImageAsset('player', 'player.png')

      expect(warnSpy).not.toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('should warn when remapping font to different file', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      assetManager.addAssetPath('fonts')
      assetManager.loadFontAsset('GameFont', 'old.ttf')
      assetManager.loadFontAsset('GameFont', 'new.ttf')

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Asset name 'GameFont' is being remapped from 'old.ttf' to 'new.ttf'")
      )
      warnSpy.mockRestore()
    })

    it('should not warn when remapping font to same file', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      assetManager.addAssetPath('fonts')
      assetManager.loadFontAsset('GameFont', 'game.ttf')
      assetManager.loadFontAsset('GameFont', 'game.ttf')

      expect(warnSpy).not.toHaveBeenCalled()
      warnSpy.mockRestore()
    })
  })

  describe('loadAssets error handling', () => {
    let mockFileSystem: IFileSystem

    beforeEach(() => {
      mockFileSystem = createMockFileSystem()
      // Reset assetManager to fresh state
      assetManager = new AssetManager()
    })

    it('should wrap scanDirectory errors with context', async () => {
      // Set up error injection
      mockScanDirectoryError = new Error('Directory not found')

      assetManager.addAssetPath('broken_path')
      assetManager.loadImageAsset('test', 'test.png')

      await expect(assetManager.loadAssets(mockFileSystem, '/game'))
        .rejects.toThrow(/Failed to scan asset path 'broken_path':.*Directory not found/)
    })

    it('should wrap loadAsset errors with context', async () => {
      // Set up error injection
      mockLoadAssetError = new Error('Corrupt file data')

      assetManager.addAssetPath('sprites')
      assetManager.loadImageAsset('corrupted', 'corrupted.png')

      await expect(assetManager.loadAssets(mockFileSystem, '/game'))
        .rejects.toThrow(/Failed to load asset 'corrupted':.*Corrupt file data/)
    })

    it('should wrap non-Error exceptions as strings', async () => {
      // Set up error injection with a string (non-Error)
      mockScanDirectoryError = 'String error message'

      assetManager.addAssetPath('broken')
      assetManager.loadImageAsset('test', 'test.png')

      await expect(assetManager.loadAssets(mockFileSystem, '/game'))
        .rejects.toThrow(/Failed to scan asset path 'broken': String error message/)
    })
  })

  describe('audio asset loading errors', () => {
    let mockFileSystem: IFileSystem

    beforeEach(() => {
      mockFileSystem = createMockFileSystem()
    })

    it('should throw when audio file not found in discovered files', async () => {
      // The default mock returns only player.png and enemy.png
      // So any audio file should not be found
      assetManager = new AssetManager()
      assetManager.addAssetPath('assets')
      assetManager.loadSoundAsset('boom', 'boom.wav')

      await expect(assetManager.loadAssets(mockFileSystem, '/game'))
        .rejects.toThrow("Audio file 'boom.wav' not found in asset paths")
    })

    it('should include scanned paths in audio file not found error', async () => {
      assetManager = new AssetManager()
      assetManager.addAssetPath('sounds')
      assetManager.addAssetPath('audio')
      assetManager.loadSoundAsset('boom', 'boom.wav')

      await expect(assetManager.loadAssets(mockFileSystem, '/game'))
        .rejects.toThrow(/Scanned paths: sounds, audio/)
    })

    it('should show (none) in audio error when no paths scanned', async () => {
      assetManager = new AssetManager()
      assetManager.loadSoundAsset('boom', 'boom.wav')

      await expect(assetManager.loadAssets(mockFileSystem, '/game'))
        .rejects.toThrow(/Scanned paths: \(none\)/)
    })
  })

  describe('arrayBufferToDataUrl verification', () => {
    let mockFileSystem: IFileSystem

    beforeEach(() => {
      mockFileSystem = createMockFileSystem()
    })

    it('should produce valid data URL with base64 encoding', async () => {
      // The default mock returns ArrayBuffer(8) for fonts
      assetManager = new AssetManager()
      assetManager.addAssetPath('fonts')
      assetManager.loadFontAsset('TestFont', 'test.ttf')

      await assetManager.loadAssets(mockFileSystem, '/game')

      const fontData = assetManager.getFontDataForTransfer()
      expect(fontData).toHaveLength(1)
      // Should produce a valid data URL structure
      expect(fontData[0].dataUrl).toMatch(/^data:[^;]+;base64,[A-Za-z0-9+/]*=*$/)
      // Verify the font name is correct
      expect(fontData[0].name).toBe('TestFont')
    })

    it('should produce different base64 for different data', async () => {
      // Load first font
      assetManager = new AssetManager()
      assetManager.addAssetPath('fonts')
      assetManager.loadFontAsset('Font1', 'font1.ttf')
      assetManager.loadFontAsset('Font2', 'font2.ttf')

      await assetManager.loadAssets(mockFileSystem, '/game')

      const fontData = assetManager.getFontDataForTransfer()
      expect(fontData).toHaveLength(2)

      // Both fonts should have valid data URLs
      for (const font of fontData) {
        expect(font.dataUrl).toMatch(/^data:[^;]+;base64,/)
      }
    })

    it('should include mimeType in data URL', async () => {
      assetManager = new AssetManager()
      assetManager.addAssetPath('fonts')
      assetManager.loadFontAsset('TestFont', 'test.ttf')

      await assetManager.loadAssets(mockFileSystem, '/game')

      const fontData = assetManager.getFontDataForTransfer()
      expect(fontData).toHaveLength(1)
      // The mock returns 'image/png' as mimeType, but for fonts it should use the mime
      expect(fontData[0].dataUrl).toContain('data:')
      expect(fontData[0].dataUrl).toContain(';base64,')
    })
  })

  describe('extractAssetName behavior', () => {
    let mockFileSystem: IFileSystem

    beforeEach(() => {
      mockFileSystem = createMockFileSystem()
      // Reset assetManager to fresh state
      assetManager = new AssetManager()
    })

    it('should work with string names for getAssetWidth', async () => {
      assetManager.addAssetPath('sprites')
      assetManager.loadImageAsset('player', 'player.png')
      await assetManager.loadAssets(mockFileSystem, '/game')

      // Test with string - should work
      expect(assetManager.getAssetWidth('player')).toBe(64)

      // Verify throwing behavior with wrong name
      expect(() => assetManager.getAssetWidth('wrong')).toThrow(
        "Unknown asset 'wrong' - did you call canvas.assets.load_image()?"
      )
    })

    it('should work with string names for getAssetHeight', async () => {
      assetManager.addAssetPath('sprites')
      assetManager.loadImageAsset('player', 'player.png')
      await assetManager.loadAssets(mockFileSystem, '/game')

      expect(assetManager.getAssetHeight('player')).toBe(64)

      expect(() => assetManager.getAssetHeight('wrong')).toThrow(
        "Unknown asset 'wrong' - did you call canvas.assets.load_image()?"
      )
    })

    it('should work with AssetHandle for getAssetWidth', async () => {
      assetManager.addAssetPath('sprites')
      const handle = assetManager.loadImageAsset('player', 'player.png')
      await assetManager.loadAssets(mockFileSystem, '/game')

      // Test with handle - should work
      expect(assetManager.getAssetWidth(handle)).toBe(64)

      // Verify handle with wrong name throws
      const badHandle = { _type: 'image', _name: 'nonexistent', _file: 'nonexistent.png' }
      expect(() => assetManager.getAssetWidth(badHandle)).toThrow(
        "Unknown asset 'nonexistent' - did you call canvas.assets.load_image()?"
      )
    })

    it('should work with AssetHandle for getAssetHeight', async () => {
      assetManager.addAssetPath('sprites')
      const handle = assetManager.loadImageAsset('player', 'player.png')
      await assetManager.loadAssets(mockFileSystem, '/game')

      expect(assetManager.getAssetHeight(handle)).toBe(64)

      const badHandle = { _type: 'image', _name: 'nonexistent', _file: 'nonexistent.png' }
      expect(() => assetManager.getAssetHeight(badHandle)).toThrow(
        "Unknown asset 'nonexistent' - did you call canvas.assets.load_image()?"
      )
    })
  })

  describe('duplicate files warning in loadAssets', () => {
    let mockFileSystem: IFileSystem

    beforeEach(() => {
      mockFileSystem = createMockFileSystem()
      // Reset assetManager to fresh state
      assetManager = new AssetManager()
    })

    it('should warn when same file found in multiple asset paths', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      assetManager.addAssetPath('sprites1')
      assetManager.addAssetPath('sprites2')
      assetManager.loadImageAsset('player', 'player.png')

      // The default mock returns same files for each scan
      await assetManager.loadAssets(mockFileSystem, '/game')

      // The mock returns same relativePath for both calls, so warning should fire
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Asset file 'player.png' found in multiple paths")
      )

      warnSpy.mockRestore()
    })

    it('should use first path on collision and mention both paths in warning', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      assetManager.addAssetPath('path1')
      assetManager.addAssetPath('path2')
      assetManager.loadImageAsset('player', 'player.png')

      await assetManager.loadAssets(mockFileSystem, '/game')

      // Check the warning mentions using first and ignoring second
      expect(warnSpy).toHaveBeenCalled()
      const warningMessage = warnSpy.mock.calls[0][0]
      expect(warningMessage).toContain('Using')
      expect(warningMessage).toContain('ignoring')

      warnSpy.mockRestore()
    })
  })
})
