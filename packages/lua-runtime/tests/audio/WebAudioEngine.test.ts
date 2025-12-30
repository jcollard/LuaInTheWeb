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
  gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  };
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

  describe('audio channels', () => {
    beforeEach(async () => {
      await engine.initialize();
      await engine.decodeAudio('sfx', new ArrayBuffer(1024));
      await engine.decodeAudio('bgm', new ArrayBuffer(1024));
    });

    describe('createChannel / destroyChannel', () => {
      it('should create a channel', () => {
        engine.createChannel('test-channel');
        // Channel exists (we can play on it without error)
        expect(() => engine.playOnChannel('test-channel', 'sfx')).not.toThrow();
      });

      it('should create a channel with parent', () => {
        engine.createChannel('parent');
        engine.createChannel('child', 'parent');
        expect(engine.getChannelParent('child')).toBe('parent');
      });

      it('should default parent to null when created without parent', () => {
        engine.createChannel('test');
        // Channels created without explicit parent have parentName = null
        // They still connect to master but parentName is null
        expect(engine.getChannelParent('test')).toBeNull();
      });

      it('should store parent name even if parent does not exist yet', () => {
        // The API stores the parent name as provided - it doesn't validate
        engine.createChannel('test', 'nonexistent');
        expect(engine.getChannelParent('test')).toBe('nonexistent');
      });

      it('should destroy a channel', () => {
        engine.createChannel('temp');
        engine.destroyChannel('temp');
        // Playing on destroyed channel auto-creates it
        engine.playOnChannel('temp', 'sfx');
        // Should not throw
      });

      it('should stop playback when destroying channel', () => {
        engine.createChannel('temp');
        engine.playOnChannel('temp', 'sfx');
        expect(engine.isChannelPlaying('temp')).toBe(true);
        engine.destroyChannel('temp');
        expect(engine.isChannelPlaying('temp')).toBe(false);
      });
    });

    describe('playOnChannel / stopChannel', () => {
      it('should play audio on a channel', () => {
        engine.createChannel('sfx-channel');
        engine.playOnChannel('sfx-channel', 'sfx');
        expect(engine.isChannelPlaying('sfx-channel')).toBe(true);
      });

      it('should auto-create channel if it does not exist', () => {
        engine.playOnChannel('auto-channel', 'sfx');
        expect(engine.isChannelPlaying('auto-channel')).toBe(true);
      });

      it('should play with volume option', () => {
        engine.createChannel('vol-channel');
        engine.playOnChannel('vol-channel', 'sfx', 0.5);
        expect(engine.isChannelPlaying('vol-channel')).toBe(true);
      });

      it('should play with loop option', () => {
        engine.createChannel('loop-channel');
        engine.playOnChannel('loop-channel', 'sfx', 1.0, true);
        expect(engine.isChannelPlaying('loop-channel')).toBe(true);
      });

      it('should stop previous audio when playing new audio on same channel', () => {
        engine.createChannel('channel');
        engine.playOnChannel('channel', 'sfx');
        engine.playOnChannel('channel', 'bgm');
        // Previous sound should have been stopped
        expect(engine.isChannelPlaying('channel')).toBe(true);
      });

      it('should stop channel', () => {
        engine.createChannel('channel');
        engine.playOnChannel('channel', 'sfx');
        engine.stopChannel('channel');
        expect(engine.isChannelPlaying('channel')).toBe(false);
      });

      it('should handle stopping non-existent channel gracefully', () => {
        expect(() => engine.stopChannel('nonexistent')).not.toThrow();
      });

      it('should handle playing unknown audio on channel', () => {
        engine.createChannel('channel');
        expect(() => engine.playOnChannel('channel', 'unknown')).not.toThrow();
        expect(engine.isChannelPlaying('channel')).toBe(false);
      });
    });

    describe('pauseChannel / resumeChannel', () => {
      it('should pause channel', () => {
        engine.createChannel('channel');
        engine.playOnChannel('channel', 'sfx');
        engine.pauseChannel('channel');
        expect(engine.isChannelPlaying('channel')).toBe(false);
      });

      it('should resume channel', () => {
        engine.createChannel('channel');
        engine.playOnChannel('channel', 'sfx');
        engine.pauseChannel('channel');
        engine.resumeChannel('channel');
        expect(engine.isChannelPlaying('channel')).toBe(true);
      });

      it('should handle pause on non-existent channel gracefully', () => {
        expect(() => engine.pauseChannel('nonexistent')).not.toThrow();
      });

      it('should handle resume on non-existent channel gracefully', () => {
        expect(() => engine.resumeChannel('nonexistent')).not.toThrow();
      });

      it('should handle pause when nothing is playing', () => {
        engine.createChannel('channel');
        expect(() => engine.pauseChannel('channel')).not.toThrow();
      });
    });

    describe('setChannelVolume / getChannelVolume', () => {
      it('should set channel volume', () => {
        engine.createChannel('channel');
        engine.setChannelVolume('channel', 0.5);
        expect(engine.getChannelVolume('channel')).toBe(0.5);
      });

      it('should return 0 for non-existent channel', () => {
        expect(engine.getChannelVolume('nonexistent')).toBe(0);
      });

      it('should clamp volume to valid range', () => {
        engine.createChannel('channel');
        engine.setChannelVolume('channel', -0.5);
        expect(engine.getChannelVolume('channel')).toBeGreaterThanOrEqual(0);

        engine.setChannelVolume('channel', 1.5);
        expect(engine.getChannelVolume('channel')).toBeLessThanOrEqual(1);
      });
    });

    describe('fadeChannelTo / isChannelFading', () => {
      it('should start fading channel', () => {
        engine.createChannel('channel');
        engine.fadeChannelTo('channel', 0, 1);
        expect(engine.isChannelFading('channel')).toBe(true);
      });

      it('should return false for non-fading channel', () => {
        engine.createChannel('channel');
        expect(engine.isChannelFading('channel')).toBe(false);
      });

      it('should return false for non-existent channel', () => {
        expect(engine.isChannelFading('nonexistent')).toBe(false);
      });

      it('should handle fade on non-existent channel gracefully', () => {
        expect(() => engine.fadeChannelTo('nonexistent', 0, 1)).not.toThrow();
      });
    });

    describe('getChannelParent / setChannelParent', () => {
      it('should get channel parent', () => {
        engine.createChannel('parent');
        engine.createChannel('child', 'parent');
        expect(engine.getChannelParent('child')).toBe('parent');
      });

      it('should return null for master channel', () => {
        expect(engine.getChannelParent('master')).toBeNull();
      });

      it('should return null for non-existent channel', () => {
        expect(engine.getChannelParent('nonexistent')).toBeNull();
      });

      it('should set channel parent', () => {
        engine.createChannel('parent1');
        engine.createChannel('parent2');
        engine.createChannel('child', 'parent1');
        engine.setChannelParent('child', 'parent2');
        expect(engine.getChannelParent('child')).toBe('parent2');
      });

      it('should set parent to null (connects to master internally)', () => {
        engine.createChannel('parent');
        engine.createChannel('child', 'parent');
        engine.setChannelParent('child', null);
        // setChannelParent with null sets parentName to null
        // The channel still connects to master internally but parentName is null
        expect(engine.getChannelParent('child')).toBeNull();
      });
    });

    describe('isChannelPlaying', () => {
      it('should return true when channel is playing', () => {
        engine.createChannel('channel');
        engine.playOnChannel('channel', 'sfx');
        expect(engine.isChannelPlaying('channel')).toBe(true);
      });

      it('should return false when channel is not playing', () => {
        engine.createChannel('channel');
        expect(engine.isChannelPlaying('channel')).toBe(false);
      });

      it('should return false for non-existent channel', () => {
        expect(engine.isChannelPlaying('nonexistent')).toBe(false);
      });
    });

    describe('getChannelTime / getChannelDuration', () => {
      it('should return 0 for non-existent channel time', () => {
        expect(engine.getChannelTime('nonexistent')).toBe(0);
      });

      it('should return 0 for non-existent channel duration', () => {
        expect(engine.getChannelDuration('nonexistent')).toBe(0);
      });

      it('should return duration when playing', () => {
        engine.createChannel('channel');
        engine.playOnChannel('channel', 'sfx');
        expect(engine.getChannelDuration('channel')).toBe(2.5); // MockAudioBuffer duration
      });

      it('should return 0 duration when not playing', () => {
        engine.createChannel('channel');
        expect(engine.getChannelDuration('channel')).toBe(0);
      });
    });
  });
});
