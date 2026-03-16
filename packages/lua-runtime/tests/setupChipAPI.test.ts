/**
 * Tests for setupChipAPI — all chip bridge functions.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupChipAPI } from '../src/setupChipAPI'
import type { ChipPlayer } from '@chip-composer/player'
import type { LuaEngine } from 'wasmoon'

// --- Helpers ---

type MockEngine = LuaEngine & { getGlobal: (name: string) => unknown }

function createMockLuaEngine(): MockEngine {
  const globals = new Map<string, unknown>()
  return {
    global: {
      set: vi.fn((name: string, value: unknown) => {
        globals.set(name, value)
      }),
      get: vi.fn((name: string) => globals.get(name)),
    },
    getGlobal: (name: string) => globals.get(name),
  } as unknown as MockEngine
}

function fakePatternData(tracks: number, rows: number, bpm: number) {
  return {
    bpm,
    rows: Array.from({ length: rows }, () => Array.from({ length: tracks }, () => null)),
  }
}

function createMockPlayer() {
  return {
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
    loadPattern: vi.fn(),
    parseCollection: vi.fn(),
  } as unknown as ChipPlayer & Record<string, ReturnType<typeof vi.fn>>
}

function createMockPatternBuilder() {
  const builder = {
    setNote: vi.fn(),
    setNoteOff: vi.fn(),
    build: vi.fn().mockReturnValue({ bpm: 120, rows: [] }),
  }
  // Must be a real constructor (class/function), not an arrow fn
  function MockPatternBuilder() { return builder }
  const Ctor = vi.fn().mockImplementation(MockPatternBuilder)
  return { Ctor, builder }
}

/** Helper to get a typed bridge function from the engine */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getBridge<T = (...args: any[]) => any>(engine: MockEngine, name: string): T {
  return engine.getGlobal(name) as T
}

// --- Tests ---

describe('setupChipAPI', () => {
  let engine: MockEngine
  let player: ReturnType<typeof createMockPlayer>

  beforeEach(() => {
    engine = createMockLuaEngine()
    player = createMockPlayer()
  })

  describe('registration', () => {
    it('registers all expected bridge functions', () => {
      setupChipAPI(engine, () => null)

      const expected = [
        '__chip_init', '__chip_initAndLoadBank', '__chip_isReady', '__chip_destroy',
        '__chip_noteOn', '__chip_noteOff', '__chip_setInstrument', '__chip_allNotesOff',
        '__chip_setVolume', '__chip_setGain',
        '__chip_loadCollection', '__chip_loadSongFile',
        '__chip_play', '__chip_pause', '__chip_stop', '__chip_seekToRow', '__chip_setBPM',
        '__chip_getState', '__chip_onRowChange',
        '__chip_loadBankFromUrl', '__chip_setInstrumentBank',
        '__chip_parseCollection', '__chip_playPattern', '__chip_freeCollection',
        '__chip_buildPattern', '__chip_patternSetNote', '__chip_patternSetNoteOff', '__chip_patternBuild',
      ]
      for (const name of expected) {
        expect(engine.getGlobal(name), `${name} should be registered`).toBeTypeOf('function')
      }
    })
  })

  describe('lifecycle', () => {
    it('__chip_isReady returns false before init', () => {
      setupChipAPI(engine, () => player, () => Promise.resolve(), () => null)
      const isReady = getBridge<() => boolean>(engine, '__chip_isReady')
      expect(isReady()).toBe(false)
    })

    it('__chip_isReady returns false when player is null', () => {
      setupChipAPI(engine, () => null)
      const isReady = getBridge<() => boolean>(engine, '__chip_isReady')
      expect(isReady()).toBe(false)
    })

    it('__chip_isReady returns false when patternBuilder is null', () => {
      setupChipAPI(engine, () => player, () => Promise.resolve(), () => null)
      // initComplete is false, so still false
      const isReady = getBridge<() => boolean>(engine, '__chip_isReady')
      expect(isReady()).toBe(false)
    })

    it('__chip_destroy calls player.destroy', async () => {
      setupChipAPI(engine, () => player)
      const destroy = getBridge<() => Promise<void>>(engine, '__chip_destroy')
      await destroy()
      expect(player.destroy).toHaveBeenCalled()
    })

    it('__chip_destroy does nothing when player is null', async () => {
      setupChipAPI(engine, () => null)
      const destroy = getBridge<() => Promise<void>>(engine, '__chip_destroy')
      await destroy() // should not throw
    })

    it('__chip_initAndLoadBank sets initComplete and calls player.init', async () => {
      // Mock fetch for loadBankIntoPlayer
      player.setTrackInstrument.mockImplementation(() => { /* bank "already loaded" */ })
      const { Ctor } = createMockPatternBuilder()
      setupChipAPI(engine, () => player, () => Promise.resolve(), () => Ctor)

      const initAndLoad = getBridge<() => Promise<void>>(engine, '__chip_initAndLoadBank')
      await initAndLoad()

      expect(player.init).toHaveBeenCalled()

      const isReady = getBridge<() => boolean>(engine, '__chip_isReady')
      expect(isReady()).toBe(true)
    })

    it('__chip_initAndLoadBank returns early when player is null', async () => {
      setupChipAPI(engine, () => null, () => Promise.resolve())
      const initAndLoad = getBridge<() => Promise<void>>(engine, '__chip_initAndLoadBank')
      await initAndLoad() // should not throw
    })
  })

  describe('note control', () => {
    beforeEach(() => {
      setupChipAPI(engine, () => player)
    })

    it('__chip_noteOn calls player.noteOn with default velocity 64', () => {
      const noteOn = getBridge<(t: number, n: number, v?: number | null) => void>(engine, '__chip_noteOn')
      noteOn(0, 60, null)
      expect(player.noteOn).toHaveBeenCalledWith(0, 60, 64)
    })

    it('__chip_noteOn passes explicit velocity', () => {
      const noteOn = getBridge<(t: number, n: number, v?: number) => void>(engine, '__chip_noteOn')
      noteOn(1, 72, 100)
      expect(player.noteOn).toHaveBeenCalledWith(1, 72, 100)
    })

    it('__chip_noteOn does nothing when player is null', () => {
      const nullEngine = createMockLuaEngine()
      setupChipAPI(nullEngine, () => null)
      const noteOn = getBridge<(t: number, n: number) => void>(nullEngine, '__chip_noteOn')
      noteOn(0, 60) // should not throw
    })

    it('__chip_noteOff calls player.noteOff', () => {
      const noteOff = getBridge<(t: number, n: number) => void>(engine, '__chip_noteOff')
      noteOff(2, 48)
      expect(player.noteOff).toHaveBeenCalledWith(2, 48)
    })

    it('__chip_setInstrument calls player.setTrackInstrument', () => {
      const setInst = getBridge<(t: number, id: number) => void>(engine, '__chip_setInstrument')
      setInst(0, 73)
      expect(player.setTrackInstrument).toHaveBeenCalledWith(0, 73)
    })

    it('__chip_allNotesOff sends noteOff for all 18 tracks x 128 notes', () => {
      const allOff = getBridge<() => void>(engine, '__chip_allNotesOff')
      allOff()
      expect(player.noteOff).toHaveBeenCalledTimes(18 * 128)
      // Spot check first and last
      expect(player.noteOff).toHaveBeenCalledWith(0, 0)
      expect(player.noteOff).toHaveBeenCalledWith(17, 127)
    })
  })

  describe('volume / effects', () => {
    beforeEach(() => {
      setupChipAPI(engine, () => player)
    })

    it('__chip_setVolume calls player.setVolume', () => {
      getBridge<(v: number) => void>(engine, '__chip_setVolume')(0.75)
      expect(player.setVolume).toHaveBeenCalledWith(0.75)
    })

    it('__chip_setGain calls player.setGain', () => {
      getBridge<(g: number) => void>(engine, '__chip_setGain')(2.0)
      expect(player.setGain).toHaveBeenCalledWith(2.0)
    })

    it('volume/gain do nothing when player is null', () => {
      const nullEngine = createMockLuaEngine()
      setupChipAPI(nullEngine, () => null)
      getBridge<(v: number) => void>(nullEngine, '__chip_setVolume')(0.5)
      getBridge<(g: number) => void>(nullEngine, '__chip_setGain')(1.5)
      // no throw
    })
  })

  describe('file loading', () => {
    beforeEach(() => {
      setupChipAPI(engine, () => player)
    })

    it('__chip_loadCollection calls player.loadCollection with yaml and index', () => {
      const load = getBridge<(y: string, i?: number | null) => void>(engine, '__chip_loadCollection')
      load('yaml-data', 2)
      expect(player.loadCollection).toHaveBeenCalledWith('yaml-data', 2)
    })

    it('__chip_loadCollection defaults songIndex to undefined when null', () => {
      const load = getBridge<(y: string, i?: number | null) => void>(engine, '__chip_loadCollection')
      load('yaml-data', null)
      expect(player.loadCollection).toHaveBeenCalledWith('yaml-data', undefined)
    })

    it('__chip_loadCollection throws when player is null', () => {
      const nullEngine = createMockLuaEngine()
      setupChipAPI(nullEngine, () => null)
      const load = getBridge<(y: string) => void>(nullEngine, '__chip_loadCollection')
      expect(() => load('yaml')).toThrow('ChipPlayer not initialized')
    })

    it('__chip_loadSongFile calls player.loadSongFile', () => {
      const load = getBridge<(y: string) => void>(engine, '__chip_loadSongFile')
      load('song-yaml')
      expect(player.loadSongFile).toHaveBeenCalledWith('song-yaml')
    })

    it('__chip_loadSongFile throws when player is null', () => {
      const nullEngine = createMockLuaEngine()
      setupChipAPI(nullEngine, () => null)
      const load = getBridge<(y: string) => void>(nullEngine, '__chip_loadSongFile')
      expect(() => load('yaml')).toThrow('ChipPlayer not initialized')
    })
  })

  describe('playback control', () => {
    beforeEach(() => {
      setupChipAPI(engine, () => player)
    })

    it('__chip_play calls player.play with loop true by default', () => {
      getBridge<(loop?: boolean | null) => void>(engine, '__chip_play')(null)
      expect(player.play).toHaveBeenCalledWith({ loop: true })
    })

    it('__chip_play passes explicit loop=false', () => {
      getBridge<(loop?: boolean) => void>(engine, '__chip_play')(false)
      expect(player.play).toHaveBeenCalledWith({ loop: false })
    })

    it('__chip_pause calls player.pause', () => {
      getBridge<() => void>(engine, '__chip_pause')()
      expect(player.pause).toHaveBeenCalled()
    })

    it('__chip_stop calls player.stop', () => {
      getBridge<() => void>(engine, '__chip_stop')()
      expect(player.stop).toHaveBeenCalled()
    })

    it('__chip_seekToRow calls player.seekToRow', () => {
      getBridge<(r: number) => void>(engine, '__chip_seekToRow')(42)
      expect(player.seekToRow).toHaveBeenCalledWith(42)
    })

    it('__chip_setBPM calls player.setBPM', () => {
      getBridge<(b: number) => void>(engine, '__chip_setBPM')(160)
      expect(player.setBPM).toHaveBeenCalledWith(160)
    })

    it('playback functions do nothing when player is null', () => {
      const nullEngine = createMockLuaEngine()
      setupChipAPI(nullEngine, () => null)
      getBridge<() => void>(nullEngine, '__chip_play')()
      getBridge<() => void>(nullEngine, '__chip_pause')()
      getBridge<() => void>(nullEngine, '__chip_stop')()
      getBridge<(r: number) => void>(nullEngine, '__chip_seekToRow')(0)
      getBridge<(b: number) => void>(nullEngine, '__chip_setBPM')(120)
      // no throw
    })
  })

  describe('state query', () => {
    it('__chip_getState returns player state', () => {
      setupChipAPI(engine, () => player)
      const state = getBridge<() => unknown>(engine, '__chip_getState')()
      expect(state).toEqual({ playing: false, currentRow: 0, bpm: 120, totalRows: 0 })
      expect(player.getState).toHaveBeenCalled()
    })

    it('__chip_getState returns null when player is null', () => {
      setupChipAPI(engine, () => null)
      const state = getBridge<() => unknown>(engine, '__chip_getState')()
      expect(state).toBeNull()
    })
  })

  describe('event subscriptions', () => {
    it('__chip_onRowChange calls player.onRowChange and returns unsub', () => {
      const unsub = vi.fn()
      player.onRowChange.mockReturnValue(unsub)
      setupChipAPI(engine, () => player)

      const cb = () => {}
      const result = getBridge<(cb: () => void) => () => void>(engine, '__chip_onRowChange')(cb)
      expect(player.onRowChange).toHaveBeenCalledWith(cb)
      expect(result).toBe(unsub)
    })

    it('__chip_onRowChange returns noop when player is null', () => {
      setupChipAPI(engine, () => null)
      const result = getBridge<(cb: () => void) => () => void>(engine, '__chip_onRowChange')(() => {})
      expect(result).toBeTypeOf('function')
      result() // should not throw
    })
  })

  describe('instrument bank', () => {
    beforeEach(() => {
      setupChipAPI(engine, () => player)
    })

    it('__chip_loadBankFromUrl calls player.loadInstrumentBankFromUrl', async () => {
      const load = getBridge<(url: string) => Promise<void>>(engine, '__chip_loadBankFromUrl')
      await load('/my-bank.json')
      expect(player.loadInstrumentBankFromUrl).toHaveBeenCalledWith('/my-bank.json')
    })

    it('__chip_setInstrumentBank calls player.setInstrumentBank', () => {
      const data = [{ id: 0, name: 'Piano' }]
      getBridge<(d: unknown) => void>(engine, '__chip_setInstrumentBank')(data)
      expect(player.setInstrumentBank).toHaveBeenCalledWith(data)
    })

    it('bank functions do nothing when player is null', async () => {
      const nullEngine = createMockLuaEngine()
      setupChipAPI(nullEngine, () => null)
      await getBridge<(url: string) => Promise<void>>(nullEngine, '__chip_loadBankFromUrl')('/x')
      getBridge<(d: unknown) => void>(nullEngine, '__chip_setInstrumentBank')([])
      // no throw
    })
  })

  describe('pattern builder', () => {
    it('__chip_buildPattern creates a builder and returns a handle', () => {
      const { Ctor } = createMockPatternBuilder()
      setupChipAPI(engine, () => player, undefined, () => Ctor)

      const handle = getBridge<(t: number, r: number, b?: number) => number>(engine, '__chip_buildPattern')(2, 16, 140)
      expect(Ctor).toHaveBeenCalledWith(2, 16, 140)
      expect(handle).toBeTypeOf('number')
    })

    it('__chip_buildPattern defaults bpm to 120 when null', () => {
      const { Ctor } = createMockPatternBuilder()
      setupChipAPI(engine, () => player, undefined, () => Ctor)

      getBridge<(t: number, r: number, b?: number | null) => number>(engine, '__chip_buildPattern')(1, 8, null)
      expect(Ctor).toHaveBeenCalledWith(1, 8, 120)
    })

    it('__chip_buildPattern throws when patternBuilder not available', () => {
      setupChipAPI(engine, () => player, undefined, () => null)
      const build = getBridge<(t: number, r: number) => number>(engine, '__chip_buildPattern')
      expect(() => build(1, 8)).toThrow('chip.init() must be called before chip.pattern()')
    })

    it('__chip_patternSetNote calls builder.setNote with optional fields', () => {
      const { Ctor, builder } = createMockPatternBuilder()
      setupChipAPI(engine, () => player, undefined, () => Ctor)

      const handle = getBridge<(t: number, r: number) => number>(engine, '__chip_buildPattern')(1, 16)
      const setNote = getBridge<(h: number, r: number, t: number, n: number, i?: number | null, v?: number | null, e?: string | null) => void>(engine, '__chip_patternSetNote')

      setNote(handle, 0, 0, 60, 5, 100, 'EC8')
      expect(builder.setNote).toHaveBeenCalledWith(0, 0, 60, { instrument: 5, velocity: 100, effect: 'EC8' })
    })

    it('__chip_patternSetNote omits null optional fields', () => {
      const { Ctor, builder } = createMockPatternBuilder()
      setupChipAPI(engine, () => player, undefined, () => Ctor)

      const handle = getBridge<(t: number, r: number) => number>(engine, '__chip_buildPattern')(1, 16)
      getBridge<(h: number, r: number, t: number, n: number, i?: null, v?: null, e?: null) => void>(engine, '__chip_patternSetNote')(handle, 4, 0, 72, null, null, null)
      expect(builder.setNote).toHaveBeenCalledWith(4, 0, 72, {})
    })

    it('__chip_patternSetNote throws for invalid handle', () => {
      setupChipAPI(engine, () => player, undefined, () => null)
      const setNote = getBridge<(h: number, r: number, t: number, n: number) => void>(engine, '__chip_patternSetNote')
      expect(() => setNote(999, 0, 0, 60)).toThrow('Invalid pattern handle: 999')
    })

    it('__chip_patternSetNoteOff calls builder.setNoteOff', () => {
      const { Ctor, builder } = createMockPatternBuilder()
      setupChipAPI(engine, () => player, undefined, () => Ctor)

      const handle = getBridge<(t: number, r: number) => number>(engine, '__chip_buildPattern')(1, 16)
      getBridge<(h: number, r: number, t: number) => void>(engine, '__chip_patternSetNoteOff')(handle, 8, 0)
      expect(builder.setNoteOff).toHaveBeenCalledWith(8, 0)
    })

    it('__chip_patternSetNoteOff throws for invalid handle', () => {
      setupChipAPI(engine, () => player)
      expect(() => getBridge<(h: number, r: number, t: number) => void>(engine, '__chip_patternSetNoteOff')(999, 0, 0)).toThrow('Invalid pattern handle: 999')
    })

    it('__chip_patternBuild builds pattern and loads it into player', () => {
      const { Ctor, builder } = createMockPatternBuilder()
      const builtPattern = { bpm: 140, rows: [[]] }
      builder.build.mockReturnValue(builtPattern)
      setupChipAPI(engine, () => player, undefined, () => Ctor)

      const handle = getBridge<(t: number, r: number) => number>(engine, '__chip_buildPattern')(1, 16)
      getBridge<(h: number) => void>(engine, '__chip_patternBuild')(handle)

      expect(builder.build).toHaveBeenCalled()
      expect(player.loadPattern).toHaveBeenCalledWith(builtPattern)
    })

    it('__chip_patternBuild removes handle after build', () => {
      const { Ctor } = createMockPatternBuilder()
      setupChipAPI(engine, () => player, undefined, () => Ctor)

      const handle = getBridge<(t: number, r: number) => number>(engine, '__chip_buildPattern')(1, 16)
      getBridge<(h: number) => void>(engine, '__chip_patternBuild')(handle)

      // Second build with same handle should fail
      expect(() => getBridge<(h: number) => void>(engine, '__chip_patternBuild')(handle)).toThrow('Invalid pattern handle')
    })

    it('__chip_patternBuild throws for invalid handle', () => {
      setupChipAPI(engine, () => player)
      expect(() => getBridge<(h: number) => void>(engine, '__chip_patternBuild')(999)).toThrow('Invalid pattern handle: 999')
    })

    it('__chip_patternBuild throws when player is null', () => {
      const { Ctor } = createMockPatternBuilder()
      let playerRef: ChipPlayer | null = player
      setupChipAPI(engine, () => playerRef, undefined, () => Ctor)

      const handle = getBridge<(t: number, r: number) => number>(engine, '__chip_buildPattern')(1, 16)
      playerRef = null
      expect(() => getBridge<(h: number) => void>(engine, '__chip_patternBuild')(handle)).toThrow('ChipPlayer not available')
    })

    it('pattern handles are unique across multiple builds', () => {
      const { Ctor } = createMockPatternBuilder()
      setupChipAPI(engine, () => player, undefined, () => Ctor)
      const build = getBridge<(t: number, r: number) => number>(engine, '__chip_buildPattern')

      const h1 = build(1, 8)
      const h2 = build(1, 8)
      const h3 = build(1, 8)
      expect(new Set([h1, h2, h3]).size).toBe(3)
    })
  })

  describe('collection pattern access', () => {
    beforeEach(() => {
      setupChipAPI(engine, () => player, () => Promise.resolve(), () => null)
    })

    it('__chip_parseCollection calls player.parseCollection and returns metadata', () => {
      player.parseCollection.mockReturnValue({
        patterns: [
          { id: 'p1', name: 'Bass Line', data: fakePatternData(3, 64, 140) },
          { id: 'p2', name: 'Melody', data: fakePatternData(2, 32, 120) },
        ],
      })

      const result = getBridge<(y: string) => { handle: number; patterns: Array<{ name: string; id: string; tracks: number; rows: number; bpm: number }> }>(engine, '__chip_parseCollection')('some-yaml')

      expect(player.parseCollection).toHaveBeenCalledWith('some-yaml')
      expect(result.handle).toBeTypeOf('number')
      expect(result.patterns).toHaveLength(2)
      expect(result.patterns[0]).toEqual({ name: 'Bass Line', id: 'p1', tracks: 3, rows: 64, bpm: 140 })
      expect(result.patterns[1]).toEqual({ name: 'Melody', id: 'p2', tracks: 2, rows: 32, bpm: 120 })
    })

    it('__chip_parseCollection assigns unique handles', () => {
      player.parseCollection.mockReturnValue({ patterns: [] })
      const parse = getBridge<(y: string) => { handle: number }>(engine, '__chip_parseCollection')
      const r1 = parse('a')
      const r2 = parse('b')
      expect(r1.handle).not.toBe(r2.handle)
    })

    it('__chip_parseCollection throws when player is null', () => {
      const nullEngine = createMockLuaEngine()
      setupChipAPI(nullEngine, () => null)
      expect(() => getBridge<(y: string) => unknown>(nullEngine, '__chip_parseCollection')('yaml')).toThrow('ChipPlayer not initialized')
    })

    it('__chip_parseCollection returns 0 tracks for empty rows', () => {
      player.parseCollection.mockReturnValue({
        patterns: [{ id: 'p1', name: 'Empty', data: { bpm: 120, rows: [] } }],
      })
      const result = getBridge<(y: string) => { patterns: Array<{ tracks: number; rows: number }> }>(engine, '__chip_parseCollection')('yaml')
      expect(result.patterns[0].tracks).toBe(0)
      expect(result.patterns[0].rows).toBe(0)
    })

    it('__chip_playPattern loads the correct pattern into player', () => {
      const patternData = fakePatternData(4, 64, 140)
      player.parseCollection.mockReturnValue({
        patterns: [
          { id: 'p1', name: 'First', data: fakePatternData(2, 16, 120) },
          { id: 'p2', name: 'Second', data: patternData },
        ],
      })

      const { handle } = getBridge<(y: string) => { handle: number }>(engine, '__chip_parseCollection')('yaml')
      getBridge<(h: number, i: number) => void>(engine, '__chip_playPattern')(handle, 1)
      expect(player.loadPattern).toHaveBeenCalledWith(patternData)
    })

    it('__chip_playPattern throws for invalid handle', () => {
      expect(() => getBridge<(h: number, i: number) => void>(engine, '__chip_playPattern')(999, 0)).toThrow('Invalid collection handle: 999')
    })

    it('__chip_playPattern throws for out-of-range index', () => {
      player.parseCollection.mockReturnValue({
        patterns: [{ id: 'p1', name: 'Only', data: fakePatternData(1, 8, 120) }],
      })
      const { handle } = getBridge<(y: string) => { handle: number }>(engine, '__chip_parseCollection')('yaml')
      expect(() => getBridge<(h: number, i: number) => void>(engine, '__chip_playPattern')(handle, 5)).toThrow('Pattern index 5 out of range')
    })

    it('__chip_playPattern throws when player becomes null', () => {
      let playerRef: ChipPlayer | null = player
      const e2 = createMockLuaEngine()
      setupChipAPI(e2, () => playerRef)
      player.parseCollection.mockReturnValue({
        patterns: [{ id: 'p1', name: 'Test', data: fakePatternData(1, 8, 120) }],
      })
      const { handle } = getBridge<(y: string) => { handle: number }>(e2, '__chip_parseCollection')('yaml')
      playerRef = null
      expect(() => getBridge<(h: number, i: number) => void>(e2, '__chip_playPattern')(handle, 0)).toThrow('ChipPlayer not initialized')
    })

    it('__chip_freeCollection makes subsequent playPattern fail', () => {
      player.parseCollection.mockReturnValue({
        patterns: [{ id: 'p1', name: 'Test', data: fakePatternData(1, 8, 120) }],
      })
      const { handle } = getBridge<(y: string) => { handle: number }>(engine, '__chip_parseCollection')('yaml')
      getBridge<(h: number) => void>(engine, '__chip_freeCollection')(handle)
      expect(() => getBridge<(h: number, i: number) => void>(engine, '__chip_playPattern')(handle, 0)).toThrow('Invalid collection handle')
    })

    it('__chip_freeCollection does not throw for non-existent handle', () => {
      expect(() => getBridge<(h: number) => void>(engine, '__chip_freeCollection')(999)).not.toThrow()
    })
  })
})
