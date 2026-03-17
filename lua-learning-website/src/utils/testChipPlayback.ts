/**
 * Dev-only chip playback test — bypasses Lua/wasmoon entirely.
 * Call `window.test_chip_playback()` from the browser console.
 *
 * Tests: ChipPlayer construction, init, GENMIDI bank loading,
 * instrument setting, note playback, and pattern playback.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function test_chip_playback(): Promise<void> {
  const log = (msg: string, ...args: unknown[]) =>
    console.log(`%c[chip-test] ${msg}`, 'color: #4ade80', ...args)
  const err = (msg: string, ...args: unknown[]) =>
    console.error(`%c[chip-test] ${msg}`, 'color: #e94560', ...args)

  log('=== ChipPlayer Direct Test ===')

  // Step 1: Dynamic import
  log('1. Importing @chip-composer/player...')
  let ChipPlayer: any
  let PatternBuilder: any
  try {
    // @ts-expect-error — no .d.ts in website tsconfig
    const mod: any = await import('@chip-composer/player')
    ChipPlayer = mod.ChipPlayer
    PatternBuilder = mod.PatternBuilder
    log('   OK — ChipPlayer, PatternBuilder imported')
  } catch (e) {
    err('   FAIL — import failed:', e)
    return
  }

  // Also import parseGENMIDI from core (may not be available yet)
  let parseGENMIDI: ((data: unknown) => unknown[]) | null = null
  try {
    const core = await import('@chip-composer/core')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parseGENMIDI = (core as any).parseGENMIDI ?? null
    log('   parseGENMIDI from core:', parseGENMIDI ? 'available' : 'NOT exported')
  } catch {
    log('   @chip-composer/core import failed (not critical)')
  }

  // Step 2: Construct
  log('2. Constructing ChipPlayer...')
  const player = new ChipPlayer()
  log('   OK — player created')

  // Step 3: Init (audio worklet — bank may fail silently)
  log('3. Calling player.init()...')
  try {
    await player.init()
    log('   OK — init completed')
  } catch (e) {
    err('   FAIL — init threw:', e)
    return
  }

  // Step 4: Check if bank loaded automatically
  log('4. Checking instrument bank...')
  let bankLoaded = false
  try {
    player.setTrackInstrument(0, 0)
    log('   OK — bank auto-loaded by init()')
    bankLoaded = true
  } catch {
    log('   Bank NOT loaded by init()')
  }

  if (!bankLoaded) {
    log('4b. Fetching GENMIDI.json and loading bank manually...')
    try {
      const resp = await fetch('/instruments/legacy/GENMIDI.json')
      const body = await resp.text()
      const isJson = body.trimStart().startsWith('{')
      log(`   Fetch: ${resp.status} isJson=${isJson} size=${body.length}`)

      if (!isJson) {
        err('   Response is not JSON — Vite SPA fallback?')
        err('   Body preview:', body.substring(0, 80))
        await player.destroy()
        return
      }

      const data = JSON.parse(body)
      log('   Parsed JSON. Keys:', Object.keys(data))
      log('   instruments count:', data.instruments?.length ?? 'MISSING')

      if (parseGENMIDI) {
        // Use the core parser to convert GENMIDI format to OPLPatch[]
        log('   Using parseGENMIDI from @chip-composer/core...')
        const patches = parseGENMIDI(data)
        log('   parseGENMIDI returned:', Array.isArray(patches), 'length:', (patches as unknown[]).length)
        player.setInstrumentBank(patches)
      } else {
        // Fallback: try loadInstrumentBankFromUrl with blob
        log('   parseGENMIDI not available, trying loadInstrumentBankFromUrl...')
        const blob = new Blob([body], { type: 'application/json' })
        const blobUrl = URL.createObjectURL(blob)
        try {
          await player.loadInstrumentBankFromUrl(blobUrl)
        } finally {
          URL.revokeObjectURL(blobUrl)
        }
      }

      player.setTrackInstrument(0, 0)
      log('   Instrument 0 set — bank loaded successfully!')
      bankLoaded = true
    } catch (e) {
      err('   Bank loading failed:', e)
    }
  }

  if (!bankLoaded) {
    err('Could not load instrument bank — stopping test')
    await player.destroy()
    return
  }

  // Step 5: Direct note playback
  log('5. Playing C-4 note for 1 second...')
  player.noteOn(0, 60, 64)
  await sleep(1000)
  player.noteOff(0, 60)
  log('   Did you hear a note? If not, click the page first (autoplay policy).')

  // Step 6: Try different instrument
  log('6. Switching to instrument 73 (Flute) and playing G-4...')
  try {
    player.setTrackInstrument(0, 73)
    player.noteOn(0, 67, 64)
    await sleep(1000)
    player.noteOff(0, 67)
    log('   OK')
  } catch (e) {
    err('   FAIL:', e)
  }

  // Step 7: Pattern playback
  log('7. Building and playing a short pattern...')
  try {
    const pb = new PatternBuilder(1, 16, 140)
    pb.setNote(0, 0, 60, { instrument: 0, velocity: 64 })
    pb.setNote(4, 0, 64)
    pb.setNote(8, 0, 67)
    pb.setNote(12, 0, 72)
    const pattern = pb.build()
    player.loadPattern(pattern)
    player.play({ loop: false })
    log('   Pattern playing...')

    const unsub = player.onRowChange((row: number) => {
      log(`   Row: ${row}`)
    })

    await sleep(3000)
    player.stop()
    unsub()
    log('   Pattern playback complete')
  } catch (e) {
    err('   Pattern playback FAIL:', e)
  }

  // Step 8: Cleanup
  log('8. Destroying player...')
  await player.destroy()
  log('=== Test complete ===')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Expose on window for console access
declare global {
  interface Window {
    test_chip_playback: typeof test_chip_playback
  }
}
window.test_chip_playback = test_chip_playback
