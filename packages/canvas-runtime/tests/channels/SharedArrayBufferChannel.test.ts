import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

    it('should return empty array and warn when buffer contains corrupted JSON', () => {
      const int32View = new Int32Array(sharedBuffer);
      const uint8View = new Uint8Array(sharedBuffer);

      // Write invalid JSON to the draw buffer (offset 1024)
      const invalidJson = '{not valid json';
      const encoder = new TextEncoder();
      const encoded = encoder.encode(invalidJson);
      uint8View.set(encoded, 1024);

      // Set count and length to indicate data exists
      int32View[1] = 1; // OFFSET_DRAW_COUNT = 4, index = 4/4 = 1
      int32View[2] = encoded.length; // OFFSET_DRAW_LENGTH = 8, index = 8/4 = 2

      // Mock console.warn to verify it's called
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Should return empty array instead of throwing
      const received = mainChannel.getDrawCommands();
      expect(received).toEqual([]);

      // Should have warned about the parse failure
      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to parse draw commands JSON:',
        expect.any(Error)
      );

      warnSpy.mockRestore();
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

    it('should warn when draw commands exceed buffer size', () => {
      // DRAW_BUFFER_SIZE = 65536 - 1024 = 64512 bytes
      // Create a text command with a very long string to exceed buffer
      const longText = 'x'.repeat(70000); // 70KB text string
      const commands: DrawCommand[] = [{ type: 'text', x: 0, y: 0, text: longText }];

      // Mock console.warn to capture the warning
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      workerChannel.sendDrawCommands(commands);

      // Should have warned about buffer overflow
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Draw commands too large')
      );

      warnSpy.mockRestore();
    });

    it('should not warn when draw commands are within buffer size', () => {
      // DRAW_BUFFER_SIZE = 65536 - 1024 = 64512 bytes
      // Create commands that are just under the limit
      const text = 'x'.repeat(60000); // 60KB - safely under limit
      const commands: DrawCommand[] = [{ type: 'text', x: 0, y: 0, text }];

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      workerChannel.sendDrawCommands(commands);

      // Should NOT have warned
      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('should warn at the correct buffer boundary (64512 bytes)', () => {
      // DRAW_BUFFER_SIZE = 65536 - 1024 = 64512 bytes
      // This tests the boundary: 64513 bytes should warn
      // The JSON overhead is approximately: [{"type":"text","x":0,"y":0,"text":"..."}]
      // which is about 37 bytes, so we need text of ~64476 bytes to hit the boundary
      // Using 64500 bytes to be just over the limit
      const text = 'x'.repeat(64500);
      const commands: DrawCommand[] = [{ type: 'text', x: 0, y: 0, text }];

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      workerChannel.sendDrawCommands(commands);

      // With DRAW_BUFFER_SIZE = 64512, this should warn
      // With mutant DRAW_BUFFER_SIZE = 66560, this would NOT warn
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Draw commands too large')
      );

      warnSpy.mockRestore();
    });
  });

  describe('input state', () => {
    it('should set and get input state', () => {
      const inputState: InputState = {
        keysDown: ['ArrowUp', 'Space'],
        keysPressed: ['Space'],
        mouseX: 150,
        mouseY: 200,
        mouseButtonsDown: [0],
        mouseButtonsPressed: [0],
      };

      mainChannel.setInputState(inputState);
      const received = workerChannel.getInputState();

      expect(received.mouseX).toBe(150);
      expect(received.mouseY).toBe(200);
      expect(received.keysDown.includes('ArrowUp')).toBe(true);
      expect(received.keysDown.includes('Space')).toBe(true);
      expect(received.keysPressed.includes('Space')).toBe(true);
      expect(received.mouseButtonsDown.includes(0)).toBe(true);
    });

    it('should return empty input state initially', () => {
      const state = workerChannel.getInputState();
      expect(state.keysDown.length).toBe(0);
      expect(state.keysPressed.length).toBe(0);
      expect(state.mouseX).toBe(0);
      expect(state.mouseY).toBe(0);
      expect(state.mouseButtonsDown.length).toBe(0);
    });

    it('should handle multiple keys pressed', () => {
      const inputState: InputState = {
        keysDown: ['w', 'a', 's', 'd', 'Shift', 'Control'],
        keysPressed: ['w'],
        mouseX: 0,
        mouseY: 0,
        mouseButtonsDown: [],
        mouseButtonsPressed: [],
      };

      mainChannel.setInputState(inputState);
      const received = workerChannel.getInputState();

      expect(received.keysDown.length).toBe(6);
      expect(received.keysDown.includes('w')).toBe(true);
      expect(received.keysDown.includes('Shift')).toBe(true);
    });

    it('should handle all mouse buttons', () => {
      const inputState: InputState = {
        keysDown: [],
        keysPressed: [],
        mouseX: 100,
        mouseY: 100,
        mouseButtonsDown: [0, 1, 2],
        mouseButtonsPressed: [0, 1, 2],
      };

      mainChannel.setInputState(inputState);
      const received = workerChannel.getInputState();

      expect(received.mouseButtonsDown.includes(0)).toBe(true);
      expect(received.mouseButtonsDown.includes(1)).toBe(true);
      expect(received.mouseButtonsDown.includes(2)).toBe(true);
    });

    it('should handle middle mouse button only', () => {
      const inputState: InputState = {
        keysDown: [],
        keysPressed: [],
        mouseX: 50,
        mouseY: 75,
        mouseButtonsDown: [1],
        mouseButtonsPressed: [1],
      };

      mainChannel.setInputState(inputState);
      const received = workerChannel.getInputState();

      expect(received.mouseButtonsDown.includes(0)).toBe(false);
      expect(received.mouseButtonsDown.includes(1)).toBe(true);
      expect(received.mouseButtonsDown.includes(2)).toBe(false);
    });

    it('should handle right mouse button only', () => {
      const inputState: InputState = {
        keysDown: [],
        keysPressed: [],
        mouseX: 25,
        mouseY: 35,
        mouseButtonsDown: [2],
        mouseButtonsPressed: [2],
      };

      mainChannel.setInputState(inputState);
      const received = workerChannel.getInputState();

      expect(received.mouseButtonsDown.includes(0)).toBe(false);
      expect(received.mouseButtonsDown.includes(1)).toBe(false);
      expect(received.mouseButtonsDown.includes(2)).toBe(true);
    });

    it('should distinguish mouseButtonsDown from mouseButtonsPressed', () => {
      // This tests the case where a button is held down but not "just pressed this frame"
      // (i.e., button was pressed in a previous frame and is still being held)
      const inputState: InputState = {
        keysDown: ['a'],
        keysPressed: [], // 'a' is held but not just pressed
        mouseX: 100,
        mouseY: 200,
        mouseButtonsDown: [0], // Left button is held
        mouseButtonsPressed: [], // But not just pressed this frame
      };

      mainChannel.setInputState(inputState);
      const received = workerChannel.getInputState();

      // Button should be down but NOT pressed
      expect(received.mouseButtonsDown).toContain(0);
      expect(received.mouseButtonsPressed).not.toContain(0);

      // Key should be down but NOT pressed
      expect(received.keysDown).toContain('a');
      expect(received.keysPressed).not.toContain('a');
    });

    it('should handle button pressed but not down edge case', () => {
      // Edge case: button could theoretically be "pressed" on one frame
      // and already released before we read the state
      const inputState: InputState = {
        keysDown: [],
        keysPressed: ['b'], // 'b' was just pressed but released before read
        mouseX: 50,
        mouseY: 75,
        mouseButtonsDown: [],
        mouseButtonsPressed: [2], // Right button was just pressed
      };

      mainChannel.setInputState(inputState);
      const received = workerChannel.getInputState();

      expect(received.mouseButtonsDown).not.toContain(2);
      expect(received.mouseButtonsPressed).toContain(2);
      expect(received.keysDown).not.toContain('b');
      expect(received.keysPressed).toContain('b');
    });

    it('should handle more keys than MAX_KEYS (32)', () => {
      // MAX_KEYS = 32, so we test with 35 keys
      const manyKeys: string[] = [];
      for (let i = 0; i < 35; i++) {
        manyKeys.push(`key${i}`);
      }

      mainChannel.setInputState({
        keysDown: manyKeys,
        keysPressed: [],
        mouseX: 0,
        mouseY: 0,
        mouseButtonsDown: [],
        mouseButtonsPressed: [],
      });

      const received = workerChannel.getInputState();
      // Should only get MAX_KEYS (32) keys
      expect(received.keysDown.length).toBe(32);
    });

    it('should handle key names longer than KEY_SIZE (8 bytes)', () => {
      const longKeyName = 'VeryLongKeyNameThatExceeds8Bytes';

      mainChannel.setInputState({
        keysDown: [longKeyName],
        keysPressed: [],
        mouseX: 0,
        mouseY: 0,
        mouseButtonsDown: [],
        mouseButtonsPressed: [],
      });

      const received = workerChannel.getInputState();
      // Key should be truncated to KEY_SIZE - 1 = 7 characters
      expect(received.keysDown.length).toBe(1);
      const receivedKey = received.keysDown[0];
      expect(receivedKey.length).toBeLessThanOrEqual(7);
      expect(longKeyName.startsWith(receivedKey)).toBe(true);
    });

    it('should handle updating input state multiple times', () => {
      // First state
      mainChannel.setInputState({
        keysDown: ['a'],
        keysPressed: ['a'],
        mouseX: 10,
        mouseY: 20,
        mouseButtonsDown: [0],
        mouseButtonsPressed: [0],
      });

      let received = workerChannel.getInputState();
      expect(received.keysDown.includes('a')).toBe(true);
      expect(received.mouseX).toBe(10);

      // Second state (different)
      mainChannel.setInputState({
        keysDown: ['b'],
        keysPressed: [],
        mouseX: 100,
        mouseY: 200,
        mouseButtonsDown: [2],
        mouseButtonsPressed: [2],
      });

      received = workerChannel.getInputState();
      expect(received.keysDown.includes('a')).toBe(false);
      expect(received.keysDown.includes('b')).toBe(true);
      expect(received.mouseX).toBe(100);
      expect(received.mouseButtonsDown.includes(0)).toBe(false);
      expect(received.mouseButtonsDown.includes(2)).toBe(true);
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

    // Memory layout offset tests - verify data is written at documented positions
    // These tests kill arithmetic operator mutations (/ 4 → * 4)

    it('should write frame ready flag at offset 0', () => {
      const int32View = new Int32Array(sharedBuffer);
      mainChannel.signalFrameReady();
      expect(int32View[0]).toBe(1); // OFFSET_FRAME_READY = 0, index = 0/4 = 0
    });

    it('should write draw commands count at offset 4', () => {
      const int32View = new Int32Array(sharedBuffer);
      workerChannel.sendDrawCommands([{ type: 'clear' }, { type: 'clear' }]);
      expect(int32View[1]).toBe(2); // OFFSET_DRAW_COUNT = 4, index = 4/4 = 1
    });

    it('should write draw commands length at offset 8', () => {
      const int32View = new Int32Array(sharedBuffer);
      workerChannel.sendDrawCommands([{ type: 'clear' }]);
      expect(int32View[2]).toBeGreaterThan(0); // OFFSET_DRAW_LENGTH = 8, index = 8/4 = 2
    });

    it('should write delta time at offset 16', () => {
      const float64View = new Float64Array(sharedBuffer);
      mainChannel.setTimingInfo({ deltaTime: 0.0165, totalTime: 0, frameNumber: 0 });
      expect(float64View[2]).toBeCloseTo(0.0165, 5); // OFFSET_DELTA_TIME = 16, index = 16/8 = 2
    });

    it('should write total time at offset 24', () => {
      const float64View = new Float64Array(sharedBuffer);
      mainChannel.setTimingInfo({ deltaTime: 0, totalTime: 7.777, frameNumber: 0 });
      expect(float64View[3]).toBeCloseTo(7.777, 5); // OFFSET_TOTAL_TIME = 24, index = 24/8 = 3
    });

    it('should write frame number at offset 32', () => {
      const int32View = new Int32Array(sharedBuffer);
      mainChannel.setTimingInfo({ deltaTime: 0, totalTime: 0, frameNumber: 98765 });
      expect(int32View[8]).toBe(98765); // OFFSET_FRAME_NUMBER = 32, index = 32/4 = 8
    });

    it('should write mouse X at offset 36', () => {
      const int32View = new Int32Array(sharedBuffer);
      mainChannel.setInputState({
        keysDown: [],
        keysPressed: [],
        mouseX: 555,
        mouseY: 0,
        mouseButtonsDown: [],
        mouseButtonsPressed: [],
      });
      expect(int32View[9]).toBe(555); // OFFSET_MOUSE_X = 36, index = 36/4 = 9
    });

    it('should write mouse Y at offset 40', () => {
      const int32View = new Int32Array(sharedBuffer);
      mainChannel.setInputState({
        keysDown: [],
        keysPressed: [],
        mouseX: 0,
        mouseY: 666,
        mouseButtonsDown: [],
        mouseButtonsPressed: [],
      });
      expect(int32View[10]).toBe(666); // OFFSET_MOUSE_Y = 40, index = 40/4 = 10
    });

    it('should write mouse buttons at offset 44', () => {
      const int32View = new Int32Array(sharedBuffer);
      mainChannel.setInputState({
        keysDown: [],
        keysPressed: [],
        mouseX: 0,
        mouseY: 0,
        mouseButtonsDown: [0, 2], // bitmask: 1 | 4 = 5
        mouseButtonsPressed: [],
      });
      expect(int32View[11]).toBe(5); // OFFSET_MOUSE_BUTTONS = 44, index = 44/4 = 11
    });

    it('should write keys down count at offset 48', () => {
      const int32View = new Int32Array(sharedBuffer);
      mainChannel.setInputState({
        keysDown: ['a', 'b', 'c'],
        keysPressed: [],
        mouseX: 0,
        mouseY: 0,
        mouseButtonsDown: [],
        mouseButtonsPressed: [],
      });
      expect(int32View[12]).toBe(3); // OFFSET_KEYS_DOWN_COUNT = 48, index = 48/4 = 12
    });

    it('should write keys pressed count at offset 308', () => {
      const int32View = new Int32Array(sharedBuffer);
      mainChannel.setInputState({
        keysDown: [],
        keysPressed: ['x', 'y'],
        mouseX: 0,
        mouseY: 0,
        mouseButtonsDown: [],
        mouseButtonsPressed: [],
      });
      expect(int32View[77]).toBe(2); // OFFSET_KEYS_PRESSED_COUNT = 308, index = 308/4 = 77
    });

    it('should write draw commands data starting at offset 1024', () => {
      const uint8View = new Uint8Array(sharedBuffer);
      workerChannel.sendDrawCommands([{ type: 'clear' }]);
      // JSON starts with '[' which is byte 91
      expect(uint8View[1024]).toBe(91); // OFFSET_DRAW_BUFFER = 1024
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
        keysDown: ['a'],
        keysPressed: [],
        mouseX: 400,
        mouseY: 300,
        mouseButtonsDown: [0],
        mouseButtonsPressed: [0],
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
      expect(input.keysDown.includes('a')).toBe(true);
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
        keysDown: ['Space', 'Enter'],
        keysPressed: ['Space'],
        mouseX: 200,
        mouseY: 150,
        mouseButtonsDown: [2],
        mouseButtonsPressed: [2],
      });

      // All data should be retrievable without corruption
      const timing = workerChannel.getTimingInfo();
      expect(timing.frameNumber).toBe(300);

      const input = workerChannel.getInputState();
      expect(input.mouseX).toBe(200);
      expect(input.keysDown.includes('Space')).toBe(true);
      expect(input.mouseButtonsDown.includes(2)).toBe(true);

      const commands = mainChannel.getDrawCommands();
      expect(commands).toHaveLength(2);
      expect(commands[0].type).toBe('setColor');
    });

    // Tests for clearing behavior - verify offsets are used correctly when resetting
    it('should clear draw count at offset 4 after getDrawCommands', () => {
      const int32View = new Int32Array(sharedBuffer);

      // Send some draw commands
      workerChannel.sendDrawCommands([{ type: 'clear' }]);
      expect(int32View[1]).toBe(1); // OFFSET_DRAW_COUNT = 4, index = 4/4 = 1

      // Read them (which should clear)
      mainChannel.getDrawCommands();

      // Verify count was reset at the correct offset
      expect(int32View[1]).toBe(0); // Should be cleared at index 1, not index 16
    });

    it('should clear draw length at offset 8 after getDrawCommands', () => {
      const int32View = new Int32Array(sharedBuffer);

      // Send some draw commands
      workerChannel.sendDrawCommands([{ type: 'clear' }]);
      expect(int32View[2]).toBeGreaterThan(0); // OFFSET_DRAW_LENGTH = 8, index = 8/4 = 2

      // Read them (which should clear)
      mainChannel.getDrawCommands();

      // Verify length was reset at the correct offset
      expect(int32View[2]).toBe(0); // Should be cleared at index 2, not index 32
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
