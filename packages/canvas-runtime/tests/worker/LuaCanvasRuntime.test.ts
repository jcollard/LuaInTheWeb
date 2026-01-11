import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LuaCanvasRuntime } from '../../src/worker/LuaCanvasRuntime.js';
import type { IWorkerChannel } from '../../src/channels/IWorkerChannel.js';
import type { DrawCommand, InputState, TimingInfo } from '../../src/shared/types.js';
import { createEmptyInputState, createDefaultTimingInfo } from '../../src/shared/types.js';

// Mock OffscreenCanvas for text measurement in Node.js environment
class MockOffscreenCanvas {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  getContext(): { font: string; measureText: (text: string) => { width: number } } | null {
    return {
      font: '16px monospace',
      measureText: (text: string) => ({ width: text.length * 8 }), // Approximate width
    };
  }
}

// Only set if not already defined (Node.js environment)
if (typeof globalThis.OffscreenCanvas === 'undefined') {
  (globalThis as unknown as { OffscreenCanvas: typeof MockOffscreenCanvas }).OffscreenCanvas = MockOffscreenCanvas;
}

/**
 * Create a mock IWorkerChannel for testing.
 */
function createMockChannel(): IWorkerChannel {
  const drawCommands: DrawCommand[] = [];
  let inputState: InputState = createEmptyInputState();
  let timingInfo: TimingInfo = createDefaultTimingInfo();
  let canvasSize = { width: 800, height: 600 };
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
    getCanvasSize: vi.fn(() => canvasSize),
    setCanvasSize: vi.fn((width: number, height: number) => {
      canvasSize = { width, height };
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

    it('should register canvas.tick callback', async () => {
      await runtime.loadCode(`
        canvas.tick(function()
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
        canvas.tick(function()
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
        canvas.tick(function()
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
        canvas.tick(function()
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
        canvas.tick(function()
          canvas.set_color(255, 128, 64)
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
        canvas.tick(function()
          canvas.fill_rect(10, 20, 100, 50)
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
        canvas.tick(function()
          canvas.draw_rect(5, 10, 200, 100)
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
        canvas.tick(function()
          canvas.draw_circle(100, 100, 50)
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
        canvas.tick(function()
          canvas.fill_circle(200, 150, 30)
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
        canvas.tick(function()
          canvas.draw_line(0, 0, 100, 100)
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
        canvas.tick(function()
          canvas.draw_text(50, 50, "Hello World")
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
        canvas.tick(function()
          capturedDelta = canvas.get_delta()
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
        canvas.tick(function()
          capturedTime = canvas.get_time()
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
        canvas.tick(function()
          wDown = canvas.is_key_down("KeyW")
          aDown = canvas.is_key_down("KeyA")
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
        canvas.tick(function()
          spacePressed = canvas.is_key_pressed("Space")
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
        canvas.tick(function()
          mx = canvas.get_mouse_x()
          my = canvas.get_mouse_y()
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
        canvas.tick(function()
          leftDown = canvas.is_mouse_down(0)
          middleDown = canvas.is_mouse_down(1)
          rightDown = canvas.is_mouse_down(2)
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
        canvas.tick(function()
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

    it('should format errors with canvas.tick prefix and preserve wasmoon line info', async () => {
      const errorHandler = vi.fn();
      runtime.onError(errorHandler);

      await runtime.loadCode(`
        canvas.tick(function()
          error("Test error")
        end)
      `);

      runtime.start();
      channel.signalFrameReady();

      await vi.waitFor(() => {
        return errorHandler.mock.calls.length > 0;
      }, { timeout: 100 });

      runtime.stop();

      const errorMessage = errorHandler.mock.calls[0][0];
      // Should have canvas.tick prefix
      expect(errorMessage).toMatch(/^canvas\.tick:/);
      // Should preserve wasmoon line info format (e.g., [string "..."]:N:)
      expect(errorMessage).toMatch(/:\d+:/);
    });

    it('should not crash when error handler itself throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Set up an error handler that throws
      const errorHandler = vi.fn(() => {
        throw new Error('Error handler failed');
      });
      runtime.onError(errorHandler);

      await runtime.loadCode(`
        canvas.tick(function()
          error("Test error from Lua")
        end)
      `);

      runtime.start();
      channel.signalFrameReady();

      await vi.waitFor(() => {
        return errorHandler.mock.calls.length > 0;
      }, { timeout: 100 });

      // Runtime should have stopped the loop gracefully and logged the error
      // State remains 'running' since we didn't call stop(), but loop has stopped
      expect(runtime.getState()).toBe('running');
      expect(consoleSpy).toHaveBeenCalledWith('Error handler failed:', expect.any(Error));

      // Verify loop is no longer running by trying to signal another frame
      const initialCallCount = errorHandler.mock.calls.length;
      channel.signalFrameReady();
      await new Promise((resolve) => setTimeout(resolve, 50));
      // Error handler should not be called again since loop stopped
      expect(errorHandler.mock.calls.length).toBe(initialCallCount);

      consoleSpy.mockRestore();
    });

    it('should stop loop after runtime error (user bug reproduction)', async () => {
      const errorHandler = vi.fn();
      runtime.onError(errorHandler);

      // Simulate user's exact scenario: attempt to concatenate nil
      await runtime.loadCode(`
        local obj = { y = 9 }
        canvas.tick(function()
          -- This should trigger error: attempt to concatenate a nil value
          local result = obj.y .. nil
        end)
      `);

      runtime.start();

      // Signal first frame - should trigger error
      channel.signalFrameReady();

      // Wait for error handler to be called
      await vi.waitFor(() => {
        return errorHandler.mock.calls.length > 0;
      }, { timeout: 100 });

      // Verify error was reported
      expect(errorHandler).toHaveBeenCalledWith(expect.stringContaining('attempt to concatenate'));

      // Verify loop stopped by signaling another frame
      const initialCallCount = errorHandler.mock.calls.length;
      channel.signalFrameReady();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Error handler should NOT be called again - loop has stopped
      expect(errorHandler.mock.calls.length).toBe(initialCallCount);

      // Verify no deadlock - if we got here, worker didn't hang
      expect(true).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      await runtime.initialize();
      await runtime.loadCode(`
        canvas.tick(function()
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

  describe('asset API', () => {
    beforeEach(async () => {
      await runtime.initialize();
    });

    describe('canvas.assets.add_path', () => {
      it('should register an asset path', async () => {
        await runtime.loadCode(`
          canvas.assets.add_path("sprites")
          canvas.tick(function() end)
        `);
        // Should not throw - path is registered
        expect(runtime.getAssetPaths()).toContain("sprites");
      });

      it('should throw if called after start', async () => {
        const errorHandler = vi.fn();
        runtime.onError(errorHandler);

        await runtime.loadCode(`
          canvas.tick(function()
            canvas.assets.add_path("sprites")
          end)
        `);

        runtime.start();
        channel.signalFrameReady();

        await vi.waitFor(() => {
          return errorHandler.mock.calls.length > 0;
        }, { timeout: 100 });

        runtime.stop();

        expect(errorHandler).toHaveBeenCalledWith(
          expect.stringContaining('Cannot add asset paths after canvas.start()')
        );
      });
    });

    describe('canvas.assets.load_image', () => {
      it('should register an image asset', async () => {
        await runtime.loadCode(`
          canvas.assets.add_path("sprites")
          canvas.assets.load_image("player", "player.png")
          canvas.tick(function() end)
        `);
        // Should not throw
        const manifest = runtime.getAssetManifest();
        expect(manifest.get('player')).toEqual({
          name: 'player',
          path: 'player.png',
          type: 'image',
        });
      });
    });

    describe('canvas.draw_image', () => {
      it('should send drawImage command with position only', async () => {
        // Register a mock asset
        runtime.setAssetDimensions('player', 64, 64);

        await runtime.loadCode(`
          canvas.tick(function()
            canvas.draw_image("player", 100, 200)
          end)
        `);

        runtime.start();
        channel.signalFrameReady();

        await vi.waitFor(() => {
          return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
        }, { timeout: 100 });

        runtime.stop();

        const calls = (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls;
        expect(calls[0][0]).toContainEqual({ type: 'drawImage', name: 'player', x: 100, y: 200 });
      });

      it('should send drawImage command with scaling', async () => {
        runtime.setAssetDimensions('player', 64, 64);

        await runtime.loadCode(`
          canvas.tick(function()
            canvas.draw_image("player", 50, 75, 128, 96)
          end)
        `);

        runtime.start();
        channel.signalFrameReady();

        await vi.waitFor(() => {
          return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
        }, { timeout: 100 });

        runtime.stop();

        const calls = (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls;
        expect(calls[0][0]).toContainEqual({
          type: 'drawImage', name: 'player', x: 50, y: 75, width: 128, height: 96
        });
      });

      it('should throw for unknown asset name', async () => {
        const errorHandler = vi.fn();
        runtime.onError(errorHandler);

        await runtime.loadCode(`
          canvas.tick(function()
            canvas.draw_image("nonexistent", 0, 0)
          end)
        `);

        runtime.start();
        channel.signalFrameReady();

        await vi.waitFor(() => {
          return errorHandler.mock.calls.length > 0;
        }, { timeout: 100 });

        runtime.stop();

        expect(errorHandler).toHaveBeenCalledWith(
          expect.stringContaining("Unknown asset 'nonexistent'")
        );
      });
    });

    describe('canvas.assets.get_width/get_height', () => {
      it('should return asset width', async () => {
        runtime.setAssetDimensions('player', 64, 48);

        await runtime.loadCode(`
          canvas.tick(function()
            assetWidth = canvas.assets.get_width("player")
          end)
        `);

        runtime.start();
        channel.signalFrameReady();

        await vi.waitFor(() => {
          return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
        }, { timeout: 100 });

        runtime.stop();

        expect(await runtime.getGlobal('assetWidth')).toBe(64);
      });

      it('should return asset height', async () => {
        runtime.setAssetDimensions('player', 64, 48);

        await runtime.loadCode(`
          canvas.tick(function()
            assetHeight = canvas.assets.get_height("player")
          end)
        `);

        runtime.start();
        channel.signalFrameReady();

        await vi.waitFor(() => {
          return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
        }, { timeout: 100 });

        runtime.stop();

        expect(await runtime.getGlobal('assetHeight')).toBe(48);
      });

      it('should throw for unknown asset name', async () => {
        const errorHandler = vi.fn();
        runtime.onError(errorHandler);

        await runtime.loadCode(`
          canvas.tick(function()
            canvas.assets.get_width("nonexistent")
          end)
        `);

        runtime.start();
        channel.signalFrameReady();

        await vi.waitFor(() => {
          return errorHandler.mock.calls.length > 0;
        }, { timeout: 100 });

        runtime.stop();

        expect(errorHandler).toHaveBeenCalledWith(
          expect.stringContaining("Unknown asset 'nonexistent'")
        );
      });
    });

    describe('canvas.assets.load_font', () => {
      it('should register a font asset definition', async () => {
        await runtime.loadCode(`
          canvas.assets.add_path("fonts")
          canvas.assets.load_font("GameFont", "pixel.ttf")
          canvas.tick(function() end)
        `);
        // Should not throw

        const manifest = runtime.getAssetManifest();
        expect(manifest.get('GameFont')).toEqual({
          name: 'GameFont',
          path: 'pixel.ttf',
          type: 'font',
        });
      });

      it('should accept .ttf font files', async () => {
        await runtime.loadCode(`
          canvas.assets.add_path("fonts")
          canvas.assets.load_font("TTFFont", "test.ttf")
          canvas.tick(function() end)
        `);
        expect(runtime.getAssetManifest().get('TTFFont')?.type).toBe('font');
      });

      it('should accept .otf font files', async () => {
        await runtime.loadCode(`
          canvas.assets.add_path("fonts")
          canvas.assets.load_font("OTFFont", "test.otf")
          canvas.tick(function() end)
        `);
        expect(runtime.getAssetManifest().get('OTFFont')?.type).toBe('font');
      });

      it('should accept .woff font files', async () => {
        await runtime.loadCode(`
          canvas.assets.add_path("fonts")
          canvas.assets.load_font("WOFFFont", "test.woff")
          canvas.tick(function() end)
        `);
        expect(runtime.getAssetManifest().get('WOFFFont')?.type).toBe('font');
      });

      it('should accept .woff2 font files', async () => {
        await runtime.loadCode(`
          canvas.assets.add_path("fonts")
          canvas.assets.load_font("WOFF2Font", "test.woff2")
          canvas.tick(function() end)
        `);
        expect(runtime.getAssetManifest().get('WOFF2Font')?.type).toBe('font');
      });
    });

    describe('canvas font styling', () => {
      it('should send setFontSize command', async () => {
        await runtime.loadCode(`
          canvas.tick(function()
            canvas.set_font_size(24)
          end)
        `);

        runtime.start();
        channel.signalFrameReady();

        await vi.waitFor(() => {
          return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
        }, { timeout: 100 });

        runtime.stop();

        const calls = (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls;
        expect(calls[0][0]).toContainEqual({ type: 'setFontSize', size: 24 });
      });

      it('should send setFontFamily command', async () => {
        await runtime.loadCode(`
          canvas.tick(function()
            canvas.set_font_family("Arial")
          end)
        `);

        runtime.start();
        channel.signalFrameReady();

        await vi.waitFor(() => {
          return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
        }, { timeout: 100 });

        runtime.stop();

        const calls = (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls;
        expect(calls[0][0]).toContainEqual({ type: 'setFontFamily', family: 'Arial' });
      });

      it('should return text width from get_text_width', async () => {
        await runtime.loadCode(`
          canvas.tick(function()
            textWidth = canvas.get_text_width("Hello World")
          end)
        `);

        runtime.start();
        channel.signalFrameReady();

        await vi.waitFor(() => {
          return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
        }, { timeout: 100 });

        runtime.stop();

        // Text width should be a number (may be 0 in test environment without OffscreenCanvas)
        const width = await runtime.getGlobal('textWidth') as number;
        expect(typeof width).toBe('number');
        expect(width).toBeGreaterThanOrEqual(0);
      });

      it('should send text command with font overrides', async () => {
        await runtime.loadCode(`
          canvas.tick(function()
            canvas.draw_text(10, 20, "Styled", { font_size = 48, font_family = "Impact" })
          end)
        `);

        runtime.start();
        channel.signalFrameReady();

        await vi.waitFor(() => {
          return (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls.length > 0;
        }, { timeout: 100 });

        runtime.stop();

        const calls = (channel.sendDrawCommands as ReturnType<typeof vi.fn>).mock.calls;
        expect(calls[0][0]).toContainEqual({
          type: 'text',
          x: 10,
          y: 20,
          text: 'Styled',
          fontSize: 48,
          fontFamily: 'Impact',
        });
      });
    });
  });
});
