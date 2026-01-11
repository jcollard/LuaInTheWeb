/**
 * Tests for CanvasController audio functionality.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CanvasController, CanvasCallbacks } from '../src/CanvasController'

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
  addPath(...args: unknown[]) { this.commands.push(['addPath', ...args]) }
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
    FontCache: class MockFontCache {
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
      scanDirectory = vi.fn().mockReturnValue([])
    },
    VALID_IMAGE_EXTENSIONS: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'],
    VALID_FONT_EXTENSIONS: ['.ttf', '.otf', '.woff', '.woff2'],
    VALID_AUDIO_EXTENSIONS: ['.mp3', '.wav', '.ogg'],
    isAssetHandle: (value: unknown): boolean => {
      return typeof value === 'object' &&
        value !== null &&
        '_type' in value &&
        '_name' in value &&
        '_file' in value
    },
    isAudioAssetHandle: (value: unknown): boolean => {
      return typeof value === 'object' &&
        value !== null &&
        '_type' in value &&
        '_name' in value &&
        '_file' in value &&
        ((value as { _type: string })._type === 'sound' || (value as { _type: string })._type === 'music')
    },
  }
})

// Import the isAudioAssetHandle after mocking
import { isAudioAssetHandle } from '@lua-learning/canvas-runtime'

describe('CanvasController Audio', () => {
  let controller: CanvasController
  let mockCallbacks: CanvasCallbacks
  let mockCanvas: HTMLCanvasElement

  beforeEach(() => {
    // Create mock canvas
    mockCanvas = document.createElement('canvas')
    mockCanvas.width = 800
    mockCanvas.height = 600

    // Create mock callbacks
    mockCallbacks = {
      onRequestCanvasTab: vi.fn().mockResolvedValue(mockCanvas),
      onCloseCanvasTab: vi.fn(),
      onError: vi.fn(),
    }

    controller = new CanvasController(mockCallbacks)
  })

  afterEach(() => {
    if (controller?.isActive()) {
      controller.stop()
    }
    vi.clearAllMocks()
  })

  describe('loadSoundAsset', () => {
    it('returns an AudioAssetHandle with type sound', () => {
      const handle = controller.loadSoundAsset('explosion', 'explosion.wav')

      expect(handle).toEqual({
        _type: 'sound',
        _name: 'explosion',
        _file: 'explosion.wav',
      })
      expect(isAudioAssetHandle(handle)).toBe(true)
      expect(handle._type).toBe('sound')
    })

    it('can be called multiple times with different sounds', () => {
      const handle1 = controller.loadSoundAsset('explosion', 'explosion.wav')
      const handle2 = controller.loadSoundAsset('jump', 'jump.mp3')

      expect(handle1._name).toBe('explosion')
      expect(handle2._name).toBe('jump')
    })
  })

  describe('loadMusicAsset', () => {
    it('returns an AudioAssetHandle with type music', () => {
      const handle = controller.loadMusicAsset('background', 'music.mp3')

      expect(handle).toEqual({
        _type: 'music',
        _name: 'background',
        _file: 'music.mp3',
      })
      expect(isAudioAssetHandle(handle)).toBe(true)
      expect(handle._type).toBe('music')
    })

    it('can be called multiple times with different music', () => {
      const handle1 = controller.loadMusicAsset('menu', 'menu-music.mp3')
      const handle2 = controller.loadMusicAsset('game', 'game-music.ogg')

      expect(handle1._name).toBe('menu')
      expect(handle2._name).toBe('game')
    })
  })

  describe('getAudioEngine', () => {
    it('returns null before start()', () => {
      expect(controller.getAudioEngine()).toBeNull()
    })
  })

  describe('audio asset manifest', () => {
    it('tracks sound assets in the audio manifest', () => {
      controller.loadSoundAsset('explosion', 'explosion.wav')
      controller.loadSoundAsset('jump', 'jump.mp3')

      const manifest = controller.getAudioAssetManifest()
      expect(manifest.size).toBe(2)
      expect(manifest.get('explosion')).toEqual({
        name: 'explosion',
        filename: 'explosion.wav',
        type: 'sound',
      })
      expect(manifest.get('jump')).toEqual({
        name: 'jump',
        filename: 'jump.mp3',
        type: 'sound',
      })
    })

    it('tracks music assets in the audio manifest', () => {
      controller.loadMusicAsset('background', 'music.mp3')

      const manifest = controller.getAudioAssetManifest()
      expect(manifest.size).toBe(1)
      expect(manifest.get('background')).toEqual({
        name: 'background',
        filename: 'music.mp3',
        type: 'music',
      })
    })

    it('handles mix of sound and music assets', () => {
      controller.loadSoundAsset('click', 'click.wav')
      controller.loadMusicAsset('theme', 'theme.mp3')
      controller.loadSoundAsset('beep', 'beep.ogg')

      const manifest = controller.getAudioAssetManifest()
      expect(manifest.size).toBe(3)
      expect(manifest.get('click')?.type).toBe('sound')
      expect(manifest.get('theme')?.type).toBe('music')
      expect(manifest.get('beep')?.type).toBe('sound')
    })
  })
})
