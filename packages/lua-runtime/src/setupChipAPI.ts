/**
 * Chip (OPL3 FM synthesis) API setup for Lua processes.
 * Registers JavaScript functions that bridge to ChipPlayer.
 */

import type { LuaEngine } from 'wasmoon'
import type { ChipPlayer, OPLPatch } from '@chip-composer/player'
import { PatternBuilder } from '@chip-composer/player'

/**
 * Set up chip API functions in the Lua engine.
 * Registers all __chip_* bridge functions for OPL3 FM synthesis.
 *
 * @param engine - The Lua engine to set up
 * @param getPlayer - Function to get the ChipPlayer (allows lazy access)
 */
export function setupChipAPI(
  engine: LuaEngine,
  getPlayer: () => ChipPlayer | null
): void {
  // Track PatternBuilder instances by handle ID
  const patternBuilders = new Map<number, PatternBuilder>()
  let nextPatternHandle = 1

  // --- Lifecycle ---

  engine.global.set('__chip_init', async () => {
    const player = getPlayer()
    if (!player) return
    await player.init()
  })

  engine.global.set('__chip_destroy', async () => {
    const player = getPlayer()
    if (!player) return
    await player.destroy()
  })

  // --- Direct note control ---

  engine.global.set(
    '__chip_noteOn',
    (track: number, note: number, velocity?: number | null) => {
      const player = getPlayer()
      if (!player) return
      player.noteOn(track, note, velocity ?? 64)
    }
  )

  engine.global.set('__chip_noteOff', (track: number, note: number) => {
    const player = getPlayer()
    if (!player) return
    player.noteOff(track, note)
  })

  engine.global.set('__chip_setInstrument', (track: number, id: number) => {
    const player = getPlayer()
    if (!player) return
    player.setTrackInstrument(track, id)
  })

  engine.global.set('__chip_allNotesOff', () => {
    const player = getPlayer()
    if (!player) return
    // Send noteOff for all tracks (OPL3 has 18 channels max)
    for (let t = 0; t < 18; t++) {
      for (let n = 0; n < 128; n++) {
        player.noteOff(t, n)
      }
    }
  })

  // --- Volume / effects ---

  engine.global.set('__chip_setVolume', (vol: number) => {
    getPlayer()?.setVolume(vol)
  })

  engine.global.set('__chip_setGain', (gain: number) => {
    getPlayer()?.setGain(gain)
  })

  // --- File loading ---

  engine.global.set(
    '__chip_loadCollection',
    (yaml: string, songIndex?: number | null) => {
      const player = getPlayer()
      if (!player) return
      player.loadCollection(yaml, songIndex ?? undefined)
    }
  )

  engine.global.set('__chip_loadSongFile', (yaml: string) => {
    const player = getPlayer()
    if (!player) return
    player.loadSongFile(yaml)
  })

  // --- Playback control ---

  engine.global.set('__chip_play', (loop?: boolean | null) => {
    const player = getPlayer()
    if (!player) return
    player.play({ loop: loop ?? true })
  })

  engine.global.set('__chip_pause', () => {
    getPlayer()?.pause()
  })

  engine.global.set('__chip_stop', () => {
    getPlayer()?.stop()
  })

  engine.global.set('__chip_seekToRow', (row: number) => {
    getPlayer()?.seekToRow(row)
  })

  engine.global.set('__chip_setBPM', (bpm: number) => {
    getPlayer()?.setBPM(bpm)
  })

  // --- State query ---

  engine.global.set('__chip_getState', () => {
    const player = getPlayer()
    if (!player) return null
    return player.getState()
  })

  // --- Event subscriptions ---

  engine.global.set(
    '__chip_onRowChange',
    (cb: (row: number) => void) => {
      const player = getPlayer()
      if (!player) return () => {}
      return player.onRowChange(cb)
    }
  )

  // --- Instrument bank ---

  engine.global.set('__chip_loadBankFromUrl', async (url: string) => {
    const player = getPlayer()
    if (!player) return
    await player.loadInstrumentBankFromUrl(url)
  })

  engine.global.set('__chip_setInstrumentBank', (data: unknown) => {
    const player = getPlayer()
    if (!player) return
    // data should be an OPLPatch[] array
    player.setInstrumentBank(data as OPLPatch[])
  })

  // --- PatternBuilder ---

  engine.global.set(
    '__chip_buildPattern',
    (tracks: number, rows: number, bpm?: number | null) => {
      const builder = new PatternBuilder(tracks, rows, bpm ?? 120)
      const handle = nextPatternHandle++
      patternBuilders.set(handle, builder)
      return handle
    }
  )

  engine.global.set(
    '__chip_patternSetNote',
    (
      handle: number,
      row: number,
      track: number,
      note: number,
      instrument?: number | null,
      velocity?: number | null,
      effect?: string | null
    ) => {
      const builder = patternBuilders.get(handle)
      if (!builder) throw new Error(`Invalid pattern handle: ${handle}`)
      const opts: { instrument?: number; velocity?: number; effect?: string } = {}
      if (instrument != null) opts.instrument = instrument
      if (velocity != null) opts.velocity = velocity
      if (effect != null) opts.effect = effect
      builder.setNote(row, track, note, opts)
    }
  )

  engine.global.set(
    '__chip_patternSetNoteOff',
    (handle: number, row: number, track: number) => {
      const builder = patternBuilders.get(handle)
      if (!builder) throw new Error(`Invalid pattern handle: ${handle}`)
      builder.setNoteOff(row, track)
    }
  )

  engine.global.set('__chip_patternBuild', (handle: number) => {
    const builder = patternBuilders.get(handle)
    if (!builder) throw new Error(`Invalid pattern handle: ${handle}`)
    const pattern = builder.build()
    patternBuilders.delete(handle)

    // Load the pattern into the player
    const player = getPlayer()
    if (!player) throw new Error('ChipPlayer not available')
    player.loadPattern(pattern)
  })
}
