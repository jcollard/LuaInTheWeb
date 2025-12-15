import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createChannel,
  createChannelPair,
  isSharedArrayBufferAvailable,
  ChannelMode,
} from '../../src/channels/channelFactory.js';
import { PostMessageChannel } from '../../src/channels/PostMessageChannel.js';
import { SharedArrayBufferChannel } from '../../src/channels/SharedArrayBufferChannel.js';

describe('channelFactory', () => {
  describe('isSharedArrayBufferAvailable', () => {
    it('should return true when SharedArrayBuffer exists and crossOriginIsolated is true', () => {
      // In test environment, SharedArrayBuffer is available
      // Mock crossOriginIsolated
      const originalCrossOriginIsolated = globalThis.crossOriginIsolated;
      Object.defineProperty(globalThis, 'crossOriginIsolated', {
        value: true,
        writable: true,
        configurable: true,
      });

      expect(isSharedArrayBufferAvailable()).toBe(true);

      // Restore
      Object.defineProperty(globalThis, 'crossOriginIsolated', {
        value: originalCrossOriginIsolated,
        writable: true,
        configurable: true,
      });
    });

    it('should return false when crossOriginIsolated is false', () => {
      const originalCrossOriginIsolated = globalThis.crossOriginIsolated;
      Object.defineProperty(globalThis, 'crossOriginIsolated', {
        value: false,
        writable: true,
        configurable: true,
      });

      expect(isSharedArrayBufferAvailable()).toBe(false);

      Object.defineProperty(globalThis, 'crossOriginIsolated', {
        value: originalCrossOriginIsolated,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('createChannelPair', () => {
    it('should create PostMessageChannel pair when mode is postMessage', () => {
      const { mainChannel, workerChannel, mode } = createChannelPair('postMessage');

      expect(mainChannel).toBeInstanceOf(PostMessageChannel);
      expect(workerChannel).toBeInstanceOf(PostMessageChannel);
      expect(mode).toBe('postMessage');

      mainChannel.dispose();
      workerChannel.dispose();
    });

    it('should create SharedArrayBufferChannel pair when mode is sharedArrayBuffer', () => {
      const { mainChannel, workerChannel, mode, buffer } = createChannelPair('sharedArrayBuffer');

      expect(mainChannel).toBeInstanceOf(SharedArrayBufferChannel);
      expect(workerChannel).toBeInstanceOf(SharedArrayBufferChannel);
      expect(mode).toBe('sharedArrayBuffer');
      expect(buffer).toBeInstanceOf(SharedArrayBuffer);

      mainChannel.dispose();
      workerChannel.dispose();
    });

    it('should auto-detect mode when not specified', () => {
      const { mode } = createChannelPair();

      // In test environment, SAB is typically available
      expect(['sharedArrayBuffer', 'postMessage']).toContain(mode);
    });

    it('should fall back to postMessage when auto and SAB not available', () => {
      const originalCrossOriginIsolated = globalThis.crossOriginIsolated;
      Object.defineProperty(globalThis, 'crossOriginIsolated', {
        value: false,
        writable: true,
        configurable: true,
      });

      const { mode, mainChannel, workerChannel } = createChannelPair('auto');

      expect(mode).toBe('postMessage');
      expect(mainChannel).toBeInstanceOf(PostMessageChannel);

      mainChannel.dispose();
      workerChannel.dispose();

      Object.defineProperty(globalThis, 'crossOriginIsolated', {
        value: originalCrossOriginIsolated,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('createChannel', () => {
    it('should create main-side PostMessageChannel', () => {
      const messageChannel = new MessageChannel();
      const channel = createChannel({
        side: 'main',
        mode: 'postMessage',
        port: messageChannel.port1,
      });

      expect(channel).toBeInstanceOf(PostMessageChannel);
      channel.dispose();
      messageChannel.port2.close();
    });

    it('should create worker-side PostMessageChannel', () => {
      const messageChannel = new MessageChannel();
      const channel = createChannel({
        side: 'worker',
        mode: 'postMessage',
        port: messageChannel.port2,
      });

      expect(channel).toBeInstanceOf(PostMessageChannel);
      channel.dispose();
      messageChannel.port1.close();
    });

    it('should create main-side SharedArrayBufferChannel', () => {
      const buffer = new SharedArrayBuffer(65536);
      const channel = createChannel({
        side: 'main',
        mode: 'sharedArrayBuffer',
        buffer,
      });

      expect(channel).toBeInstanceOf(SharedArrayBufferChannel);
      channel.dispose();
    });

    it('should create worker-side SharedArrayBufferChannel', () => {
      const buffer = new SharedArrayBuffer(65536);
      const channel = createChannel({
        side: 'worker',
        mode: 'sharedArrayBuffer',
        buffer,
      });

      expect(channel).toBeInstanceOf(SharedArrayBufferChannel);
      channel.dispose();
    });

    it('should throw when postMessage mode missing port', () => {
      expect(() => {
        createChannel({
          side: 'main',
          mode: 'postMessage',
        });
      }).toThrow('MessagePort required for postMessage mode');
    });

    it('should throw when sharedArrayBuffer mode missing buffer', () => {
      expect(() => {
        createChannel({
          side: 'main',
          mode: 'sharedArrayBuffer',
        });
      }).toThrow('SharedArrayBuffer required for sharedArrayBuffer mode');
    });
  });
});
