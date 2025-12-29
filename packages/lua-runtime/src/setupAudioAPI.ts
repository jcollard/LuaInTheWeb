/**
 * Audio API setup for Lua processes.
 * Registers JavaScript functions that bridge to the IAudioEngine.
 */

import type { LuaEngine } from 'wasmoon';
import type { IAudioEngine } from './audio/IAudioEngine.js';
import type { AudioAssetHandle } from '@lua-learning/canvas-runtime';

/**
 * Extract the asset name from either a string or an AudioAssetHandle.
 */
function extractAudioName(nameOrHandle: unknown): string {
  if (typeof nameOrHandle === 'string') {
    return nameOrHandle;
  }
  if (
    typeof nameOrHandle === 'object' &&
    nameOrHandle !== null &&
    '_name' in nameOrHandle
  ) {
    return (nameOrHandle as AudioAssetHandle)._name;
  }
  throw new Error('Invalid audio asset reference');
}

/**
 * Set up audio API functions in the Lua engine.
 * This registers all the JS functions needed for audio playback.
 *
 * @param engine - The Lua engine to set up
 * @param getAudioEngine - Function to get the audio engine (allows lazy access)
 */
export function setupAudioAPI(
  engine: LuaEngine,
  getAudioEngine: () => IAudioEngine | null
): void {
  // --- Sound effect functions ---

  engine.global.set(
    '__audio_playSound',
    (nameOrHandle: unknown, volume?: number | null) => {
      console.log('[setupAudioAPI] __audio_playSound called:', nameOrHandle, volume);
      const engine = getAudioEngine();
      if (!engine) {
        console.log('[setupAudioAPI] No audio engine available!');
        return;
      }

      const name = extractAudioName(nameOrHandle);
      console.log('[setupAudioAPI] Playing sound:', name, 'volume:', volume ?? 1);
      engine.playSound(name, volume ?? 1);
    }
  );

  engine.global.set('__audio_getSoundDuration', (nameOrHandle: unknown) => {
    const engine = getAudioEngine();
    if (!engine) return 0;

    const name = extractAudioName(nameOrHandle);
    return engine.getSoundDuration(name);
  });

  // --- Music functions ---

  engine.global.set(
    '__audio_playMusic',
    (nameOrHandle: unknown, volume?: number | null, loop?: boolean | null) => {
      console.log('[setupAudioAPI] __audio_playMusic called:', nameOrHandle, volume, loop);
      const engine = getAudioEngine();
      if (!engine) {
        console.log('[setupAudioAPI] No audio engine available!');
        return;
      }

      const name = extractAudioName(nameOrHandle);
      console.log('[setupAudioAPI] Playing music:', name, 'volume:', volume ?? 1, 'loop:', loop ?? false);
      engine.playMusic(name, {
        volume: volume ?? 1,
        loop: loop ?? false,
      });
    }
  );

  engine.global.set('__audio_stopMusic', () => {
    getAudioEngine()?.stopMusic();
  });

  engine.global.set('__audio_pauseMusic', () => {
    getAudioEngine()?.pauseMusic();
  });

  engine.global.set('__audio_resumeMusic', () => {
    getAudioEngine()?.resumeMusic();
  });

  engine.global.set('__audio_setMusicVolume', (volume: number) => {
    getAudioEngine()?.setMusicVolume(volume);
  });

  engine.global.set('__audio_isMusicPlaying', () => {
    return getAudioEngine()?.isMusicPlaying() ?? false;
  });

  engine.global.set('__audio_getMusicTime', () => {
    return getAudioEngine()?.getMusicTime() ?? 0;
  });

  engine.global.set('__audio_getMusicDuration', () => {
    return getAudioEngine()?.getMusicDuration() ?? 0;
  });

  // --- Global audio control ---

  engine.global.set('__audio_setMasterVolume', (volume: number) => {
    getAudioEngine()?.setMasterVolume(volume);
  });

  engine.global.set('__audio_getMasterVolume', () => {
    return getAudioEngine()?.getMasterVolume() ?? 1;
  });

  engine.global.set('__audio_mute', () => {
    getAudioEngine()?.mute();
  });

  engine.global.set('__audio_unmute', () => {
    getAudioEngine()?.unmute();
  });

  engine.global.set('__audio_isMuted', () => {
    return getAudioEngine()?.isMuted() ?? false;
  });
}
