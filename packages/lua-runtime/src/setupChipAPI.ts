/**
 * Chip (OPL3 FM synthesis) API setup for Lua processes.
 * Registers JavaScript functions that bridge to ChipPlayer.
 */

import type { LuaEngine } from 'wasmoon'
import type { ChipPlayer, OPLPatch, PatternBuilder } from '@chip-composer/player'

const GENMIDI_URL = '/instruments/legacy/GENMIDI.json'

/**
 * Minimal GENMIDI → OPLPatch[] converter.
 * Duplicates the logic from @chip-composer/core's genmidiParser
 * to avoid importing the full core package (which has Vite-specific types).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertGENMIDI(data: any): OPLPatch[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function convertOp(op: any) {
    return {
      attackRate: op.attack,
      decayRate: op.decay,
      sustainLevel: op.sustain,
      releaseRate: op.release,
      frequencyMultiplier: op.multi,
      waveform: op.wave,
      outputLevel: op.out,
      keyScaleLevel: op.ksl,
      amplitudeModulation: op.trem,
      vibrato: op.vib,
      envelopeType: op.sus,
      keyScaleRate: op.ksr,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.instruments.map((inst: any) => ({
    id: inst.id,
    name: inst.name,
    noteOffset: inst.note,
    voice1: {
      modulator: convertOp(inst.voice1.mod),
      carrier: convertOp(inst.voice1.car),
      feedback: inst.voice1.feedback,
      connection: inst.voice1.additive ? 'additive' : 'fm',
      baseNote: inst.voice1.baseNote,
    },
    voice2: {
      modulator: convertOp(inst.voice2.mod),
      carrier: convertOp(inst.voice2.car),
      feedback: inst.voice2.feedback,
      connection: inst.voice2.additive ? 'additive' : 'fm',
      baseNote: inst.voice2.baseNote,
    },
    modulator: convertOp(inst.voice1.mod),
    carrier: convertOp(inst.voice1.car),
    feedback: inst.voice1.feedback,
    connection: inst.voice1.additive ? 'additive' : 'fm',
    dualVoiceEnabled: true,
  }))
}

/**
 * Fetch and parse the GENMIDI bank, then set it on the player.
 */
async function loadBankIntoPlayer(player: ChipPlayer): Promise<void> {
  // Check if bank already loaded (init() may have succeeded)
  try {
    player.setTrackInstrument(0, 0)
    console.debug('[chip] Bank already loaded by init()')
    return
  } catch {
    // Bank not loaded — continue
  }

  console.debug('[chip] Bank not loaded by init(), fetching manually...')

  const resp = await fetch(GENMIDI_URL)
  if (!resp.ok) {
    throw new Error(`[chip] GENMIDI fetch failed: ${resp.status} ${resp.statusText}`)
  }

  const body = await resp.text()
  if (!body.trimStart().startsWith('{')) {
    throw new Error('[chip] GENMIDI response is not JSON (got HTML SPA fallback?)')
  }

  const data = JSON.parse(body)
  console.debug(`[chip] GENMIDI parsed: ${data.instruments?.length ?? 0} instruments`)

  const patches = convertGENMIDI(data)
  player.setInstrumentBank(patches as OPLPatch[])
  console.debug(`[chip] Bank loaded: ${patches.length} patches`)
}

/**
 * Set up chip API functions in the Lua engine.
 * Registers all __chip_* bridge functions for OPL3 FM synthesis.
 *
 * @param engine - The Lua engine to set up
 * @param getPlayer - Function to get the ChipPlayer (allows lazy access)
 * @param getPlayerReady - Promise that resolves when ChipPlayer is constructed
 */
export function setupChipAPI(
  engine: LuaEngine,
  getPlayer: () => ChipPlayer | null,
  getPlayerReady?: () => Promise<unknown> | null
): void {
  // Track PatternBuilder instances by handle ID
  const patternBuilders = new Map<number, PatternBuilder>()
  let nextPatternHandle = 1
  // Cache PatternBuilder constructor after first import
  let PatternBuilderCtor: (new (tracks: number, rows: number, bpm?: number) => PatternBuilder) | null = null

  // --- Lifecycle ---

  // Legacy __chip_init kept for backward compatibility
  engine.global.set('__chip_init', async () => {
    if (getPlayerReady) await getPlayerReady()
    const player = getPlayer()
    if (!player) return
    await player.init()
    try { await loadBankIntoPlayer(player) } catch { /* logged inside */ }
  })

  // Combined init: awaits player import, audio init, AND bank loading in one Promise.
  // Lua calls this and wasmoon awaits the Promise, so Lua blocks until fully ready.
  engine.global.set('__chip_initAndLoadBank', async () => {
    console.debug('[chip] __chip_initAndLoadBank called')

    // Wait for the dynamic import to complete
    if (getPlayerReady) {
      console.debug('[chip] Awaiting player ready...')
      await getPlayerReady()
    }
    const player = getPlayer()
    if (!player) {
      console.error('[chip] player is null after ready')
      return
    }

    // Cache PatternBuilder constructor
    if (!PatternBuilderCtor) {
      try {
        const { PatternBuilder: PB } = await import('@chip-composer/player')
        PatternBuilderCtor = PB as unknown as typeof PatternBuilderCtor
        console.debug('[chip] PatternBuilder cached')
      } catch {
        console.error('[chip] Failed to import PatternBuilder')
      }
    }

    // Initialize audio engine
    console.debug('[chip] Calling player.init()...')
    await player.init()
    console.debug('[chip] player.init() completed')

    // Load the instrument bank
    try {
      await loadBankIntoPlayer(player)
    } catch (e) {
      console.error('[chip] Failed to load instrument bank:', e)
    }

    // Set default instrument (Acoustic Piano) on track 0 so note_on works immediately
    try {
      player.setTrackInstrument(0, 0)
      console.debug('[chip] Default instrument 0 set on track 0')
    } catch (e) {
      console.debug('[chip] Could not set default instrument:', e)
    }

    console.debug('[chip] initAndLoadBank complete')
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
    player.setInstrumentBank(data as OPLPatch[])
  })

  // --- PatternBuilder ---

  engine.global.set(
    '__chip_buildPattern',
    async (tracks: number, rows: number, bpm?: number | null) => {
      if (!PatternBuilderCtor) {
        // Fallback: import on demand if init didn't cache it
        const { PatternBuilder: PB } = await import('@chip-composer/player')
        PatternBuilderCtor = PB as unknown as typeof PatternBuilderCtor
      }
      const builder: PatternBuilder = new PatternBuilderCtor!(tracks, rows, bpm ?? 120)
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

    const player = getPlayer()
    if (!player) throw new Error('ChipPlayer not available')
    player.loadPattern(pattern)
  })
}
