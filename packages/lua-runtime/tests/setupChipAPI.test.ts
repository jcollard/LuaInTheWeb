/**
 * Tests for setupChipAPI — collection pattern access bridge functions.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupChipAPI } from '../src/setupChipAPI'
import type { ChipPlayer } from '@chip-composer/player'
import type { LuaEngine } from 'wasmoon'

// --- Helpers ---

function createMockLuaEngine(): LuaEngine & { getGlobal: (name: string) => unknown } {
  const globals = new Map<string, unknown>()
  return {
    global: {
      set: vi.fn((name: string, value: unknown) => {
        globals.set(name, value)
      }),
      get: vi.fn((name: string) => globals.get(name)),
    },
    getGlobal: (name: string) => globals.get(name),
  } as unknown as LuaEngine & { getGlobal: (name: string) => unknown }
}

/** Fake TrackerPattern-like data for testing */
function fakePatternData(tracks: number, rows: number, bpm: number) {
  return {
    bpm,
    rows: Array.from({ length: rows }, () => Array.from({ length: tracks }, () => null)),
  }
}

function createMockPlayer() {
  const loadPattern = vi.fn()
  const parseCollection = vi.fn()

  const player = {
    init: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    noteOn: vi.fn(),
    noteOff: vi.fn(),
    setTrackInstrument: vi.fn(),
    setVolume: vi.fn(),
    setGain: vi.fn(),
    loadCollection: vi.fn(),
    loadSongFile: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    seekToRow: vi.fn(),
    setBPM: vi.fn(),
    getState: vi.fn().mockReturnValue({ playing: false, currentRow: 0, bpm: 120, totalRows: 0 }),
    onRowChange: vi.fn().mockReturnValue(() => {}),
    loadInstrumentBankFromUrl: vi.fn().mockResolvedValue([]),
    setInstrumentBank: vi.fn(),
    loadPattern,
    parseCollection,
  } as unknown as ChipPlayer & {
    loadPattern: ReturnType<typeof vi.fn>
    parseCollection: ReturnType<typeof vi.fn>
  }

  return player
}

// --- Tests ---

describe('setupChipAPI — collection pattern access', () => {
  let engine: ReturnType<typeof createMockLuaEngine>
  let player: ReturnType<typeof createMockPlayer>
  let getParseCollection: () => (...args: unknown[]) => unknown
  let getPlayPattern: () => (...args: unknown[]) => unknown
  let getFreeCollection: () => (...args: unknown[]) => unknown

  beforeEach(() => {
    engine = createMockLuaEngine()
    player = createMockPlayer()

    setupChipAPI(
      engine,
      () => player,
      () => Promise.resolve(),
      () => null
    )

    getParseCollection = () => engine.getGlobal('__chip_parseCollection') as (...args: unknown[]) => unknown
    getPlayPattern = () => engine.getGlobal('__chip_playPattern') as (...args: unknown[]) => unknown
    getFreeCollection = () => engine.getGlobal('__chip_freeCollection') as (...args: unknown[]) => unknown
  })

  describe('__chip_parseCollection', () => {
    it('registers the bridge function', () => {
      expect(getParseCollection()).toBeTypeOf('function')
    })

    it('throws when player is null', () => {
      const nullEngine = createMockLuaEngine()
      setupChipAPI(nullEngine, () => null)
      const fn = nullEngine.getGlobal('__chip_parseCollection') as (yaml: string) => unknown
      expect(() => fn('yaml')).toThrow('ChipPlayer not initialized')
    })

    it('calls player.parseCollection and returns handle + metadata', () => {
      const patternData1 = fakePatternData(3, 64, 140)
      const patternData2 = fakePatternData(2, 32, 120)

      player.parseCollection.mockReturnValue({
        patterns: [
          { id: 'p1', name: 'Bass Line', data: patternData1 },
          { id: 'p2', name: 'Melody', data: patternData2 },
        ],
      })

      const result = getParseCollection()('some-yaml') as {
        handle: number
        patterns: Array<{ name: string; id: string; tracks: number; rows: number; bpm: number }>
      }

      expect(player.parseCollection).toHaveBeenCalledWith('some-yaml')
      expect(result.handle).toBeTypeOf('number')
      expect(result.patterns).toHaveLength(2)
      expect(result.patterns[0]).toEqual({
        name: 'Bass Line',
        id: 'p1',
        tracks: 3,
        rows: 64,
        bpm: 140,
      })
      expect(result.patterns[1]).toEqual({
        name: 'Melody',
        id: 'p2',
        tracks: 2,
        rows: 32,
        bpm: 120,
      })
    })

    it('assigns unique handles for each call', () => {
      player.parseCollection.mockReturnValue({ patterns: [] })

      const r1 = getParseCollection()('yaml1') as { handle: number }
      const r2 = getParseCollection()('yaml2') as { handle: number }
      expect(r1.handle).not.toBe(r2.handle)
    })

    it('returns 0 tracks when pattern rows are empty', () => {
      player.parseCollection.mockReturnValue({
        patterns: [{ id: 'p1', name: 'Empty', data: { bpm: 120, rows: [] } }],
      })

      const result = getParseCollection()('yaml') as {
        patterns: Array<{ tracks: number; rows: number }>
      }
      expect(result.patterns[0].tracks).toBe(0)
      expect(result.patterns[0].rows).toBe(0)
    })
  })

  describe('__chip_playPattern', () => {
    it('registers the bridge function', () => {
      expect(getPlayPattern()).toBeTypeOf('function')
    })

    it('loads the correct pattern from a parsed collection', () => {
      const patternData = fakePatternData(4, 64, 140)
      player.parseCollection.mockReturnValue({
        patterns: [
          { id: 'p1', name: 'First', data: fakePatternData(2, 16, 120) },
          { id: 'p2', name: 'Second', data: patternData },
        ],
      })

      const result = getParseCollection()('yaml') as { handle: number }
      getPlayPattern()(result.handle, 1) // 0-based index — second pattern

      expect(player.loadPattern).toHaveBeenCalledWith(patternData)
    })

    it('throws for invalid collection handle', () => {
      expect(() => getPlayPattern()(999, 0)).toThrow('Invalid collection handle: 999')
    })

    it('throws for out-of-range pattern index', () => {
      player.parseCollection.mockReturnValue({
        patterns: [{ id: 'p1', name: 'Only', data: fakePatternData(1, 8, 120) }],
      })
      const result = getParseCollection()('yaml') as { handle: number }

      expect(() => getPlayPattern()(result.handle, 5)).toThrow('Pattern index 5 out of range')
    })

    it('throws when player is null during playPattern', () => {
      // Set up a separate engine where we can null out the player
      const nullEngine = createMockLuaEngine()
      let playerRef: ChipPlayer | null = player
      setupChipAPI(nullEngine, () => playerRef)
      const nullParseCollection = nullEngine.getGlobal('__chip_parseCollection') as (yaml: string) => { handle: number }
      player.parseCollection.mockReturnValue({
        patterns: [{ id: 'p1', name: 'Test', data: fakePatternData(1, 8, 120) }],
      })
      const r2 = nullParseCollection('yaml')

      playerRef = null
      const playPattern = nullEngine.getGlobal('__chip_playPattern') as (h: number, i: number) => void
      expect(() => playPattern(r2.handle, 0)).toThrow('ChipPlayer not initialized')
    })
  })

  describe('__chip_freeCollection', () => {
    it('registers the bridge function', () => {
      expect(getFreeCollection()).toBeTypeOf('function')
    })

    it('frees a collection so playPattern throws after', () => {
      player.parseCollection.mockReturnValue({
        patterns: [{ id: 'p1', name: 'Test', data: fakePatternData(1, 8, 120) }],
      })
      const result = getParseCollection()('yaml') as { handle: number }

      // Free the collection
      getFreeCollection()(result.handle)

      // Now playPattern should fail
      expect(() => getPlayPattern()(result.handle, 0)).toThrow('Invalid collection handle')
    })

    it('does not throw when freeing a non-existent handle', () => {
      expect(() => getFreeCollection()(999)).not.toThrow()
    })
  })
})

describe('setupChipAPI — registers all expected bridge functions', () => {
  it('registers collection bridge functions', () => {
    const engine = createMockLuaEngine()
    const player = createMockPlayer()

    setupChipAPI(engine, () => player)

    expect(engine.getGlobal('__chip_parseCollection')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_playPattern')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_freeCollection')).toBeTypeOf('function')
  })

  it('registers core bridge functions', () => {
    const engine = createMockLuaEngine()
    setupChipAPI(engine, () => null)

    // Lifecycle
    expect(engine.getGlobal('__chip_init')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_initAndLoadBank')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_isReady')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_destroy')).toBeTypeOf('function')

    // Note control
    expect(engine.getGlobal('__chip_noteOn')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_noteOff')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_setInstrument')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_allNotesOff')).toBeTypeOf('function')

    // Volume
    expect(engine.getGlobal('__chip_setVolume')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_setGain')).toBeTypeOf('function')

    // File loading
    expect(engine.getGlobal('__chip_loadCollection')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_loadSongFile')).toBeTypeOf('function')

    // Playback
    expect(engine.getGlobal('__chip_play')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_pause')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_stop')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_seekToRow')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_setBPM')).toBeTypeOf('function')

    // State
    expect(engine.getGlobal('__chip_getState')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_onRowChange')).toBeTypeOf('function')

    // Bank
    expect(engine.getGlobal('__chip_loadBankFromUrl')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_setInstrumentBank')).toBeTypeOf('function')

    // Pattern builder
    expect(engine.getGlobal('__chip_buildPattern')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_patternSetNote')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_patternSetNoteOff')).toBeTypeOf('function')
    expect(engine.getGlobal('__chip_patternBuild')).toBeTypeOf('function')
  })
})
