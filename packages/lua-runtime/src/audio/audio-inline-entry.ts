/**
 * Entry point for generating the inline audio bridge for HTML exports.
 *
 * This file is bundled by esbuild into a self-contained JavaScript file
 * that gets embedded in exported HTML files.
 *
 * The bundle exposes `setupAudioBridge(engine, state, assetManifest)` globally.
 */

import { WebAudioEngine } from './WebAudioEngine.js';
import { setupAudioAPI } from '../setupAudioAPI.js';
import type { LuaEngine } from 'wasmoon';

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
   * Initialize AudioContext and decode all pending audio.
   * Must be called from a user interaction event handler.
   */
  async function initializeAudio(): Promise<void> {
    if (audioContextReady) {
      return;
    }

    try {
      await audioEngine.initialize();
      audioContextReady = true;

      // Decode all pending audio data
      for (const [name, buffer] of pendingAudioData) {
        try {
          await audioEngine.decodeAudio(name, buffer);
        } catch (err) {
          console.error('[Audio Bridge] Failed to decode audio:', name, err);
        }
      }
      pendingAudioData.clear();
    } catch (err) {
      console.error('[Audio Bridge] Failed to initialize audio:', err);
    }
  }

  // Set up user interaction handler to lazily initialize AudioContext
  function setupUserInteractionHandler(): void {
    const unlockAudio = (): void => {
      // Remove listeners immediately to prevent multiple calls
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);

      // Initialize audio (fire and forget - it's async but we don't need to wait)
      initializeAudio();
    };

    document.addEventListener('click', unlockAudio, { once: false });
    document.addEventListener('touchstart', unlockAudio, { once: false });
    document.addEventListener('keydown', unlockAudio, { once: false });
  }

  // Set up the user interaction handler
  setupUserInteractionHandler();

  /**
   * Helper to load audio from the assets folder or embedded data URL.
   * Stores raw buffer data for later decoding when AudioContext is ready.
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

      // If AudioContext is already ready, decode immediately
      if (audioContextReady) {
        try {
          await audioEngine.decodeAudio(name, buffer);
        } catch (err) {
          console.error('[Audio Bridge] Failed to decode audio:', name, err);
        }
      } else {
        // Store for later decoding when user interacts
        pendingAudioData.set(name, buffer);
      }
    } catch (err) {
      console.error('[Audio Bridge] Failed to load audio:', name, err);
    }
  }

  // === Asset Loading Functions (export-specific) ===

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

  // === Use shared audio API bindings (no duplication!) ===
  // This includes all sound, music, master volume, and channel functions
  setupAudioAPI(engine, () => audioEngine);

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
