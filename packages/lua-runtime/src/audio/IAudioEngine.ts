/**
 * Options for playing music.
 */
export interface MusicOptions {
  /** Volume level from 0 to 1 (default: 1) */
  volume?: number;
  /** Whether to loop the music (default: false) */
  loop?: boolean;
}

/**
 * Handle for controlling a playing music track.
 */
export interface MusicHandle {
  /** Stop the music */
  stop(): void;
  /** Pause the music */
  pause(): void;
  /** Resume paused music */
  resume(): void;
  /** Set volume (0 to 1) */
  setVolume(volume: number): void;
  /** Get current volume */
  getVolume(): number;
  /** Check if music is currently playing */
  isPlaying(): boolean;
  /** Get current playback time in seconds */
  getCurrentTime(): number;
  /** Get total duration in seconds */
  getDuration(): number;
}

/**
 * Interface for the audio engine backend.
 * Abstracts the actual audio implementation (Web Audio API, etc.)
 * for testability and potential future flexibility.
 */
export interface IAudioEngine {
  /**
   * Initialize the audio engine.
   * May need to be called after user interaction due to browser autoplay policies.
   * @returns Promise that resolves when initialization is complete
   */
  initialize(): Promise<void>;

  /**
   * Check if the audio engine is initialized and ready.
   */
  isInitialized(): boolean;

  /**
   * Decode audio data from an ArrayBuffer.
   * @param name - Unique name for this audio asset
   * @param data - Raw audio data as ArrayBuffer
   * @returns Promise that resolves when decoding is complete
   */
  decodeAudio(name: string, data: ArrayBuffer): Promise<void>;

  /**
   * Check if an audio asset has been loaded.
   * @param name - The asset name
   */
  hasAudio(name: string): boolean;

  /**
   * Play a sound effect.
   * Sound effects can overlap and are fire-and-forget.
   * @param name - The registered asset name
   * @param volume - Volume from 0 to 1 (default: 1)
   */
  playSound(name: string, volume?: number): void;

  /**
   * Get the duration of a sound in seconds.
   * @param name - The registered asset name
   * @returns Duration in seconds, or 0 if not found
   */
  getSoundDuration(name: string): number;

  /**
   * Play background music.
   * Only one music track can play at a time; calling this stops any current music.
   * @param name - The registered asset name
   * @param options - Playback options (volume, loop)
   * @returns Handle for controlling the music, or null if playback failed
   */
  playMusic(name: string, options?: MusicOptions): MusicHandle | null;

  /**
   * Stop the currently playing music.
   */
  stopMusic(): void;

  /**
   * Pause the currently playing music.
   */
  pauseMusic(): void;

  /**
   * Resume paused music.
   */
  resumeMusic(): void;

  /**
   * Set the volume of the currently playing music.
   * @param volume - Volume from 0 to 1
   */
  setMusicVolume(volume: number): void;

  /**
   * Check if music is currently playing.
   */
  isMusicPlaying(): boolean;

  /**
   * Get the current music playback time in seconds.
   */
  getMusicTime(): number;

  /**
   * Get the total duration of the current music in seconds.
   */
  getMusicDuration(): number;

  /**
   * Set the master volume that affects all audio.
   * @param volume - Volume from 0 to 1
   */
  setMasterVolume(volume: number): void;

  /**
   * Get the current master volume.
   */
  getMasterVolume(): number;

  /**
   * Mute all audio.
   */
  mute(): void;

  /**
   * Unmute all audio.
   */
  unmute(): void;

  /**
   * Check if audio is muted.
   */
  isMuted(): boolean;

  /**
   * Clean up all resources.
   * Should be called when the audio engine is no longer needed.
   */
  dispose(): void;
}
