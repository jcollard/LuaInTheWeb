import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LuaCanvasRuntime } from '../../src/worker/LuaCanvasRuntime.js';
import type { IWorkerChannel } from '../../src/channels/IWorkerChannel.js';
import type { DrawCommand, InputState, TimingInfo } from '../../src/shared/types.js';
import { createEmptyInputState, createDefaultTimingInfo } from '../../src/shared/types.js';

/**
 * Create a mock IWorkerChannel for testing.
 */
function createMockChannel(): IWorkerChannel {
  const drawCommands: DrawCommand[] = [];
  let inputState: InputState = createEmptyInputState();
  let timingInfo: TimingInfo = createDefaultTimingInfo();
  let frameReadyResolver: (() => void) | null = null;

  return {
    sendDrawCommands: vi.fn((commands: DrawCommand[]) => {
      drawCommands.push(...commands);
    }),
    getDrawCommands: vi.fn(() => {
      const commands = [...drawCommands];
      drawCommands.length = 0;
      return commands;
    }),
    getInputState: vi.fn(() => inputState),
    setInputState: vi.fn((state: InputState) => {
      inputState = state;
    }),
    getDeltaTime: vi.fn(() => timingInfo.deltaTime),
    getTotalTime: vi.fn(() => timingInfo.totalTime),
    getTimingInfo: vi.fn(() => timingInfo),
    setTimingInfo: vi.fn((timing: TimingInfo) => {
      timingInfo = timing;
    }),
    waitForFrame: vi.fn(() => {
      return new Promise<void>((resolve) => {
        frameReadyResolver = resolve;
      });
    }),
    signalFrameReady: vi.fn(() => {
      if (frameReadyResolver) {
        frameReadyResolver();
        frameReadyResolver = null;
      }
    }),
    dispose: vi.fn(),
  };
}

describe('LuaCanvasRuntime', () => {
  let runtime: LuaCanvasRuntime;
  let channel: IWorkerChannel;

  beforeEach(() => {
    channel = createMockChannel();
    runtime = new LuaCanvasRuntime(channel);
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  describe('initialization', () => {
    it('should start in idle state', () => {
      expect(runtime.getState()).toBe('idle');
    });

    it('should initialize Lua engine', async () => {
      await runtime.initialize();
      expect(runtime.getState()).toBe('idle');
    });

    it('should throw if initialized twice', async () => {
      await runtime.initialize();
      await expect(runtime.initialize()).rejects.toThrow('Already initialized');
    });
  });

  describe('code execution', () => {
    beforeEach(async () => {
      await runtime.initialize();
    });

    it('should execute simple Lua code', async () => {
      await runtime.loadCode('x = 42');
      // No error means success
    });

    it('should throw on Lua syntax error', async () => {
      await expect(runtime.loadCode('invalid lua code !!!')).rejects.toThrow();
    });

    it('should register canvas.onDraw callback', async () => {
      await runtime.loadCode(`
        canvas.onDraw(function()
          canvas.clear()
        end)
      `);
      // Should not throw
    });
  });

  describe('game loop', () => {
    beforeEach(async () => {
      await runtime.initialize();
    });

    it('should start and stop the game loop', async () => {
      await runtime.loadCode(`
        canvas.onDraw(function()
          canvas.clear()
        end)
      `);

      runtime.start();
      expect(runtime.getState()).toBe('running');

      runtime.stop();
      expect(runtime.getState()).toBe('stopped');
    });

    it('should throw if started without onDraw callback', async () => {
      await runtime.loadCode('x = 1');
      expect(() => runtime.start()).toThrow('No onDraw callback registered');
    });

    it('should throw if started before initialization', () => {
      const uninitializedRuntime = new LuaCanvasRuntime(channel);
      expect(() => uninitializedRuntime.start()).toThrow('Not initialized');
    });

    it('should execute onDraw callback each frame', async () => {
      let frameCount = 0;

      await runtime.loadCode(`
        frameCount = 0
        canvas.onDraw(function()
          frameCount = frameCount + 1
          canvas.clear()
        end)
      `);

      runtime.start();

      // Simulate a few frames
      for (let i = 0; i < 3; i++) {
        channel.signalFrameReady();
        await vi.waitFor(() => {
          const commands = channel.getDrawCommands();
          return commands.length > 0;
        }, { timeout: 100 });
      }

      runtime.stop();
      expect(channel.sendDrawCommands).toHaveBeenCalled();
    });
  });

  describe('drawing API', () => {
    beforeEach(async () => {
      await runtime.initialize();
    });

    it('should send clear command', async () => {
      await runtime.loadCode(`
        canvas.onDraw(function()
          canvas.clear()
        end)
      `);

      runtime.start();
      channel.signalFrameReady();

      await vi.waitFor(() => {
        return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
      }, { timeout: 100 });

      runtime.stop();

      const calls = (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][0]).toContainEqual({ type: 'clear' });
    });

    it('should send setColor command', async () => {
      await runtime.loadCode(`
        canvas.onDraw(function()
          canvas.setColor(255, 128, 64)
        end)
      `);

      runtime.start();
      channel.signalFrameReady();

      await vi.waitFor(() => {
        return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
      }, { timeout: 100 });

      runtime.stop();

      const calls = (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0][0]).toContainEqual({ type: 'setColor', r: 255, g: 128, b: 64 });
    });

    it('should send fillRect command', async () => {
      await runtime.loadCode(`
        canvas.onDraw(function()
          canvas.fillRect(10, 20, 100, 50)
        end)
      `);

      runtime.start();
      channel.signalFrameReady();

      await vi.waitFor(() => {
        return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
      }, { timeout: 100 });

      runtime.stop();

      const calls = (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0][0]).toContainEqual({ type: 'fillRect', x: 10, y: 20, width: 100, height: 50 });
    });

    it('should send rect command', async () => {
      await runtime.loadCode(`
        canvas.onDraw(function()
          canvas.rect(5, 10, 200, 100)
        end)
      `);

      runtime.start();
      channel.signalFrameReady();

      await vi.waitFor(() => {
        return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
      }, { timeout: 100 });

      runtime.stop();

      const calls = (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0][0]).toContainEqual({ type: 'rect', x: 5, y: 10, width: 200, height: 100 });
    });

    it('should send circle command', async () => {
      await runtime.loadCode(`
        canvas.onDraw(function()
          canvas.circle(100, 100, 50)
        end)
      `);

      runtime.start();
      channel.signalFrameReady();

      await vi.waitFor(() => {
        return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
      }, { timeout: 100 });

      runtime.stop();

      const calls = (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0][0]).toContainEqual({ type: 'circle', x: 100, y: 100, radius: 50 });
    });

    it('should send fillCircle command', async () => {
      await runtime.loadCode(`
        canvas.onDraw(function()
          canvas.fillCircle(200, 150, 30)
        end)
      `);

      runtime.start();
      channel.signalFrameReady();

      await vi.waitFor(() => {
        return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
      }, { timeout: 100 });

      runtime.stop();

      const calls = (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0][0]).toContainEqual({ type: 'fillCircle', x: 200, y: 150, radius: 30 });
    });

    it('should send line command', async () => {
      await runtime.loadCode(`
        canvas.onDraw(function()
          canvas.line(0, 0, 100, 100)
        end)
      `);

      runtime.start();
      channel.signalFrameReady();

      await vi.waitFor(() => {
        return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
      }, { timeout: 100 });

      runtime.stop();

      const calls = (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0][0]).toContainEqual({ type: 'line', x1: 0, y1: 0, x2: 100, y2: 100 });
    });

    it('should send text command', async () => {
      await runtime.loadCode(`
        canvas.onDraw(function()
          canvas.text(50, 50, "Hello World")
        end)
      `);

      runtime.start();
      channel.signalFrameReady();

      await vi.waitFor(() => {
        return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
      }, { timeout: 100 });

      runtime.stop();

      const calls = (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0][0]).toContainEqual({ type: 'text', x: 50, y: 50, text: 'Hello World' });
    });
  });

  describe('timing API', () => {
    beforeEach(async () => {
      await runtime.initialize();
    });

    it('should return delta time', async () => {
      (channel.getTimingInfo as ReturnType<typeof vi.fn>).mockReturnValue({
        deltaTime: 0.016,
        totalTime: 1.5,
        frameNumber: 90,
      });

      let capturedDelta = 0;
      await runtime.loadCode(`
        canvas.onDraw(function()
          capturedDelta = canvas.getDelta()
        end)
      `);

      runtime.start();
      channel.signalFrameReady();

      await vi.waitFor(() => {
        return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
      }, { timeout: 100 });

      runtime.stop();

      // Check the Lua global was set
      const deltaFromLua = await runtime.getGlobal('capturedDelta');
      expect(deltaFromLua).toBeCloseTo(0.016, 3);
    });

    it('should return total time', async () => {
      (channel.getTimingInfo as ReturnType<typeof vi.fn>).mockReturnValue({
        deltaTime: 0.016,
        totalTime: 5.5,
        frameNumber: 330,
      });

      await runtime.loadCode(`
        canvas.onDraw(function()
          capturedTime = canvas.getTime()
        end)
      `);

      runtime.start();
      channel.signalFrameReady();

      await vi.waitFor(() => {
        return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
      }, { timeout: 100 });

      runtime.stop();

      const timeFromLua = await runtime.getGlobal('capturedTime');
      expect(timeFromLua).toBeCloseTo(5.5, 3);
    });
  });

  describe('input API', () => {
    beforeEach(async () => {
      await runtime.initialize();
    });

    it('should return isKeyDown state', async () => {
      (channel.getInputState as ReturnType<typeof vi.fn>).mockReturnValue({
        keysDown: ['KeyW', 'Space'],
        keysPressed: ['Space'],
        mouseX: 0,
        mouseY: 0,
        mouseButtonsDown: [],
        mouseButtonsPressed: [],
      });

      await runtime.loadCode(`
        canvas.onDraw(function()
          wDown = canvas.isKeyDown("KeyW")
          aDown = canvas.isKeyDown("KeyA")
        end)
      `);

      runtime.start();
      channel.signalFrameReady();

      await vi.waitFor(() => {
        return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
      }, { timeout: 100 });

      runtime.stop();

      expect(await runtime.getGlobal('wDown')).toBe(true);
      expect(await runtime.getGlobal('aDown')).toBe(false);
    });

    it('should return isKeyPressed state', async () => {
      (channel.getInputState as ReturnType<typeof vi.fn>).mockReturnValue({
        keysDown: ['Space'],
        keysPressed: ['Space'],
        mouseX: 0,
        mouseY: 0,
        mouseButtonsDown: [],
        mouseButtonsPressed: [],
      });

      await runtime.loadCode(`
        canvas.onDraw(function()
          spacePressed = canvas.isKeyPressed("Space")
        end)
      `);

      runtime.start();
      channel.signalFrameReady();

      await vi.waitFor(() => {
        return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
      }, { timeout: 100 });

      runtime.stop();

      expect(await runtime.getGlobal('spacePressed')).toBe(true);
    });

    it('should return mouse position', async () => {
      (channel.getInputState as ReturnType<typeof vi.fn>).mockReturnValue({
        keysDown: [],
        keysPressed: [],
        mouseX: 150,
        mouseY: 200,
        mouseButtonsDown: [],
        mouseButtonsPressed: [],
      });

      await runtime.loadCode(`
        canvas.onDraw(function()
          mx = canvas.getMouseX()
          my = canvas.getMouseY()
        end)
      `);

      runtime.start();
      channel.signalFrameReady();

      await vi.waitFor(() => {
        return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
      }, { timeout: 100 });

      runtime.stop();

      expect(await runtime.getGlobal('mx')).toBe(150);
      expect(await runtime.getGlobal('my')).toBe(200);
    });

    it('should return isMouseDown state', async () => {
      (channel.getInputState as ReturnType<typeof vi.fn>).mockReturnValue({
        keysDown: [],
        keysPressed: [],
        mouseX: 0,
        mouseY: 0,
        mouseButtonsDown: [0, 2],
        mouseButtonsPressed: [],
      });

      await runtime.loadCode(`
        canvas.onDraw(function()
          leftDown = canvas.isMouseDown(0)
          middleDown = canvas.isMouseDown(1)
          rightDown = canvas.isMouseDown(2)
        end)
      `);

      runtime.start();
      channel.signalFrameReady();

      await vi.waitFor(() => {
        return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
      }, { timeout: 100 });

      runtime.stop();

      expect(await runtime.getGlobal('leftDown')).toBe(true);
      expect(await runtime.getGlobal('middleDown')).toBe(false);
      expect(await runtime.getGlobal('rightDown')).toBe(true);
    });
  });

  describe('debug library', () => {
    beforeEach(async () => {
      await runtime.initialize();
    });

    it('should have debug library available', async () => {
      await runtime.loadCode(`
        hasDebug = debug ~= nil
        hasTraceback = debug.traceback ~= nil
      `);

      expect(await runtime.getGlobal('hasDebug')).toBe(true);
      expect(await runtime.getGlobal('hasTraceback')).toBe(true);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await runtime.initialize();
    });

    it('should handle runtime errors in onDraw', async () => {
      const errorHandler = vi.fn();
      runtime.onError(errorHandler);

      await runtime.loadCode(`
        canvas.onDraw(function()
          error("Test error from Lua")
        end)
      `);

      runtime.start();
      channel.signalFrameReady();

      await vi.waitFor(() => {
        return errorHandler.mock.calls.length > 0;
      }, { timeout: 100 });

      runtime.stop();

      expect(errorHandler).toHaveBeenCalledWith(expect.stringContaining('Test error from Lua'));
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      await runtime.initialize();
      await runtime.loadCode(`
        canvas.onDraw(function()
          canvas.clear()
        end)
      `);

      runtime.start();
      await runtime.dispose();

      expect(runtime.getState()).toBe('stopped');
    });

    it('should be safe to call multiple times', async () => {
      await runtime.initialize();
      await runtime.dispose();
      await runtime.dispose(); // Should not throw
    });
  });
});
