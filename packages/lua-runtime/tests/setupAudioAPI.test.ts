/**
 * Integration tests for setupAudioAPI.
 * Tests the Lua bindings for audio functions.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupAudioAPI } from '../src/setupAudioAPI'
import type { IAudioEngine, MusicHandle } from '../src/audio/IAudioEngine'
import type { LuaEngine } from 'wasmoon'

// Create a mock Lua engine
function createMockLuaEngine(): LuaEngine {
  const globals = new Map<string, unknown>()

  return {
    global: {
      set: vi.fn((name: string, value: unknown) => {
        globals.set(name, value)
      }),
      get: vi.fn((name: string) => globals.get(name)),
    },
  } as unknown as LuaEngine
}

// Create a mock audio engine
function createMockAudioEngine(): IAudioEngine {
  let masterVolume = 1
  let muted = false
  let musicPlaying = false
  const musicTime = 0
  const musicDuration = 10

  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    isInitialized: vi.fn().mockReturnValue(true),
    decodeAudio: vi.fn().mockResolvedValue(undefined),
    hasAudio: vi.fn().mockReturnValue(true),
    playSound: vi.fn(),
    getSoundDuration: vi.fn().mockReturnValue(2.5),
    playMusic: vi.fn().mockImplementation(() => {
      musicPlaying = true
      return {} as MusicHandle
    }),
    stopMusic: vi.fn().mockImplementation(() => {
      musicPlaying = false
    }),
    pauseMusic: vi.fn().mockImplementation(() => {
      musicPlaying = false
    }),
    resumeMusic: vi.fn().mockImplementation(() => {
      musicPlaying = true
    }),
    setMusicVolume: vi.fn(),
    isMusicPlaying: vi.fn().mockImplementation(() => musicPlaying),
    getMusicTime: vi.fn().mockImplementation(() => musicTime),
    getMusicDuration: vi.fn().mockImplementation(() => musicDuration),
    setMasterVolume: vi.fn().mockImplementation((vol: number) => {
      masterVolume = vol
    }),
    getMasterVolume: vi.fn().mockImplementation(() => masterVolume),
    mute: vi.fn().mockImplementation(() => {
      muted = true
    }),
    unmute: vi.fn().mockImplementation(() => {
      muted = false
    }),
    isMuted: vi.fn().mockImplementation(() => muted),
    dispose: vi.fn(),
  }
}

describe('setupAudioAPI', () => {
  let mockEngine: LuaEngine
  let mockAudioEngine: IAudioEngine

  beforeEach(() => {
    mockEngine = createMockLuaEngine()
    mockAudioEngine = createMockAudioEngine()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('registers all audio global functions', () => {
    setupAudioAPI(mockEngine, () => mockAudioEngine)

    // Check that all expected functions are registered
    expect(mockEngine.global.set).toHaveBeenCalledWith('__audio_playSound', expect.any(Function))
    expect(mockEngine.global.set).toHaveBeenCalledWith('__audio_getSoundDuration', expect.any(Function))
    expect(mockEngine.global.set).toHaveBeenCalledWith('__audio_playMusic', expect.any(Function))
    expect(mockEngine.global.set).toHaveBeenCalledWith('__audio_stopMusic', expect.any(Function))
    expect(mockEngine.global.set).toHaveBeenCalledWith('__audio_pauseMusic', expect.any(Function))
    expect(mockEngine.global.set).toHaveBeenCalledWith('__audio_resumeMusic', expect.any(Function))
    expect(mockEngine.global.set).toHaveBeenCalledWith('__audio_setMusicVolume', expect.any(Function))
    expect(mockEngine.global.set).toHaveBeenCalledWith('__audio_isMusicPlaying', expect.any(Function))
    expect(mockEngine.global.set).toHaveBeenCalledWith('__audio_getMusicTime', expect.any(Function))
    expect(mockEngine.global.set).toHaveBeenCalledWith('__audio_getMusicDuration', expect.any(Function))
    expect(mockEngine.global.set).toHaveBeenCalledWith('__audio_setMasterVolume', expect.any(Function))
    expect(mockEngine.global.set).toHaveBeenCalledWith('__audio_getMasterVolume', expect.any(Function))
    expect(mockEngine.global.set).toHaveBeenCalledWith('__audio_mute', expect.any(Function))
    expect(mockEngine.global.set).toHaveBeenCalledWith('__audio_unmute', expect.any(Function))
    expect(mockEngine.global.set).toHaveBeenCalledWith('__audio_isMuted', expect.any(Function))
  })

  describe('__audio_playSound', () => {
    it('calls playSound with string name and default volume', () => {
      setupAudioAPI(mockEngine, () => mockAudioEngine)

      const playSound = (mockEngine.global.set as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === '__audio_playSound'
      )?.[1] as (name: unknown, volume?: number) => void

      playSound('explosion')

      expect(mockAudioEngine.playSound).toHaveBeenCalledWith('explosion', 1)
    })

    it('calls playSound with custom volume', () => {
      setupAudioAPI(mockEngine, () => mockAudioEngine)

      const playSound = (mockEngine.global.set as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === '__audio_playSound'
      )?.[1] as (name: unknown, volume?: number) => void

      playSound('explosion', 0.5)

      expect(mockAudioEngine.playSound).toHaveBeenCalledWith('explosion', 0.5)
    })

    it('extracts name from AudioAssetHandle', () => {
      setupAudioAPI(mockEngine, () => mockAudioEngine)

      const playSound = (mockEngine.global.set as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === '__audio_playSound'
      )?.[1] as (name: unknown, volume?: number) => void

      const handle = { _type: 'sound', _name: 'boom', _file: 'boom.wav' }
      playSound(handle, 0.8)

      expect(mockAudioEngine.playSound).toHaveBeenCalledWith('boom', 0.8)
    })
  })

  describe('__audio_playMusic', () => {
    it('calls playMusic with options', () => {
      setupAudioAPI(mockEngine, () => mockAudioEngine)

      const playMusic = (mockEngine.global.set as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === '__audio_playMusic'
      )?.[1] as (name: unknown, volume?: number, loop?: boolean) => void

      playMusic('background', 0.7, true)

      expect(mockAudioEngine.playMusic).toHaveBeenCalledWith('background', {
        volume: 0.7,
        loop: true,
      })
    })

    it('uses default values when options not provided', () => {
      setupAudioAPI(mockEngine, () => mockAudioEngine)

      const playMusic = (mockEngine.global.set as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === '__audio_playMusic'
      )?.[1] as (name: unknown, volume?: number, loop?: boolean) => void

      playMusic('theme')

      expect(mockAudioEngine.playMusic).toHaveBeenCalledWith('theme', {
        volume: 1,
        loop: false,
      })
    })
  })

  describe('music control functions', () => {
    it('stopMusic calls audio engine', () => {
      setupAudioAPI(mockEngine, () => mockAudioEngine)

      const stopMusic = (mockEngine.global.set as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === '__audio_stopMusic'
      )?.[1] as () => void

      stopMusic()

      expect(mockAudioEngine.stopMusic).toHaveBeenCalled()
    })

    it('pauseMusic calls audio engine', () => {
      setupAudioAPI(mockEngine, () => mockAudioEngine)

      const pauseMusic = (mockEngine.global.set as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === '__audio_pauseMusic'
      )?.[1] as () => void

      pauseMusic()

      expect(mockAudioEngine.pauseMusic).toHaveBeenCalled()
    })

    it('resumeMusic calls audio engine', () => {
      setupAudioAPI(mockEngine, () => mockAudioEngine)

      const resumeMusic = (mockEngine.global.set as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === '__audio_resumeMusic'
      )?.[1] as () => void

      resumeMusic()

      expect(mockAudioEngine.resumeMusic).toHaveBeenCalled()
    })
  })

  describe('volume control functions', () => {
    it('setMasterVolume calls audio engine', () => {
      setupAudioAPI(mockEngine, () => mockAudioEngine)

      const setMasterVolume = (mockEngine.global.set as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === '__audio_setMasterVolume'
      )?.[1] as (volume: number) => void

      setMasterVolume(0.5)

      expect(mockAudioEngine.setMasterVolume).toHaveBeenCalledWith(0.5)
    })

    it('getMasterVolume returns value from audio engine', () => {
      setupAudioAPI(mockEngine, () => mockAudioEngine)

      const getMasterVolume = (mockEngine.global.set as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === '__audio_getMasterVolume'
      )?.[1] as () => number

      const result = getMasterVolume()

      expect(result).toBe(1)
    })
  })

  describe('mute functions', () => {
    it('mute calls audio engine', () => {
      setupAudioAPI(mockEngine, () => mockAudioEngine)

      const mute = (mockEngine.global.set as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === '__audio_mute'
      )?.[1] as () => void

      mute()

      expect(mockAudioEngine.mute).toHaveBeenCalled()
    })

    it('unmute calls audio engine', () => {
      setupAudioAPI(mockEngine, () => mockAudioEngine)

      const unmute = (mockEngine.global.set as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === '__audio_unmute'
      )?.[1] as () => void

      unmute()

      expect(mockAudioEngine.unmute).toHaveBeenCalled()
    })

    it('isMuted returns value from audio engine', () => {
      setupAudioAPI(mockEngine, () => mockAudioEngine)

      const isMuted = (mockEngine.global.set as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === '__audio_isMuted'
      )?.[1] as () => boolean

      expect(isMuted()).toBe(false)

      mockAudioEngine.mute()
      expect(isMuted()).toBe(true)
    })
  })

  describe('when audio engine is null', () => {
    it('playSound does nothing', () => {
      setupAudioAPI(mockEngine, () => null)

      const playSound = (mockEngine.global.set as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === '__audio_playSound'
      )?.[1] as (name: unknown, volume?: number) => void

      // Should not throw
      expect(() => playSound('explosion')).not.toThrow()
    })

    it('getSoundDuration returns 0', () => {
      setupAudioAPI(mockEngine, () => null)

      const getSoundDuration = (mockEngine.global.set as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === '__audio_getSoundDuration'
      )?.[1] as (name: unknown) => number

      expect(getSoundDuration('explosion')).toBe(0)
    })

    it('getMasterVolume returns 1', () => {
      setupAudioAPI(mockEngine, () => null)

      const getMasterVolume = (mockEngine.global.set as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === '__audio_getMasterVolume'
      )?.[1] as () => number

      expect(getMasterVolume()).toBe(1)
    })

    it('isMuted returns false', () => {
      setupAudioAPI(mockEngine, () => null)

      const isMuted = (mockEngine.global.set as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === '__audio_isMuted'
      )?.[1] as () => boolean

      expect(isMuted()).toBe(false)
    })
  })
})
