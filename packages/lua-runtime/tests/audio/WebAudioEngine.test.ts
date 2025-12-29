/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebAudioEngine } from '../../src/audio/WebAudioEngine.js';

// Mock AudioContext and related Web Audio API classes
class MockAudioBuffer {
  duration = 2.5;
  numberOfChannels = 2;
  sampleRate = 44100;
  length = 110250;
  getChannelData = vi.fn(() => new Float32Array(this.length));
}

class MockGainNode {
  gain = { value: 1, setValueAtTime: vi.fn() };
  connect = vi.fn(() => this);
  disconnect = vi.fn();
}

class MockAudioBufferSourceNode {
  buffer: MockAudioBuffer | null = null;
  loop = false;
  onended: (() => void) | null = null;
  connect = vi.fn(() => this);
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn(() => {
    if (this.onended) this.onended();
  });
}

class MockAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  destination = { connect: vi.fn() };
  currentTime = 0;

  createGain = vi.fn(() => new MockGainNode());
  createBufferSource = vi.fn(() => new MockAudioBufferSourceNode());

  decodeAudioData = vi.fn(
    (_data: ArrayBuffer): Promise<MockAudioBuffer> =>
      Promise.resolve(new MockAudioBuffer())
  );

  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });

  close = vi.fn(() => {
    this.state = 'closed';
    return Promise.resolve();
  });
}

describe('WebAudioEngine', () => {
  let engine: WebAudioEngine;

  beforeEach(() => {
    // Mock the global AudioContext
    (globalThis as unknown as { AudioContext: typeof MockAudioContext }).AudioContext =
      MockAudioContext as unknown as typeof AudioContext;

    engine = new WebAudioEngine();
  });

  afterEach(() => {
    engine.dispose();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should not be initialized before calling initialize()', () => {
      expect(engine.isInitialized()).toBe(false);
    });

    it('should be initialized after calling initialize()', async () => {
      await engine.initialize();
      expect(engine.isInitialized()).toBe(true);
    });

    it('should handle multiple initialize calls gracefully', async () => {
      await engine.initialize();
      await engine.initialize();
      expect(engine.isInitialized()).toBe(true);
    });
  });

  describe('audio decoding', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should decode and store audio data', async () => {
      const mockData = new ArrayBuffer(1024);
      await engine.decodeAudio('test-sound', mockData);
      expect(engine.hasAudio('test-sound')).toBe(true);
    });

    it('should return false for unloaded audio', () => {
      expect(engine.hasAudio('nonexistent')).toBe(false);
    });

    it('should throw when decoding before initialization', async () => {
      const uninitializedEngine = new WebAudioEngine();
      const mockData = new ArrayBuffer(1024);
      await expect(uninitializedEngine.decodeAudio('test', mockData)).rejects.toThrow(
        'Audio engine not initialized'
      );
    });
  });

  describe('sound effects', () => {
    beforeEach(async () => {
      await engine.initialize();
      await engine.decodeAudio('jump', new ArrayBuffer(1024));
    });

    it('should play a sound effect', () => {
      engine.playSound('jump');
      // Should not throw
    });

    it('should play a sound effect with volume', () => {
      engine.playSound('jump', 0.5);
      // Should not throw
    });

    it('should handle playing unknown sound gracefully', () => {
      // Should not throw, just log warning
      engine.playSound('unknown');
    });

    it('should return sound duration', () => {
      const duration = engine.getSoundDuration('jump');
      expect(duration).toBe(2.5); // From MockAudioBuffer
    });

    it('should return 0 for unknown sound duration', () => {
      expect(engine.getSoundDuration('unknown')).toBe(0);
    });
  });

  describe('music playback', () => {
    beforeEach(async () => {
      await engine.initialize();
      await engine.decodeAudio('bgm', new ArrayBuffer(1024));
    });

    it('should play music and return a handle', () => {
      const handle = engine.playMusic('bgm');
      expect(handle).not.toBeNull();
    });

    it('should play music with options', () => {
      const handle = engine.playMusic('bgm', { volume: 0.7, loop: true });
      expect(handle).not.toBeNull();
    });

    it('should return null when playing unknown music', () => {
      const handle = engine.playMusic('unknown');
      expect(handle).toBeNull();
    });

    it('should stop current music when playing new music', () => {
      engine.playMusic('bgm');
      expect(engine.isMusicPlaying()).toBe(true);

      // Play new music
      engine.playMusic('bgm');
      // Previous should have been stopped
    });

    it('should stop music', () => {
      engine.playMusic('bgm');
      engine.stopMusic();
      expect(engine.isMusicPlaying()).toBe(false);
    });

    it('should pause and resume music', () => {
      engine.playMusic('bgm');
      expect(engine.isMusicPlaying()).toBe(true);

      engine.pauseMusic();
      expect(engine.isMusicPlaying()).toBe(false);

      engine.resumeMusic();
      expect(engine.isMusicPlaying()).toBe(true);
    });

    it('should set music volume', () => {
      engine.playMusic('bgm');
      engine.setMusicVolume(0.3);
      // Should not throw
    });

    it('should handle pause when no music is playing', () => {
      engine.pauseMusic(); // Should not throw
    });

    it('should handle resume when no music is playing', () => {
      engine.resumeMusic(); // Should not throw
    });
  });

  describe('master volume', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should have default master volume of 1', () => {
      expect(engine.getMasterVolume()).toBe(1);
    });

    it('should set master volume', () => {
      engine.setMasterVolume(0.5);
      expect(engine.getMasterVolume()).toBe(0.5);
    });

    it('should clamp master volume to 0-1 range', () => {
      engine.setMasterVolume(-0.5);
      expect(engine.getMasterVolume()).toBe(0);

      engine.setMasterVolume(1.5);
      expect(engine.getMasterVolume()).toBe(1);
    });
  });

  describe('mute', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should not be muted by default', () => {
      expect(engine.isMuted()).toBe(false);
    });

    it('should mute audio', () => {
      engine.mute();
      expect(engine.isMuted()).toBe(true);
    });

    it('should unmute audio', () => {
      engine.mute();
      engine.unmute();
      expect(engine.isMuted()).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should dispose without errors', async () => {
      await engine.initialize();
      await engine.decodeAudio('test', new ArrayBuffer(1024));
      engine.playMusic('test');

      engine.dispose();
      expect(engine.isInitialized()).toBe(false);
    });

    it('should handle dispose when not initialized', () => {
      engine.dispose(); // Should not throw
    });
  });
});
