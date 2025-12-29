import type { IAudioEngine, MusicOptions, MusicHandle } from './IAudioEngine.js';

/**
 * Internal music state for tracking playback.
 */
interface MusicState {
  /** The audio buffer being played */
  buffer: AudioBuffer;
  /** The current source node (recreated on pause/resume) */
  source: AudioBufferSourceNode | null;
  /** Gain node for music volume control */
  gainNode: GainNode;
  /** Whether the music is currently playing */
  isPlaying: boolean;
  /** When playback started (for calculating current time) */
  startTime: number;
  /** Position when paused (for resuming) */
  pausedAt: number;
  /** Whether looping is enabled */
  loop: boolean;
  /** Current volume (0-1) */
  volume: number;
}

/**
 * Web Audio API implementation of IAudioEngine.
 * Provides low-latency audio playback for games.
 */
export class WebAudioEngine implements IAudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private musicState: MusicState | null = null;
  private masterVolume = 1;
  private muted = false;
  private initialized = false;

  /**
   * Initialize the audio engine.
   * Creates the AudioContext and master gain node.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Create AudioContext
    this.audioContext = new AudioContext();

    // Create master gain node for global volume control
    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.connect(this.audioContext.destination);
    this.masterGainNode.gain.value = this.masterVolume;

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.initialized = true;
  }

  /**
   * Check if the audio engine is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Decode audio data and store it by name.
   */
  async decodeAudio(name: string, data: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio engine not initialized');
    }

    const audioBuffer = await this.audioContext.decodeAudioData(data);
    this.audioBuffers.set(name, audioBuffer);
  }

  /**
   * Check if an audio asset has been loaded.
   */
  hasAudio(name: string): boolean {
    return this.audioBuffers.has(name);
  }

  /**
   * Play a sound effect.
   */
  playSound(name: string, volume = 1): void {
    console.log('[WebAudioEngine] playSound called:', name, volume);
    console.log('[WebAudioEngine] audioContext:', this.audioContext?.state);
    console.log('[WebAudioEngine] Available buffers:', Array.from(this.audioBuffers.keys()));

    if (!this.audioContext || !this.masterGainNode) {
      console.log('[WebAudioEngine] No audio context or master gain!');
      return;
    }

    const buffer = this.audioBuffers.get(name);
    if (!buffer) {
      console.warn(`[WebAudioEngine] Sound not found: ${name}`);
      return;
    }

    // Create source and gain nodes
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;

    // Apply volume (affected by mute)
    const effectiveVolume = this.muted ? 0 : volume;
    gainNode.gain.value = effectiveVolume;

    // Connect: source -> gain -> master -> destination
    source.connect(gainNode);
    gainNode.connect(this.masterGainNode);

    // Play immediately
    source.start(0);
  }

  /**
   * Get the duration of a sound in seconds.
   */
  getSoundDuration(name: string): number {
    const buffer = this.audioBuffers.get(name);
    return buffer?.duration ?? 0;
  }

  /**
   * Play background music.
   */
  playMusic(name: string, options?: MusicOptions): MusicHandle | null {
    if (!this.audioContext || !this.masterGainNode) {
      return null;
    }

    const buffer = this.audioBuffers.get(name);
    if (!buffer) {
      console.warn(`Music not found: ${name}`);
      return null;
    }

    // Stop any currently playing music
    this.stopMusicInternal();

    const volume = options?.volume ?? 1;
    const loop = options?.loop ?? false;

    // Create gain node for this music track
    const gainNode = this.audioContext.createGain();
    const effectiveVolume = this.muted ? 0 : volume * this.masterVolume;
    gainNode.gain.value = effectiveVolume;
    gainNode.connect(this.masterGainNode);

    // Create and configure source
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.connect(gainNode);

    // Set up ended callback
    source.onended = () => {
      if (this.musicState?.source === source) {
        this.musicState.isPlaying = false;
      }
    };

    // Store state
    this.musicState = {
      buffer,
      source,
      gainNode,
      isPlaying: true,
      startTime: this.audioContext.currentTime,
      pausedAt: 0,
      loop,
      volume,
    };

    // Start playback
    source.start(0);

    // Return handle
    return this.createMusicHandle();
  }

  /**
   * Create a MusicHandle for the current music.
   */
  private createMusicHandle(): MusicHandle {
    return {
      stop: () => this.stopMusic(),
      pause: () => this.pauseMusic(),
      resume: () => this.resumeMusic(),
      setVolume: (v: number) => this.setMusicVolume(v),
      getVolume: () => this.musicState?.volume ?? 0,
      isPlaying: () => this.isMusicPlaying(),
      getCurrentTime: () => this.getMusicTime(),
      getDuration: () => this.getMusicDuration(),
    };
  }

  /**
   * Stop music playback (internal).
   */
  private stopMusicInternal(): void {
    if (this.musicState?.source) {
      try {
        this.musicState.source.stop();
      } catch {
        // Source may already be stopped
      }
      this.musicState.source.disconnect();
    }
    if (this.musicState?.gainNode) {
      this.musicState.gainNode.disconnect();
    }
    this.musicState = null;
  }

  /**
   * Stop the currently playing music.
   */
  stopMusic(): void {
    this.stopMusicInternal();
  }

  /**
   * Pause the currently playing music.
   */
  pauseMusic(): void {
    if (!this.musicState || !this.musicState.isPlaying || !this.audioContext) {
      return;
    }

    // Calculate how far into the track we are
    const elapsed = this.audioContext.currentTime - this.musicState.startTime;
    this.musicState.pausedAt = elapsed % this.musicState.buffer.duration;
    this.musicState.isPlaying = false;

    // Stop the current source
    if (this.musicState.source) {
      try {
        this.musicState.source.stop();
      } catch {
        // Source may already be stopped
      }
      this.musicState.source.disconnect();
      this.musicState.source = null;
    }
  }

  /**
   * Resume paused music.
   */
  resumeMusic(): void {
    if (!this.musicState || this.musicState.isPlaying || !this.audioContext) {
      return;
    }

    // Create new source and start from paused position
    const source = this.audioContext.createBufferSource();
    source.buffer = this.musicState.buffer;
    source.loop = this.musicState.loop;
    source.connect(this.musicState.gainNode);

    source.onended = () => {
      if (this.musicState?.source === source) {
        this.musicState.isPlaying = false;
      }
    };

    this.musicState.source = source;
    this.musicState.isPlaying = true;
    this.musicState.startTime = this.audioContext.currentTime - this.musicState.pausedAt;

    source.start(0, this.musicState.pausedAt);
  }

  /**
   * Set the volume of the currently playing music.
   */
  setMusicVolume(volume: number): void {
    if (!this.musicState) {
      return;
    }

    this.musicState.volume = Math.max(0, Math.min(1, volume));
    const effectiveVolume = this.muted ? 0 : this.musicState.volume * this.masterVolume;
    this.musicState.gainNode.gain.value = effectiveVolume;
  }

  /**
   * Check if music is currently playing.
   */
  isMusicPlaying(): boolean {
    return this.musicState?.isPlaying ?? false;
  }

  /**
   * Get the current music playback time in seconds.
   */
  getMusicTime(): number {
    if (!this.musicState || !this.audioContext) {
      return 0;
    }

    if (!this.musicState.isPlaying) {
      return this.musicState.pausedAt;
    }

    const elapsed = this.audioContext.currentTime - this.musicState.startTime;
    return elapsed % this.musicState.buffer.duration;
  }

  /**
   * Get the total duration of the current music in seconds.
   */
  getMusicDuration(): number {
    return this.musicState?.buffer.duration ?? 0;
  }

  /**
   * Set the master volume that affects all audio.
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));

    if (this.masterGainNode && !this.muted) {
      this.masterGainNode.gain.value = this.masterVolume;
    }

    // Update music volume
    if (this.musicState && !this.muted) {
      this.musicState.gainNode.gain.value = this.musicState.volume * this.masterVolume;
    }
  }

  /**
   * Get the current master volume.
   */
  getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Mute all audio.
   */
  mute(): void {
    this.muted = true;

    if (this.masterGainNode) {
      this.masterGainNode.gain.value = 0;
    }
    if (this.musicState) {
      this.musicState.gainNode.gain.value = 0;
    }
  }

  /**
   * Unmute all audio.
   */
  unmute(): void {
    this.muted = false;

    if (this.masterGainNode) {
      this.masterGainNode.gain.value = this.masterVolume;
    }
    if (this.musicState) {
      this.musicState.gainNode.gain.value = this.musicState.volume * this.masterVolume;
    }
  }

  /**
   * Check if audio is muted.
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Clean up all resources.
   */
  dispose(): void {
    // Stop music
    this.stopMusicInternal();

    // Clear buffers
    this.audioBuffers.clear();

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {
        // Ignore errors during cleanup
      });
    }

    this.audioContext = null;
    this.masterGainNode = null;
    this.initialized = false;
  }
}
