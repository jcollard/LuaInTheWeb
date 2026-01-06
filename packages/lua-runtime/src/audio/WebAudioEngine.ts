/* eslint-disable max-lines */
// This file implements a complete audio engine with sound, music, and channel APIs.
// Splitting would reduce cohesion without improving maintainability.

import type { IAudioEngine, MusicOptions, MusicHandle } from './IAudioEngine.js';

/**
 * Internal channel state for tracking channel playback.
 */
interface ChannelState {
  /** The gain node for volume control */
  gainNode: GainNode;
  /** Current source node (null if stopped) */
  source: AudioBufferSourceNode | null;
  /** Current audio buffer */
  buffer: AudioBuffer | null;
  /** Whether the channel is currently playing */
  isPlaying: boolean;
  /** Current volume (0-1) */
  volume: number;
  /** Whether looping is enabled */
  loop: boolean;
  /** Name of current audio asset */
  currentAudioName: string;
  /** When playback started */
  startTime: number;
  /** Position when paused */
  pausedAt: number;
  /** Whether a fade is in progress */
  isFading: boolean;
  /** Fade target volume */
  fadeTargetVolume: number;
  /** Fade start time */
  fadeStartTime: number;
  /** Fade duration */
  fadeDuration: number;
  /** Parent channel name (null = connected to master) */
  parentName: string | null;
}

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
 * Pending channel operation for deferred execution.
 * Used when channel operations are called before audio is initialized.
 */
interface PendingChannelOp {
  type: 'create' | 'setParent' | 'setVolume';
  name: string;
  parentName?: string | null;
  volume?: number;
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
  private channels: Map<string, ChannelState> = new Map();
  private masterVolume = 1;
  private muted = false;
  private initialized = false;
  private audioAvailable = false;
  /** Promise for in-progress initialization to prevent race conditions */
  private initializePromise: Promise<void> | null = null;
  /** Pending channel operations to replay after initialization */
  private pendingChannelOps: PendingChannelOp[] = [];

  /**
   * Initialize the audio engine.
   * Creates the AudioContext and master gain node.
   * Uses a promise to prevent race conditions from concurrent calls.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // If initialization is already in progress, wait for it
    if (this.initializePromise) {
      return this.initializePromise;
    }

    // Start initialization and store the promise
    this.initializePromise = this.doInitialize();

    try {
      await this.initializePromise;
    } finally {
      this.initializePromise = null;
    }
  }

  /**
   * Internal initialization logic.
   */
  private async doInitialize(): Promise<void> {
    try {
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

      this.audioAvailable = true;
    } catch (error) {
      console.warn('AudioContext creation failed:', error);
      this.audioContext = null;
      this.masterGainNode = null;
      this.audioAvailable = false;
    }

    this.initialized = true;

    // Replay any pending channel operations that were queued before initialization
    this.replayPendingChannelOps();
  }

  /**
   * Replay pending channel operations that were queued before audio was initialized.
   */
  private replayPendingChannelOps(): void {
    for (const op of this.pendingChannelOps) {
      if (op.type === 'create') {
        this.createChannel(op.name, op.parentName ?? undefined);
      } else if (op.type === 'setParent') {
        this.setChannelParent(op.name, op.parentName ?? null);
      } else if (op.type === 'setVolume' && op.volume !== undefined) {
        this.setChannelVolume(op.name, op.volume);
      }
    }
    this.pendingChannelOps = [];
  }

  /**
   * Check if the audio engine is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if audio is available and functional.
   */
  isAudioAvailable(): boolean {
    return this.audioAvailable;
  }

  /**
   * Decode audio data and store it by name.
   */
  async decodeAudio(name: string, data: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      // Audio not available - silently skip
      return;
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
    if (!this.audioContext || !this.masterGainNode) {
      return;
    }

    const buffer = this.audioBuffers.get(name);
    if (!buffer) {
      console.warn(`Sound not found: ${name}`);
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

    // Stop all channels
    for (const [name] of this.channels) {
      this.destroyChannel(name);
    }
    this.channels.clear();

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
    this.initializePromise = null;
  }

  // --- Channel API ---

  createChannel(name: string, parentName?: string): void {
    // If audio not ready, queue the operation for later
    if (!this.initialized) {
      this.pendingChannelOps.push({ type: 'create', name, parentName });
      return;
    }

    if (!this.audioContext || !this.masterGainNode || this.channels.has(name)) {
      return;
    }

    // Determine parent gain node
    const parentGain = parentName
      ? this.channels.get(parentName)?.gainNode ?? this.masterGainNode
      : this.masterGainNode;

    const gainNode = this.audioContext.createGain();
    gainNode.connect(parentGain);

    this.channels.set(name, {
      gainNode,
      source: null,
      buffer: null,
      isPlaying: false,
      volume: 1,
      loop: false,
      currentAudioName: '',
      startTime: 0,
      pausedAt: 0,
      isFading: false,
      fadeTargetVolume: 1,
      fadeStartTime: 0,
      fadeDuration: 0,
      parentName: parentName ?? null,
    });
  }

  getChannelParent(name: string): string | null {
    return this.channels.get(name)?.parentName ?? null;
  }

  setChannelParent(name: string, parentName: string | null): void {
    // If audio not ready, queue the operation for later
    if (!this.initialized) {
      this.pendingChannelOps.push({ type: 'setParent', name, parentName });
      return;
    }

    const state = this.channels.get(name);
    if (!state || !this.masterGainNode) return;

    const newParent = parentName
      ? this.channels.get(parentName)?.gainNode ?? this.masterGainNode
      : this.masterGainNode;

    state.gainNode.disconnect();
    state.gainNode.connect(newParent);
    state.parentName = parentName;
  }

  getEffectiveVolume(name: string): number {
    let volume = 1;
    let currentName: string | null = name;

    while (currentName) {
      const state = this.channels.get(currentName);
      if (!state) break;
      volume *= state.volume;
      currentName = state.parentName;
    }

    return volume * this.masterVolume;
  }

  destroyChannel(name: string): void {
    const state = this.channels.get(name);
    if (!state) return;

    if (state.source) {
      try {
        state.source.stop();
      } catch {
        // Already stopped
      }
      state.source.disconnect();
    }
    state.gainNode.disconnect();
    this.channels.delete(name);
  }

  playOnChannel(
    channel: string,
    audioName: string,
    volume = 1,
    loop = false,
    startTime = 0
  ): void {
    // Auto-create channel if it doesn't exist (handles deferred creation)
    if (!this.channels.has(channel)) {
      this.createChannel(channel);
    }

    const state = this.channels.get(channel);
    if (!state || !this.audioContext) return;

    const buffer = this.audioBuffers.get(audioName);
    if (!buffer) {
      console.warn(`Audio not found: ${audioName}`);
      return;
    }

    // Stop current playback
    if (state.source) {
      try {
        state.source.stop();
      } catch {
        // Already stopped
      }
      state.source.disconnect();
    }

    // Normalize start time to be within buffer duration
    const normalizedStartTime = loop
      ? startTime % buffer.duration
      : Math.min(startTime, buffer.duration);

    // Create new source
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.connect(state.gainNode);

    source.onended = () => {
      if (state.source === source) {
        state.isPlaying = false;
      }
    };

    // Set volume - just this channel's volume, hierarchy is handled by gain node chain
    // Muting is handled by masterGainNode, not individual channels
    state.gainNode.gain.value = volume;

    state.source = source;
    state.buffer = buffer;
    state.isPlaying = true;
    state.volume = volume;
    state.loop = loop;
    state.currentAudioName = audioName;
    state.startTime = this.audioContext.currentTime - normalizedStartTime;
    state.pausedAt = 0;

    source.start(0, normalizedStartTime);
  }

  stopChannel(channel: string): void {
    const state = this.channels.get(channel);
    if (!state) return;

    if (state.source) {
      try {
        state.source.stop();
      } catch {
        // Already stopped
      }
      state.source.disconnect();
      state.source = null;
    }
    state.isPlaying = false;
    state.currentAudioName = '';
    state.buffer = null;
  }

  pauseChannel(channel: string): void {
    const state = this.channels.get(channel);
    if (!state || !state.isPlaying || !this.audioContext) return;

    const elapsed = this.audioContext.currentTime - state.startTime;
    state.pausedAt = state.buffer ? elapsed % state.buffer.duration : 0;
    state.isPlaying = false;

    if (state.source) {
      try {
        state.source.stop();
      } catch {
        // Already stopped
      }
      state.source.disconnect();
      state.source = null;
    }
  }

  resumeChannel(channel: string): void {
    const state = this.channels.get(channel);
    if (!state || state.isPlaying || !state.buffer || !this.audioContext) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = state.buffer;
    source.loop = state.loop;
    source.connect(state.gainNode);

    source.onended = () => {
      if (state.source === source) {
        state.isPlaying = false;
      }
    };

    state.source = source;
    state.isPlaying = true;
    state.startTime = this.audioContext.currentTime - state.pausedAt;

    source.start(0, state.pausedAt);
  }

  setChannelVolume(channel: string, volume: number): void {
    // If audio not ready, queue the operation for later
    if (!this.initialized) {
      this.pendingChannelOps.push({ type: 'setVolume', name: channel, volume });
      return;
    }

    const state = this.channels.get(channel);
    if (!state) return;

    state.volume = Math.max(0, Math.min(1, volume));
    // Just set this channel's volume - the gain node chain handles hierarchy
    // masterVolume is applied at masterGainNode, muting handled there too
    state.gainNode.gain.value = state.volume;
  }

  getChannelVolume(channel: string): number {
    return this.channels.get(channel)?.volume ?? 0;
  }

  fadeChannelTo(channel: string, targetVolume: number, duration: number): void {
    const state = this.channels.get(channel);
    if (!state || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    // Fade to this channel's target volume - hierarchy and muting handled by gain node chain

    state.gainNode.gain.cancelScheduledValues(now);
    state.gainNode.gain.setValueAtTime(state.gainNode.gain.value, now);
    state.gainNode.gain.linearRampToValueAtTime(targetVolume, now + duration);

    state.isFading = true;
    state.fadeStartTime = now;
    state.fadeDuration = duration;
    state.fadeTargetVolume = targetVolume;
    state.volume = targetVolume;

    // Clear fade flag after duration
    setTimeout(() => {
      if (state.fadeStartTime === now) {
        state.isFading = false;
      }
    }, duration * 1000);
  }

  isChannelPlaying(channel: string): boolean {
    return this.channels.get(channel)?.isPlaying ?? false;
  }

  isChannelFading(channel: string): boolean {
    return this.channels.get(channel)?.isFading ?? false;
  }

  getChannelTime(channel: string): number {
    const state = this.channels.get(channel);
    if (!state || !this.audioContext) return 0;

    if (!state.isPlaying) {
      return state.pausedAt;
    }

    const elapsed = this.audioContext.currentTime - state.startTime;
    return state.buffer ? elapsed % state.buffer.duration : 0;
  }

  getChannelDuration(channel: string): number {
    return this.channels.get(channel)?.buffer?.duration ?? 0;
  }

  getChannelAudio(channel: string): string {
    return this.channels.get(channel)?.currentAudioName ?? '';
  }
}
