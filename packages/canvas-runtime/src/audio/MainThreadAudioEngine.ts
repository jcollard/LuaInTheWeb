/**
 * Main thread audio engine for canvas games.
 * Processes audio commands from the worker and manages playback.
 */

import type { AudioState, ChannelAudioState } from '../shared/types.js';

/**
 * Internal music state for tracking playback.
 */
interface MusicState {
  /** Name of the music track */
  name: string;
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
 * Internal state for a named audio channel.
 */
interface ChannelState {
  /** Name of the channel */
  name: string;
  /** The audio buffer being played (null if none) */
  buffer: AudioBuffer | null;
  /** The current source node (null if not playing) */
  source: AudioBufferSourceNode | null;
  /** Gain node for channel volume control */
  gainNode: GainNode;
  /** Whether audio is currently playing on this channel */
  isPlaying: boolean;
  /** When playback started (for calculating current time) */
  startTime: number;
  /** Position when paused (for resuming) */
  pausedAt: number;
  /** Whether looping is enabled */
  loop: boolean;
  /** Current logical volume (0-1) before fades */
  volume: number;
  /** Name of the audio asset currently loaded */
  currentAudioName: string;
  /** Whether a fade is currently in progress */
  isFading: boolean;
  /** Start time of the current fade */
  fadeStartTime: number;
  /** Starting volume of the current fade */
  fadeStartVolume: number;
  /** Target volume of the current fade */
  fadeTargetVolume: number;
  /** Duration of the current fade in seconds */
  fadeDuration: number;
}

/**
 * Main thread audio engine using Web Audio API.
 * Provides low-latency audio playback for games.
 */
export class MainThreadAudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private musicState: MusicState | null = null;
  private channels: Map<string, ChannelState> = new Map();
  private masterVolume = 1;
  private muted = false;
  private initialized = false;
  private audioAvailable = false;

  /**
   * Initialize the audio engine.
   * Creates the AudioContext and master gain node.
   * If AudioContext creation fails, the engine will be initialized but audio will be unavailable.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Create AudioContext - may throw in restricted environments (e.g., Electron without audio)
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
      // AudioContext creation failed - audio will be disabled but app continues
      console.warn('AudioContext creation failed, audio will be disabled:', error);
      this.audioContext = null;
      this.masterGainNode = null;
      this.audioAvailable = false;
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
   * Check if audio is available and functional.
   * Returns false if AudioContext creation failed.
   */
  isAudioAvailable(): boolean {
    return this.audioAvailable;
  }

  /**
   * Decode audio data and store it by name.
   * Silently returns if audio is not available.
   */
  async decodeAudio(name: string, data: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      // Audio not available - silently skip decoding
      console.warn(`Cannot decode audio '${name}': audio not available`);
      return;
    }

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(data);
      this.audioBuffers.set(name, audioBuffer);
    } catch (error) {
      console.warn(`Failed to decode audio '${name}':`, error);
    }
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
  playMusic(name: string, volume = 1, loop = false): void {
    if (!this.audioContext || !this.masterGainNode) {
      return;
    }

    const buffer = this.audioBuffers.get(name);
    if (!buffer) {
      console.warn(`Music not found: ${name}`);
      return;
    }

    // Stop any currently playing music
    this.stopMusicInternal();

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
      name,
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
   * Get the name of the currently playing/paused music.
   */
  getCurrentMusicName(): string {
    return this.musicState?.name ?? '';
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
    // Mute all channels
    for (const state of this.channels.values()) {
      if (this.audioContext) {
        state.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        state.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      }
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
    // Unmute all channels
    for (const state of this.channels.values()) {
      if (this.audioContext) {
        const effectiveVolume = state.volume * this.masterVolume;
        state.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        state.gainNode.gain.setValueAtTime(effectiveVolume, this.audioContext.currentTime);
      }
    }
  }

  /**
   * Check if audio is muted.
   */
  isMuted(): boolean {
    return this.muted;
  }

  // ==========================================================================
  // Audio Channel API
  // ==========================================================================

  /**
   * Create a named audio channel.
   * If the channel already exists, this is a no-op.
   */
  createChannel(name: string): void {
    if (this.channels.has(name)) {
      return; // Channel already exists
    }

    if (!this.audioContext || !this.masterGainNode) {
      console.warn('Cannot create channel: audio engine not initialized');
      return;
    }

    // Create gain node for this channel
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = this.muted ? 0 : 1;
    gainNode.connect(this.masterGainNode);

    const state: ChannelState = {
      name,
      buffer: null,
      source: null,
      gainNode,
      isPlaying: false,
      startTime: 0,
      pausedAt: 0,
      loop: false,
      volume: 1,
      currentAudioName: '',
      isFading: false,
      fadeStartTime: 0,
      fadeStartVolume: 0,
      fadeTargetVolume: 0,
      fadeDuration: 0,
    };

    this.channels.set(name, state);
  }

  /**
   * Destroy a named audio channel, stopping any audio on it.
   */
  destroyChannel(name: string): void {
    const state = this.channels.get(name);
    if (!state) {
      return;
    }

    // Stop any playing audio
    this.stopChannelInternal(state);

    // Disconnect and remove
    state.gainNode.disconnect();
    this.channels.delete(name);
  }

  /**
   * Stop audio on a channel (internal helper).
   */
  private stopChannelInternal(state: ChannelState): void {
    if (state.source) {
      try {
        state.source.stop();
      } catch {
        // Source may already be stopped
      }
      state.source.disconnect();
      state.source = null;
    }
    state.isPlaying = false;
    state.pausedAt = 0;
    state.isFading = false;
  }

  /**
   * Play audio on a specific channel.
   * Replaces any audio currently playing on that channel.
   */
  playOnChannel(channelName: string, audioName: string, volume = 1, loop = false): void {
    const state = this.channels.get(channelName);
    if (!state || !this.audioContext) {
      console.warn(`Channel not found: ${channelName}`);
      return;
    }

    const buffer = this.audioBuffers.get(audioName);
    if (!buffer) {
      console.warn(`Audio not found: ${audioName}`);
      return;
    }

    // Stop any currently playing audio on this channel
    this.stopChannelInternal(state);

    // Update state
    state.buffer = buffer;
    state.volume = Math.max(0, Math.min(1, volume));
    state.loop = loop;
    state.currentAudioName = audioName;
    state.isFading = false;

    // Set gain (respecting mute and master volume)
    const effectiveVolume = this.muted ? 0 : state.volume * this.masterVolume;
    state.gainNode.gain.setValueAtTime(effectiveVolume, this.audioContext.currentTime);

    // Create and configure source
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.connect(state.gainNode);

    // Set up ended callback
    source.onended = () => {
      if (state.source === source) {
        state.isPlaying = false;
      }
    };

    state.source = source;
    state.isPlaying = true;
    state.startTime = this.audioContext.currentTime;
    state.pausedAt = 0;

    // Start playback
    source.start(0);
  }

  /**
   * Stop audio on a specific channel.
   */
  stopChannel(channelName: string): void {
    const state = this.channels.get(channelName);
    if (state) {
      this.stopChannelInternal(state);
      state.buffer = null;
      state.currentAudioName = '';
    }
  }

  /**
   * Pause audio on a specific channel.
   */
  pauseChannel(channelName: string): void {
    const state = this.channels.get(channelName);
    if (!state || !state.isPlaying || !this.audioContext) {
      return;
    }

    // Calculate how far into the track we are
    const elapsed = this.audioContext.currentTime - state.startTime;
    if (state.buffer) {
      state.pausedAt = elapsed % state.buffer.duration;
    }
    state.isPlaying = false;

    // Stop the current source
    if (state.source) {
      try {
        state.source.stop();
      } catch {
        // Source may already be stopped
      }
      state.source.disconnect();
      state.source = null;
    }
  }

  /**
   * Resume paused audio on a specific channel.
   */
  resumeChannel(channelName: string): void {
    const state = this.channels.get(channelName);
    if (!state || state.isPlaying || !state.buffer || !this.audioContext) {
      return;
    }

    // Create new source and start from paused position
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

  /**
   * Set the volume on a specific channel (immediate).
   */
  setChannelVolume(channelName: string, volume: number): void {
    const state = this.channels.get(channelName);
    if (!state || !this.audioContext) {
      return;
    }

    state.volume = Math.max(0, Math.min(1, volume));
    const effectiveVolume = this.muted ? 0 : state.volume * this.masterVolume;

    // Cancel any scheduled values and set immediately
    state.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
    state.gainNode.gain.setValueAtTime(effectiveVolume, this.audioContext.currentTime);
    state.isFading = false;
  }

  /**
   * Get the current volume of a channel.
   */
  getChannelVolume(channelName: string): number {
    const state = this.channels.get(channelName);
    return state?.volume ?? 0;
  }

  /**
   * Fade channel volume over time using Web Audio scheduling.
   */
  fadeChannelTo(channelName: string, targetVolume: number, duration: number): void {
    const state = this.channels.get(channelName);
    if (!state || !this.audioContext) {
      return;
    }

    const now = this.audioContext.currentTime;
    const currentGain = state.gainNode.gain.value;
    const clampedTarget = Math.max(0, Math.min(1, targetVolume));

    // Cancel any existing scheduled values
    state.gainNode.gain.cancelScheduledValues(now);

    // Set current value explicitly to avoid jumps
    state.gainNode.gain.setValueAtTime(currentGain, now);

    // Calculate effective target (respecting mute and master volume)
    const effectiveTarget = this.muted ? 0 : clampedTarget * this.masterVolume;

    // Schedule the ramp
    state.gainNode.gain.linearRampToValueAtTime(effectiveTarget, now + duration);

    // Track fade state
    state.isFading = true;
    state.fadeStartTime = now;
    state.fadeStartVolume = state.volume;
    state.fadeTargetVolume = clampedTarget;
    state.fadeDuration = duration;

    // Update logical volume to target
    state.volume = clampedTarget;
  }

  /**
   * Check if a channel is currently playing.
   */
  isChannelPlaying(channelName: string): boolean {
    return this.channels.get(channelName)?.isPlaying ?? false;
  }

  /**
   * Check if a channel is currently fading.
   */
  isChannelFading(channelName: string): boolean {
    const state = this.channels.get(channelName);
    if (!state || !state.isFading || !this.audioContext) {
      return false;
    }

    // Check if fade has completed
    const elapsed = this.audioContext.currentTime - state.fadeStartTime;
    if (elapsed >= state.fadeDuration) {
      state.isFading = false;
      return false;
    }

    return true;
  }

  /**
   * Get the current playback time of a channel.
   */
  getChannelTime(channelName: string): number {
    const state = this.channels.get(channelName);
    if (!state || !this.audioContext || !state.buffer) {
      return 0;
    }

    if (!state.isPlaying) {
      return state.pausedAt;
    }

    const elapsed = this.audioContext.currentTime - state.startTime;
    return elapsed % state.buffer.duration;
  }

  /**
   * Get the duration of audio on a channel.
   */
  getChannelDuration(channelName: string): number {
    return this.channels.get(channelName)?.buffer?.duration ?? 0;
  }

  /**
   * Get the name of audio currently on a channel.
   */
  getChannelAudio(channelName: string): string {
    return this.channels.get(channelName)?.currentAudioName ?? '';
  }

  /**
   * Get the state of a channel for syncing to the worker.
   */
  private getChannelState(state: ChannelState): ChannelAudioState {
    // Update fade state
    if (state.isFading && this.audioContext) {
      const elapsed = this.audioContext.currentTime - state.fadeStartTime;
      if (elapsed >= state.fadeDuration) {
        state.isFading = false;
      }
    }

    return {
      name: state.name,
      isPlaying: state.isPlaying,
      volume: state.volume,
      currentTime: this.getChannelTime(state.name),
      duration: state.buffer?.duration ?? 0,
      currentAudioName: state.currentAudioName,
      loop: state.loop,
      isFading: state.isFading,
      fadeTargetVolume: state.fadeTargetVolume,
    };
  }

  /**
   * Get the current audio state for syncing to the worker.
   */
  getAudioState(): AudioState {
    // Build channel states
    const channelStates: Record<string, ChannelAudioState> = {};
    for (const [name, state] of this.channels) {
      channelStates[name] = this.getChannelState(state);
    }

    return {
      muted: this.muted,
      masterVolume: this.masterVolume,
      musicPlaying: this.isMusicPlaying(),
      musicTime: this.getMusicTime(),
      musicDuration: this.getMusicDuration(),
      currentMusicName: this.getCurrentMusicName(),
      channels: channelStates,
      contextSuspended: this.isContextSuspended(),
    };
  }

  /**
   * Check if the AudioContext is suspended (awaiting user interaction).
   */
  isContextSuspended(): boolean {
    return this.audioContext?.state === 'suspended';
  }

  /**
   * Resume the AudioContext if suspended.
   * Call this on user interaction to handle autoplay policy.
   */
  async resumeContext(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Clean up all resources.
   */
  dispose(): void {
    // Stop music
    this.stopMusicInternal();

    // Stop and clean up all channels
    for (const state of this.channels.values()) {
      this.stopChannelInternal(state);
      state.gainNode.disconnect();
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
    this.audioAvailable = false;
  }
}
