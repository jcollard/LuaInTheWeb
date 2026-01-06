/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MainThreadAudioEngine } from '../../src/audio/MainThreadAudioEngine.js';

/**
 * Mock AudioContext that throws on construction.
 * Simulates environments where audio is not available (e.g., Electron without audio device).
 */
class FailingAudioContext {
  constructor() {
    throw new Error('AudioContext not supported');
  }
}

/**
 * Mock AudioContext that succeeds.
 * Provides minimal implementation for testing.
 */
class MockAudioContext {
  state: 'suspended' | 'running' = 'running';
  destination = {};
  currentTime = 0;

  createGain = vi.fn(() => ({
    gain: { value: 1, setValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));

  createBufferSource = vi.fn(() => ({
    buffer: null,
    loop: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  }));

  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });

  decodeAudioData = vi.fn(() =>
    Promise.resolve({ duration: 1, length: 44100, sampleRate: 44100 })
  );

  close = vi.fn(() => Promise.resolve());
}

describe('MainThreadAudioEngine', () => {
  let originalAudioContext: typeof globalThis.AudioContext;

  beforeEach(() => {
    // Save original AudioContext
    originalAudioContext = globalThis.AudioContext;
  });

  afterEach(() => {
    // Restore original AudioContext
    globalThis.AudioContext = originalAudioContext;
    vi.clearAllMocks();
  });

  describe('initialize() with AudioContext failure', () => {
    beforeEach(() => {
      // @ts-expect-error - Mock AudioContext for testing
      globalThis.AudioContext = FailingAudioContext;
    });

    it('should not throw when AudioContext creation fails', async () => {
      const engine = new MainThreadAudioEngine();
      await expect(engine.initialize()).resolves.not.toThrow();
    });

    it('should report audio unavailable after failed init', async () => {
      const engine = new MainThreadAudioEngine();
      await engine.initialize();
      expect(engine.isAudioAvailable()).toBe(false);
    });

    it('should still report as initialized after failed init', async () => {
      const engine = new MainThreadAudioEngine();
      await engine.initialize();
      expect(engine.isInitialized()).toBe(true);
    });

    it('should be idempotent when called multiple times', async () => {
      const engine = new MainThreadAudioEngine();
      await engine.initialize();
      await engine.initialize();
      expect(engine.isInitialized()).toBe(true);
      expect(engine.isAudioAvailable()).toBe(false);
    });
  });

  describe('initialize() with AudioContext success', () => {
    beforeEach(() => {
      // @ts-expect-error - Mock AudioContext for testing
      globalThis.AudioContext = MockAudioContext;
    });

    it('should report audio available after successful init', async () => {
      const engine = new MainThreadAudioEngine();
      await engine.initialize();
      expect(engine.isAudioAvailable()).toBe(true);
    });

    it('should report as initialized', async () => {
      const engine = new MainThreadAudioEngine();
      await engine.initialize();
      expect(engine.isInitialized()).toBe(true);
    });

    it('should create master gain node', async () => {
      const engine = new MainThreadAudioEngine();
      await engine.initialize();
      // If initialization succeeded, getMasterVolume should work
      expect(engine.getMasterVolume()).toBe(1);
    });
  });

  describe('decodeAudio() graceful degradation', () => {
    it('should not throw when audio is unavailable', async () => {
      // @ts-expect-error - Mock AudioContext for testing
      globalThis.AudioContext = FailingAudioContext;

      const engine = new MainThreadAudioEngine();
      await engine.initialize();

      const data = new ArrayBuffer(100);
      await expect(engine.decodeAudio('test', data)).resolves.not.toThrow();
    });

    it('should silently skip decoding when audio unavailable', async () => {
      // @ts-expect-error - Mock AudioContext for testing
      globalThis.AudioContext = FailingAudioContext;

      const engine = new MainThreadAudioEngine();
      await engine.initialize();

      const data = new ArrayBuffer(100);
      await engine.decodeAudio('test', data);

      expect(engine.hasAudio('test')).toBe(false);
    });

    it('should decode successfully when audio is available', async () => {
      // @ts-expect-error - Mock AudioContext for testing
      globalThis.AudioContext = MockAudioContext;

      const engine = new MainThreadAudioEngine();
      await engine.initialize();

      const data = new ArrayBuffer(100);
      await engine.decodeAudio('test', data);

      expect(engine.hasAudio('test')).toBe(true);
    });

    it('should handle decoding errors gracefully', async () => {
      // @ts-expect-error - Mock AudioContext for testing
      globalThis.AudioContext = class extends MockAudioContext {
        decodeAudioData = vi.fn(() => Promise.reject(new Error('Decode failed')));
      };

      const engine = new MainThreadAudioEngine();
      await engine.initialize();

      const data = new ArrayBuffer(100);
      // Should not throw
      await expect(engine.decodeAudio('test', data)).resolves.not.toThrow();
      expect(engine.hasAudio('test')).toBe(false);
    });
  });

  describe('playSound() graceful degradation', () => {
    it('should silently return when audio is unavailable', async () => {
      // @ts-expect-error - Mock AudioContext for testing
      globalThis.AudioContext = FailingAudioContext;

      const engine = new MainThreadAudioEngine();
      await engine.initialize();

      // Should not throw
      expect(() => engine.playSound('test')).not.toThrow();
    });

    it('should silently return when sound is not loaded', async () => {
      // @ts-expect-error - Mock AudioContext for testing
      globalThis.AudioContext = MockAudioContext;

      const engine = new MainThreadAudioEngine();
      await engine.initialize();

      // Should not throw even when sound doesn't exist
      expect(() => engine.playSound('nonexistent')).not.toThrow();
    });
  });

  describe('playMusic() graceful degradation', () => {
    it('should silently return when audio is unavailable', async () => {
      // @ts-expect-error - Mock AudioContext for testing
      globalThis.AudioContext = FailingAudioContext;

      const engine = new MainThreadAudioEngine();
      await engine.initialize();

      expect(() => engine.playMusic('test')).not.toThrow();
    });
  });

  describe('createChannel() graceful degradation', () => {
    it('should silently return when audio is unavailable', async () => {
      // @ts-expect-error - Mock AudioContext for testing
      globalThis.AudioContext = FailingAudioContext;

      const engine = new MainThreadAudioEngine();
      await engine.initialize();

      expect(() => engine.createChannel('test')).not.toThrow();
    });
  });

  describe('dispose()', () => {
    it('should not throw when audio was unavailable', async () => {
      // @ts-expect-error - Mock AudioContext for testing
      globalThis.AudioContext = FailingAudioContext;

      const engine = new MainThreadAudioEngine();
      await engine.initialize();

      expect(() => engine.dispose()).not.toThrow();
    });

    it('should reset initialized state', async () => {
      // @ts-expect-error - Mock AudioContext for testing
      globalThis.AudioContext = MockAudioContext;

      const engine = new MainThreadAudioEngine();
      await engine.initialize();
      engine.dispose();

      expect(engine.isInitialized()).toBe(false);
    });
  });
});
