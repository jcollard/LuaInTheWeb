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
      const engine = getAudioEngine();
      if (!engine) return;

      const name = extractAudioName(nameOrHandle);
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
      const engine = getAudioEngine();
      if (!engine) return;

      const name = extractAudioName(nameOrHandle);
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

  // --- Channel functions ---

  engine.global.set(
    '__audio_channelCreate',
    (name: string, parentName?: string | null) => {
      getAudioEngine()?.createChannel(name, parentName ?? undefined);
    }
  );

  engine.global.set('__audio_channelGetParent', (name: string) => {
    return getAudioEngine()?.getChannelParent(name) ?? null;
  });

  engine.global.set(
    '__audio_channelSetParent',
    (name: string, parentName: string | null) => {
      getAudioEngine()?.setChannelParent(name, parentName);
    }
  );

  engine.global.set('__audio_channelGetEffectiveVolume', (name: string) => {
    return getAudioEngine()?.getEffectiveVolume(name) ?? 0;
  });

  engine.global.set('__audio_channelDestroy', (name: string) => {
    getAudioEngine()?.destroyChannel(name);
  });

  engine.global.set(
    '__audio_channelPlay',
    (
      channel: string,
      nameOrHandle: unknown,
      volume?: number | null,
      loop?: boolean | null,
      startTime?: number | null
    ) => {
      const audioEngine = getAudioEngine();
      if (!audioEngine) return;

      const audioName = extractAudioName(nameOrHandle);
      audioEngine.playOnChannel(
        channel,
        audioName,
        volume ?? 1,
        loop ?? false,
        startTime ?? 0
      );
    }
  );

  engine.global.set('__audio_channelStop', (channel: string) => {
    getAudioEngine()?.stopChannel(channel);
  });

  engine.global.set('__audio_channelPause', (channel: string) => {
    getAudioEngine()?.pauseChannel(channel);
  });

  engine.global.set('__audio_channelResume', (channel: string) => {
    getAudioEngine()?.resumeChannel(channel);
  });

  engine.global.set(
    '__audio_channelSetVolume',
    (channel: string, volume: number) => {
      getAudioEngine()?.setChannelVolume(channel, volume);
    }
  );

  engine.global.set('__audio_channelGetVolume', (channel: string) => {
    return getAudioEngine()?.getChannelVolume(channel) ?? 0;
  });

  engine.global.set(
    '__audio_channelFadeTo',
    (channel: string, targetVolume: number, duration: number) => {
      getAudioEngine()?.fadeChannelTo(channel, targetVolume, duration);
    }
  );

  engine.global.set('__audio_channelIsPlaying', (channel: string) => {
    return getAudioEngine()?.isChannelPlaying(channel) ?? false;
  });

  engine.global.set('__audio_channelIsFading', (channel: string) => {
    return getAudioEngine()?.isChannelFading(channel) ?? false;
  });

  engine.global.set('__audio_channelGetTime', (channel: string) => {
    return getAudioEngine()?.getChannelTime(channel) ?? 0;
  });

  engine.global.set('__audio_channelGetDuration', (channel: string) => {
    return getAudioEngine()?.getChannelDuration(channel) ?? 0;
  });

  engine.global.set('__audio_channelGetAudio', (channel: string) => {
    return getAudioEngine()?.getChannelAudio(channel) ?? '';
  });
}
