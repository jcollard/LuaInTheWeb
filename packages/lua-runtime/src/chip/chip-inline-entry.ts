/**
 * Entry point for generating the inline chip bridge for HTML exports.
 *
 * This file is bundled by esbuild into a self-contained JavaScript file
 * that gets embedded in exported HTML files.
 *
 * The bundle exposes `setupChipBridge(engine, assetManifest)` globally.
 */

import { ChipPlayer, PatternBuilder } from '@chip-composer/player';
import type { OPLPatch } from '@chip-composer/player';
import type { LuaEngine } from 'wasmoon';

/** Asset manifest entry */
interface AssetEntry {
  path: string;
  /** Data URL for single-file exports (base64-encoded asset) */
  dataUrl?: string;
  /** Text content for text-based assets (.wcol, .wsng) */
  textContent?: string;
}

/** Chip bridge state */
interface ChipState {
  chipPlayer?: ChipPlayer;
}

/**
 * Set up the chip bridge between Lua and ChipPlayer.
 *
 * This function is called from the exported HTML to wire up chip functionality.
 *
 * @param engine - The wasmoon LuaEngine instance
 * @param assetManifest - Array of asset entries
 */
export function setupChipBridge(
  engine: LuaEngine,
  assetManifest: AssetEntry[]
): ChipState {
  const player = new ChipPlayer();
  const state: ChipState = { chipPlayer: player };

  // Track loaded chip file contents (name → YAML text)
  const chipFileContents = new Map<string, string>();

  // Track PatternBuilder instances by handle ID
  const patternBuilders = new Map<number, PatternBuilder>();
  let nextPatternHandle = 1;

  // === Asset Loading Functions (export-specific) ===

  // No-op: in exports, assets are pre-embedded in the manifest
  engine.global.set('__chip_assets_addPath', () => {});

  engine.global.set('__chip_assets_loadFile', (name: string, filename: string) => {
    // Find the asset in the manifest
    const asset = assetManifest.find((a) => a.path.endsWith(filename));
    if (!asset) {
      console.error('[Chip Bridge] Chip file not found:', filename);
      return;
    }

    // Load text content from manifest
    if (asset.textContent) {
      chipFileContents.set(name, asset.textContent);
    } else if (asset.dataUrl) {
      // Decode data URL (text files stored as base64)
      const base64 = asset.dataUrl.split(',')[1];
      chipFileContents.set(name, atob(base64));
    }
  });

  engine.global.set('__chip_assets_start', async () => {
    await player.init();
  });

  engine.global.set('__chip_assets_getFileContent', (name: string) => {
    return chipFileContents.get(name) ?? null;
  });

  // === Lifecycle ===

  engine.global.set('__chip_init', async () => {
    await player.init();
  });

  engine.global.set('__chip_destroy', async () => {
    await player.destroy();
  });

  // === Direct note control ===

  engine.global.set(
    '__chip_noteOn',
    (track: number, note: number, velocity?: number | null) => {
      player.noteOn(track, note, velocity ?? 64);
    }
  );

  engine.global.set('__chip_noteOff', (track: number, note: number) => {
    player.noteOff(track, note);
  });

  engine.global.set('__chip_setInstrument', (track: number, id: number) => {
    player.setTrackInstrument(track, id);
  });

  engine.global.set('__chip_allNotesOff', () => {
    for (let t = 0; t < 18; t++) {
      for (let n = 0; n < 128; n++) {
        player.noteOff(t, n);
      }
    }
  });

  // === Volume / effects ===

  engine.global.set('__chip_setVolume', (vol: number) => {
    player.setVolume(vol);
  });

  engine.global.set('__chip_setGain', (gain: number) => {
    player.setGain(gain);
  });

  // === File loading ===

  engine.global.set(
    '__chip_loadCollection',
    (yaml: string, songIndex?: number | null) => {
      player.loadCollection(yaml, songIndex ?? undefined);
    }
  );

  engine.global.set('__chip_loadSongFile', (yaml: string) => {
    player.loadSongFile(yaml);
  });

  // === Playback control ===

  engine.global.set('__chip_play', (loop?: boolean | null) => {
    player.play({ loop: loop ?? true });
  });

  engine.global.set('__chip_pause', () => {
    player.pause();
  });

  engine.global.set('__chip_stop', () => {
    player.stop();
  });

  engine.global.set('__chip_seekToRow', (row: number) => {
    player.seekToRow(row);
  });

  engine.global.set('__chip_setBPM', (bpm: number) => {
    player.setBPM(bpm);
  });

  // === State query ===

  engine.global.set('__chip_getState', () => {
    return player.getState();
  });

  // === Event subscriptions ===

  engine.global.set('__chip_onRowChange', (cb: (row: number) => void) => {
    return player.onRowChange(cb);
  });

  // === Instrument bank ===

  engine.global.set('__chip_loadBankFromUrl', async (url: string) => {
    await player.loadInstrumentBankFromUrl(url);
  });

  engine.global.set('__chip_setInstrumentBank', (data: unknown) => {
    player.setInstrumentBank(data as OPLPatch[]);
  });

  // === PatternBuilder ===

  engine.global.set(
    '__chip_buildPattern',
    (tracks: number, rows: number, bpm?: number | null) => {
      const builder = new PatternBuilder(tracks, rows, bpm ?? 120);
      const handle = nextPatternHandle++;
      patternBuilders.set(handle, builder);
      return handle;
    }
  );

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
      const builder = patternBuilders.get(handle);
      if (!builder) throw new Error(`Invalid pattern handle: ${handle}`);
      const opts: { instrument?: number; velocity?: number; effect?: string } = {};
      if (instrument != null) opts.instrument = instrument;
      if (velocity != null) opts.velocity = velocity;
      if (effect != null) opts.effect = effect;
      builder.setNote(row, track, note, opts);
    }
  );

  engine.global.set(
    '__chip_patternSetNoteOff',
    (handle: number, row: number, track: number) => {
      const builder = patternBuilders.get(handle);
      if (!builder) throw new Error(`Invalid pattern handle: ${handle}`);
      builder.setNoteOff(row, track);
    }
  );

  engine.global.set('__chip_patternBuild', (handle: number) => {
    const builder = patternBuilders.get(handle);
    if (!builder) throw new Error(`Invalid pattern handle: ${handle}`);
    const pattern = builder.build();
    patternBuilders.delete(handle);
    player.loadPattern(pattern);
  });

  return state;
}

// Expose globally for use in exported HTML
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).setupChipBridge = setupChipBridge;
