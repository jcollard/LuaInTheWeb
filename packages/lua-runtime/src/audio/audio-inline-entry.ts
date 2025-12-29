/**
 * Entry point for generating the inline audio bridge for HTML exports.
 *
 * This file is bundled by esbuild into a self-contained JavaScript file
 * that gets embedded in exported HTML files.
 *
 * The bundle exposes `setupAudioBridge(engine, state, assetManifest)` globally.
 */

import { WebAudioEngine } from './WebAudioEngine.js';

/** Asset manifest entry */
interface AssetEntry {
  path: string;
  /** Data URL for single-file exports (base64-encoded asset) */
  dataUrl?: string;
}

/** Canvas runtime state object */
interface CanvasState {
  audioEngine?: {
    dispose: () => void;
  };
}

/** Wasmoon engine global interface */
interface LuaEngineGlobal {
  set: (name: string, value: unknown) => void;
}

/** Wasmoon engine interface */
interface LuaEngine {
  global: LuaEngineGlobal;
}

/**
 * Helper to extract audio name from a handle or string.
 */
function extractAudioName(nameOrHandle: unknown): string {
  if (typeof nameOrHandle === 'string') return nameOrHandle;
  if (
    typeof nameOrHandle === 'object' &&
    nameOrHandle !== null &&
    '_name' in nameOrHandle
  ) {
    return (nameOrHandle as { _name: string })._name;
  }
  throw new Error('Invalid audio reference');
}

/**
 * Set up the audio bridge between Lua and the WebAudioEngine.
 *
 * This function is called from the exported HTML to wire up audio functionality.
 *
 * @param engine - The wasmoon LuaEngine instance
 * @param state - The canvas runtime state (will have audioEngine added)
 * @param assetManifest - Array of {path: string} asset entries
 */
export function setupAudioBridge(
  engine: LuaEngine,
  state: CanvasState,
  assetManifest: AssetEntry[]
): void {
  // Debug: log audio bridge initialization
  console.log('[Audio Bridge] Initializing with', assetManifest.length, 'assets');

  const audioEngine = new WebAudioEngine();

  // Track pending audio loads for proper cleanup
  const pendingLoads = new Set<Promise<void>>();

  // Store raw audio data until AudioContext is ready (browser autoplay policy)
  const pendingAudioData = new Map<string, ArrayBuffer>();
  let audioContextReady = false;

  /**
   * Decode base64 data URL to ArrayBuffer.
   */
  function decodeDataUrl(dataUrl: string): ArrayBuffer {
    const base64 = dataUrl.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Ensure AudioContext is ready (must be called after user interaction).
   */
  async function ensureAudioContextReady(): Promise<boolean> {
    if (audioContextReady) {
      return true;
    }

    try {
      if (!audioEngine.isInitialized()) {
        await audioEngine.initialize();
      }
      audioContextReady = true;

      // Process any pending audio data
      for (const [name, buffer] of pendingAudioData) {
        try {
          await audioEngine.decodeAudio(name, buffer);
          console.log('[Audio Bridge] Loaded pending audio:', name);
        } catch (err) {
          console.error('[Audio Bridge] Failed to decode pending audio:', name, err);
        }
      }
      pendingAudioData.clear();

      return true;
    } catch (err) {
      console.warn('[Audio Bridge] AudioContext not ready yet:', err);
      return false;
    }
  }

  // Set up user interaction handler to unlock AudioContext
  function setupUserInteractionHandler(): void {
    const unlockAudio = async (): Promise<void> => {
      const ready = await ensureAudioContextReady();
      if (ready) {
        console.log('[Audio Bridge] AudioContext unlocked by user interaction');
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      }
    };

    document.addEventListener('click', unlockAudio, { once: false });
    document.addEventListener('touchstart', unlockAudio, { once: false });
    document.addEventListener('keydown', unlockAudio, { once: false });
  }

  // Set up the user interaction handler
  setupUserInteractionHandler();

  /**
   * Helper to load audio from the assets folder or embedded data URL.
   */
  async function loadAudioAsset(
    name: string,
    filename: string
  ): Promise<void> {
    const assetPath = assetManifest.find((a) => a.path.endsWith(filename));
    if (!assetPath) {
      console.error('[Audio Bridge] Audio file not found:', filename);
      return;
    }

    try {
      let buffer: ArrayBuffer;

      // Check if we have embedded data URL (single-file mode)
      if (assetPath.dataUrl) {
        buffer = decodeDataUrl(assetPath.dataUrl);
      } else {
        // Fetch from assets folder (ZIP mode)
        const response = await fetch('assets/' + assetPath.path);
        buffer = await response.arrayBuffer();
      }

      // Try to decode immediately if AudioContext is ready
      if (audioContextReady) {
        await audioEngine.decodeAudio(name, buffer);
        console.log('[Audio Bridge] Loaded audio:', name);
      } else {
        // Store for later decoding after user interaction
        pendingAudioData.set(name, buffer);
        console.log('[Audio Bridge] Queued audio for later:', name);

        // Try to initialize (might work if user already interacted)
        ensureAudioContextReady();
      }
    } catch (err) {
      console.error('[Audio Bridge] Failed to load audio:', name, err);
    }
  }

  // === Asset Loading Functions ===

  engine.global.set(
    '__canvas_assets_loadSound',
    (name: string, filename: string) => {
      const loadPromise = loadAudioAsset(name, filename).finally(() => {
        pendingLoads.delete(loadPromise);
      });
      pendingLoads.add(loadPromise);

      return { _type: 'sound', _name: name, _file: filename };
    }
  );

  engine.global.set(
    '__canvas_assets_loadMusic',
    (name: string, filename: string) => {
      const loadPromise = loadAudioAsset(name, filename).finally(() => {
        pendingLoads.delete(loadPromise);
      });
      pendingLoads.add(loadPromise);

      return { _type: 'music', _name: name, _file: filename };
    }
  );

  // === Sound Effect Functions ===

  engine.global.set(
    '__audio_playSound',
    (nameOrHandle: unknown, volume?: number) => {
      const name = extractAudioName(nameOrHandle);
      audioEngine.playSound(name, volume ?? 1);
    }
  );

  engine.global.set('__audio_getSoundDuration', (nameOrHandle: unknown) => {
    const name = extractAudioName(nameOrHandle);
    return audioEngine.getSoundDuration(name);
  });

  // === Music Playback Functions ===

  engine.global.set(
    '__audio_playMusic',
    (nameOrHandle: unknown, volume?: number, loop?: boolean) => {
      const name = extractAudioName(nameOrHandle);
      audioEngine.playMusic(name, { volume: volume ?? 1, loop: loop ?? false });
    }
  );

  engine.global.set('__audio_stopMusic', () => {
    audioEngine.stopMusic();
  });

  engine.global.set('__audio_pauseMusic', () => {
    audioEngine.pauseMusic();
  });

  engine.global.set('__audio_resumeMusic', () => {
    audioEngine.resumeMusic();
  });

  engine.global.set('__audio_setMusicVolume', (volume: number) => {
    audioEngine.setMusicVolume(volume);
  });

  engine.global.set('__audio_isMusicPlaying', () => {
    return audioEngine.isMusicPlaying();
  });

  engine.global.set('__audio_getMusicTime', () => {
    return audioEngine.getMusicTime();
  });

  engine.global.set('__audio_getMusicDuration', () => {
    return audioEngine.getMusicDuration();
  });

  // === Global Audio Controls ===

  engine.global.set('__audio_setMasterVolume', (volume: number) => {
    audioEngine.setMasterVolume(volume);
  });

  engine.global.set('__audio_getMasterVolume', () => {
    return audioEngine.getMasterVolume();
  });

  engine.global.set('__audio_mute', () => {
    audioEngine.mute();
  });

  engine.global.set('__audio_unmute', () => {
    audioEngine.unmute();
  });

  engine.global.set('__audio_isMuted', () => {
    return audioEngine.isMuted();
  });

  // === Store reference for cleanup ===

  state.audioEngine = {
    dispose: () => {
      audioEngine.dispose();
    },
  };
}

// Expose globally for use in exported HTML
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).setupAudioBridge = setupAudioBridge;
