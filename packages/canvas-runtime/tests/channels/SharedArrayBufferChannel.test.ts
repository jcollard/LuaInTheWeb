import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SharedArrayBufferChannel } from '../../src/channels/SharedArrayBufferChannel.js';
import type { DrawCommand, InputState, TimingInfo } from '../../src/shared/types.js';

describe('SharedArrayBufferChannel', () => {
  let sharedBuffer: SharedArrayBuffer;
  let mainChannel: SharedArrayBufferChannel;
  let workerChannel: SharedArrayBufferChannel;

  beforeEach(() => {
    // Create a shared buffer (64KB as specified in epic)
    sharedBuffer = new SharedArrayBuffer(65536);

    mainChannel = new SharedArrayBufferChannel({ side: 'main' }, sharedBuffer);
    workerChannel = new SharedArrayBufferChannel({ side: 'worker' }, sharedBuffer);
  });

  afterEach(() => {
    mainChannel.dispose();
    workerChannel.dispose();
  });

  describe('draw commands', () => {
    it('should send draw commands from worker to main', () => {
      const commands: DrawCommand[] = [
        { type: 'clear' },
        { type: 'setColor', r: 255, g: 0, b: 0 },
        { type: 'fillRect', x: 10, y: 20, width: 100, height: 50 },
      ];

      // Worker sends commands
      workerChannel.sendDrawCommands(commands);

      // Main receives commands
      const received = mainChannel.getDrawCommands();
      expect(received).toEqual(commands);
    });

    it('should return empty array when no commands pending', () => {
      const received = mainChannel.getDrawCommands();
      expect(received).toEqual([]);
    });

    it('should clear commands after retrieval', () => {
      const commands: DrawCommand[] = [{ type: 'clear' }];
      workerChannel.sendDrawCommands(commands);

      // First retrieval gets commands
      const first = mainChannel.getDrawCommands();
      expect(first).toHaveLength(1);

      // Second retrieval is empty
      const second = mainChannel.getDrawCommands();
      expect(second).toEqual([]);
    });

    it('should handle all draw command types', () => {
      const commands: DrawCommand[] = [
        { type: 'clear' },
        { type: 'setColor', r: 128, g: 64, b: 32, a: 0.5 },
        { type: 'rect', x: 0, y: 0, width: 10, height: 10 },
        { type: 'fillRect', x: 5, y: 5, width: 20, height: 20 },
        { type: 'circle', x: 50, y: 50, radius: 25 },
        { type: 'fillCircle', x: 100, y: 100, radius: 30 },
        { type: 'line', x1: 0, y1: 0, x2: 100, y2: 100 },
        { type: 'text', x: 10, y: 10, text: 'Hello World' },
      ];

      workerChannel.sendDrawCommands(commands);
      const received = mainChannel.getDrawCommands();
      expect(received).toEqual(commands);
    });
  });

  describe('input state', () => {
    it('should set and get input state', () => {
      const inputState: InputState = {
        keysDown: new Set(['ArrowUp', 'Space']),
        keysPressed: new Set(['Space']),
        mouseX: 150,
        mouseY: 200,
        mouseButtons: new Set(['left']),
      };

      mainChannel.setInputState(inputState);
      const received = workerChannel.getInputState();

      expect(received.mouseX).toBe(150);
      expect(received.mouseY).toBe(200);
      expect(received.keysDown.has('ArrowUp')).toBe(true);
      expect(received.keysDown.has('Space')).toBe(true);
      expect(received.keysPressed.has('Space')).toBe(true);
      expect(received.mouseButtons.has('left')).toBe(true);
    });

    it('should return empty input state initially', () => {
      const state = workerChannel.getInputState();
      expect(state.keysDown.size).toBe(0);
      expect(state.keysPressed.size).toBe(0);
      expect(state.mouseX).toBe(0);
      expect(state.mouseY).toBe(0);
      expect(state.mouseButtons.size).toBe(0);
    });

    it('should handle multiple keys pressed', () => {
      const inputState: InputState = {
        keysDown: new Set(['w', 'a', 's', 'd', 'Shift', 'Control']),
        keysPressed: new Set(['w']),
        mouseX: 0,
        mouseY: 0,
        mouseButtons: new Set(),
      };

      mainChannel.setInputState(inputState);
      const received = workerChannel.getInputState();

      expect(received.keysDown.size).toBe(6);
      expect(received.keysDown.has('w')).toBe(true);
      expect(received.keysDown.has('Shift')).toBe(true);
    });

    it('should handle all mouse buttons', () => {
      const inputState: InputState = {
        keysDown: new Set(),
        keysPressed: new Set(),
        mouseX: 100,
        mouseY: 100,
        mouseButtons: new Set(['left', 'middle', 'right']),
      };

      mainChannel.setInputState(inputState);
      const received = workerChannel.getInputState();

      expect(received.mouseButtons.has('left')).toBe(true);
      expect(received.mouseButtons.has('middle')).toBe(true);
      expect(received.mouseButtons.has('right')).toBe(true);
    });

    it('should handle middle mouse button only', () => {
      const inputState: InputState = {
        keysDown: new Set(),
        keysPressed: new Set(),
        mouseX: 50,
        mouseY: 75,
        mouseButtons: new Set(['middle']),
      };

      mainChannel.setInputState(inputState);
      const received = workerChannel.getInputState();

      expect(received.mouseButtons.has('left')).toBe(false);
      expect(received.mouseButtons.has('middle')).toBe(true);
      expect(received.mouseButtons.has('right')).toBe(false);
    });

    it('should handle right mouse button only', () => {
      const inputState: InputState = {
        keysDown: new Set(),
        keysPressed: new Set(),
        mouseX: 25,
        mouseY: 35,
        mouseButtons: new Set(['right']),
      };

      mainChannel.setInputState(inputState);
      const received = workerChannel.getInputState();

      expect(received.mouseButtons.has('left')).toBe(false);
      expect(received.mouseButtons.has('middle')).toBe(false);
      expect(received.mouseButtons.has('right')).toBe(true);
    });

    it('should handle updating input state multiple times', () => {
      // First state
      mainChannel.setInputState({
        keysDown: new Set(['a']),
        keysPressed: new Set(['a']),
        mouseX: 10,
        mouseY: 20,
        mouseButtons: new Set(['left']),
      });

      let received = workerChannel.getInputState();
      expect(received.keysDown.has('a')).toBe(true);
      expect(received.mouseX).toBe(10);

      // Second state (different)
      mainChannel.setInputState({
        keysDown: new Set(['b']),
        keysPressed: new Set(),
        mouseX: 100,
        mouseY: 200,
        mouseButtons: new Set(['right']),
      });

      received = workerChannel.getInputState();
      expect(received.keysDown.has('a')).toBe(false);
      expect(received.keysDown.has('b')).toBe(true);
      expect(received.mouseX).toBe(100);
      expect(received.mouseButtons.has('left')).toBe(false);
      expect(received.mouseButtons.has('right')).toBe(true);
    });
  });

  describe('timing', () => {
    it('should set and get timing info', () => {
      const timing: TimingInfo = {
        deltaTime: 0.016,
        totalTime: 5.5,
        frameNumber: 330,
      };

      mainChannel.setTimingInfo(timing);
      const info = workerChannel.getTimingInfo();

      expect(info.deltaTime).toBeCloseTo(0.016, 5);
      expect(info.totalTime).toBeCloseTo(5.5, 5);
      expect(info.frameNumber).toBe(330);
    });

    it('should get delta time', () => {
      const timing: TimingInfo = {
        deltaTime: 0.033,
        totalTime: 1.0,
        frameNumber: 30,
      };

      mainChannel.setTimingInfo(timing);
      expect(workerChannel.getDeltaTime()).toBeCloseTo(0.033, 5);
    });

    it('should get total time', () => {
      const timing: TimingInfo = {
        deltaTime: 0.016,
        totalTime: 10.5,
        frameNumber: 630,
      };

      mainChannel.setTimingInfo(timing);
      expect(workerChannel.getTotalTime()).toBeCloseTo(10.5, 5);
    });

    it('should return default timing info initially', () => {
      const info = workerChannel.getTimingInfo();
      expect(info.deltaTime).toBe(0);
      expect(info.totalTime).toBe(0);
      expect(info.frameNumber).toBe(0);
    });
  });

  describe('frame synchronization', () => {
    it('should resolve waitForFrame when signalFrameReady is called', async () => {
      // Start waiting on worker side
      const waitPromise = workerChannel.waitForFrame();

      // Signal from main thread (simulate async)
      setTimeout(() => {
        mainChannel.signalFrameReady();
      }, 5);

      // Should resolve without timeout
      await expect(waitPromise).resolves.toBeUndefined();
    });

    it('should handle immediate frame signal', async () => {
      // Signal before waiting
      mainChannel.signalFrameReady();

      // Wait should resolve immediately
      await expect(workerChannel.waitForFrame()).resolves.toBeUndefined();
    });
  });

  describe('shared buffer access', () => {
    it('should use the same underlying buffer', () => {
      // Both channels should reference the same buffer
      expect(mainChannel.getBuffer()).toBe(sharedBuffer);
      expect(workerChannel.getBuffer()).toBe(sharedBuffer);
    });

    it('should store data at correct memory locations', () => {
      // This test verifies that data is stored at the documented offsets
      // by checking that independent data doesn't interfere with each other
      const int32View = new Int32Array(sharedBuffer);
      const float64View = new Float64Array(sharedBuffer);

      // Set timing
      mainChannel.setTimingInfo({
        deltaTime: 0.016,
        totalTime: 1.5,
        frameNumber: 90,
      });

      // Set input state
      mainChannel.setInputState({
        keysDown: new Set(['a']),
        keysPressed: new Set(),
        mouseX: 400,
        mouseY: 300,
        mouseButtons: new Set(['left']),
      });

      // Verify timing wasn't corrupted by input state
      const timing = workerChannel.getTimingInfo();
      expect(timing.deltaTime).toBeCloseTo(0.016, 5);
      expect(timing.totalTime).toBeCloseTo(1.5, 5);
      expect(timing.frameNumber).toBe(90);

      // Verify input state wasn't corrupted by timing
      const input = workerChannel.getInputState();
      expect(input.mouseX).toBe(400);
      expect(input.mouseY).toBe(300);
      expect(input.keysDown.has('a')).toBe(true);
    });

    it('should store data at non-overlapping locations', () => {
      // Set different values and verify they don't overwrite each other
      mainChannel.setTimingInfo({
        deltaTime: 0.033,
        totalTime: 10.0,
        frameNumber: 300,
      });

      // Send draw commands
      workerChannel.sendDrawCommands([
        { type: 'setColor', r: 255, g: 128, b: 64 },
        { type: 'fillRect', x: 0, y: 0, width: 100, height: 100 },
      ]);

      // Set more input
      mainChannel.setInputState({
        keysDown: new Set(['Space', 'Enter']),
        keysPressed: new Set(['Space']),
        mouseX: 200,
        mouseY: 150,
        mouseButtons: new Set(['right']),
      });

      // All data should be retrievable without corruption
      const timing = workerChannel.getTimingInfo();
      expect(timing.frameNumber).toBe(300);

      const input = workerChannel.getInputState();
      expect(input.mouseX).toBe(200);
      expect(input.keysDown.has('Space')).toBe(true);
      expect(input.mouseButtons.has('right')).toBe(true);

      const commands = mainChannel.getDrawCommands();
      expect(commands).toHaveLength(2);
      expect(commands[0].type).toBe('setColor');
    });
  });

  describe('dispose', () => {
    it('should handle dispose gracefully', () => {
      // Should not throw
      expect(() => mainChannel.dispose()).not.toThrow();
      expect(() => workerChannel.dispose()).not.toThrow();
    });
  });
});
