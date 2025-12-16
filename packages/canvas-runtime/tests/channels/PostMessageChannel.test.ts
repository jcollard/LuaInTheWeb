import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PostMessageChannel } from '../../src/channels/PostMessageChannel.js';
import type { DrawCommand, InputState, TimingInfo } from '../../src/shared/types.js';
import { createEmptyInputState, createDefaultTimingInfo } from '../../src/shared/types.js';

describe('PostMessageChannel', () => {
  let mainChannel: PostMessageChannel;
  let workerChannel: PostMessageChannel;
  let mockMainPort: MessagePort;
  let mockWorkerPort: MessagePort;

  beforeEach(() => {
    // Create a real MessageChannel for testing
    const channel = new MessageChannel();
    mockMainPort = channel.port1;
    mockWorkerPort = channel.port2;

    mainChannel = new PostMessageChannel({ side: 'main' }, mockMainPort);
    workerChannel = new PostMessageChannel({ side: 'worker' }, mockWorkerPort);
  });

  afterEach(() => {
    mainChannel.dispose();
    workerChannel.dispose();
  });

  describe('draw commands', () => {
    it('should send draw commands from worker to main', async () => {
      const commands: DrawCommand[] = [
        { type: 'clear' },
        { type: 'setColor', r: 255, g: 0, b: 0 },
        { type: 'fillRect', x: 10, y: 20, width: 100, height: 50 },
      ];

      // Worker sends commands
      workerChannel.sendDrawCommands(commands);

      // Wait for message to be delivered
      await new Promise(resolve => setTimeout(resolve, 10));

      // Main receives commands
      const received = mainChannel.getDrawCommands();
      expect(received).toEqual(commands);
    });

    it('should return empty array when no commands pending', () => {
      const received = mainChannel.getDrawCommands();
      expect(received).toEqual([]);
    });

    it('should clear commands after retrieval', async () => {
      const commands: DrawCommand[] = [{ type: 'clear' }];
      workerChannel.sendDrawCommands(commands);

      await new Promise(resolve => setTimeout(resolve, 10));

      // First retrieval gets commands
      const first = mainChannel.getDrawCommands();
      expect(first).toHaveLength(1);

      // Second retrieval is empty
      const second = mainChannel.getDrawCommands();
      expect(second).toEqual([]);
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

      // Wait for message
      return new Promise<void>(resolve => {
        setTimeout(() => {
          const received = workerChannel.getInputState();
          expect(received.mouseX).toBe(150);
          expect(received.mouseY).toBe(200);
          expect(received.keysDown.includes('ArrowUp')).toBe(true);
          expect(received.keysDown.includes('Space')).toBe(true);
          expect(received.keysPressed.includes('Space')).toBe(true);
          expect(received.mouseButtonsDown.includes(0)).toBe(true);
          resolve();
        }, 10);
      });
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
        keysDown: ['a', 'b', 'c', 'd', 'e'],
        keysPressed: ['a', 'c'],
        mouseX: 0,
        mouseY: 0,
        mouseButtonsDown: [],
        mouseButtonsPressed: [],
      };

      mainChannel.setInputState(inputState);

      return new Promise<void>(resolve => {
        setTimeout(() => {
          const received = workerChannel.getInputState();
          expect(received.keysDown.length).toBe(5);
          expect(received.keysDown.includes('a')).toBe(true);
          expect(received.keysDown.includes('b')).toBe(true);
          expect(received.keysDown.includes('c')).toBe(true);
          expect(received.keysDown.includes('d')).toBe(true);
          expect(received.keysDown.includes('e')).toBe(true);
          expect(received.keysPressed.length).toBe(2);
          expect(received.keysPressed.includes('a')).toBe(true);
          expect(received.keysPressed.includes('c')).toBe(true);
          resolve();
        }, 10);
      });
    });

    it('should handle all mouse buttons', () => {
      const inputState: InputState = {
        keysDown: [],
        keysPressed: [],
        mouseX: 100,
        mouseY: 200,
        mouseButtonsDown: [0, 1, 2],
        mouseButtonsPressed: [0, 1, 2],
      };

      mainChannel.setInputState(inputState);

      return new Promise<void>(resolve => {
        setTimeout(() => {
          const received = workerChannel.getInputState();
          expect(received.mouseButtonsDown.length).toBe(3);
          expect(received.mouseButtonsDown.includes(0)).toBe(true);
          expect(received.mouseButtonsDown.includes(1)).toBe(true);
          expect(received.mouseButtonsDown.includes(2)).toBe(true);
          resolve();
        }, 10);
      });
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

      return new Promise<void>(resolve => {
        setTimeout(() => {
          // Second state overwrites first
          mainChannel.setInputState({
            keysDown: ['b'],
            keysPressed: [],
            mouseX: 30,
            mouseY: 40,
            mouseButtonsDown: [2],
            mouseButtonsPressed: [2],
          });

          setTimeout(() => {
            const received = workerChannel.getInputState();
            expect(received.keysDown.includes('a')).toBe(false);
            expect(received.keysDown.includes('b')).toBe(true);
            expect(received.mouseX).toBe(30);
            expect(received.mouseY).toBe(40);
            expect(received.mouseButtonsDown.includes(0)).toBe(false);
            expect(received.mouseButtonsDown.includes(2)).toBe(true);
            resolve();
          }, 10);
        }, 10);
      });
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

      return new Promise<void>(resolve => {
        setTimeout(() => {
          const info = workerChannel.getTimingInfo();
          expect(info.deltaTime).toBe(0.016);
          expect(info.totalTime).toBe(5.5);
          expect(info.frameNumber).toBe(330);
          resolve();
        }, 10);
      });
    });

    it('should get delta time', () => {
      const timing: TimingInfo = {
        deltaTime: 0.033,
        totalTime: 1.0,
        frameNumber: 30,
      };

      mainChannel.setTimingInfo(timing);

      return new Promise<void>(resolve => {
        setTimeout(() => {
          expect(workerChannel.getDeltaTime()).toBe(0.033);
          resolve();
        }, 10);
      });
    });

    it('should get total time', () => {
      const timing: TimingInfo = {
        deltaTime: 0.016,
        totalTime: 10.5,
        frameNumber: 630,
      };

      mainChannel.setTimingInfo(timing);

      return new Promise<void>(resolve => {
        setTimeout(() => {
          expect(workerChannel.getTotalTime()).toBe(10.5);
          resolve();
        }, 10);
      });
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
      const waitPromise = workerChannel.waitForFrame();

      // Signal from main thread
      setTimeout(() => {
        mainChannel.signalFrameReady();
      }, 10);

      // Should resolve without timeout
      await expect(waitPromise).resolves.toBeUndefined();
    });

    it('should handle multiple frame cycles', async () => {
      // First frame
      const wait1 = workerChannel.waitForFrame();
      setTimeout(() => mainChannel.signalFrameReady(), 5);
      await wait1;

      // Second frame
      const wait2 = workerChannel.waitForFrame();
      setTimeout(() => mainChannel.signalFrameReady(), 5);
      await wait2;

      // Third frame
      const wait3 = workerChannel.waitForFrame();
      setTimeout(() => mainChannel.signalFrameReady(), 5);
      await wait3;
    });
  });

  describe('dispose', () => {
    it('should close the message port on dispose', () => {
      const closeSpy = vi.spyOn(mockMainPort, 'close');
      mainChannel.dispose();
      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
