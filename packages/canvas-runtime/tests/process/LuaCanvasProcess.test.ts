import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IProcess } from '@lua-learning/shell-core';
import type { DrawCommand } from '../../src/shared/types.js';

// We'll import the actual class once implemented
// import { LuaCanvasProcess } from '../../src/process/LuaCanvasProcess.js';

// Mock ErrorEvent for Node.js environment
class MockErrorEvent {
  readonly type: string;
  readonly message: string;

  constructor(type: string, options?: { message?: string }) {
    this.type = type;
    this.message = options?.message ?? '';
  }
}

vi.stubGlobal('ErrorEvent', MockErrorEvent);

// Mock AudioContext for Node.js environment
class MockGainNode {
  gain = { value: 1 };
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  destination = { connect: vi.fn() };
  currentTime = 0;
  createGain = vi.fn(() => new MockGainNode());
  createBufferSource = vi.fn(() => ({
    buffer: null,
    loop: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  }));
  decodeAudioData = vi.fn(() => Promise.resolve({ duration: 1 }));
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  close = vi.fn(() => {
    this.state = 'closed';
    return Promise.resolve();
  });
}

vi.stubGlobal('AudioContext', MockAudioContext);

// Mock channel for testing draw command flow
let mockDrawCommands: DrawCommand[] = [];

const mockMainChannel = {
  sendDrawCommands: vi.fn(),
  getDrawCommands: vi.fn(() => {
    const commands = [...mockDrawCommands];
    mockDrawCommands = [];
    return commands;
  }),
  getInputState: vi.fn(() => ({ keysDown: [], keysPressed: [], mouseX: 0, mouseY: 0, mouseLeft: false, mouseRight: false, mouseMiddle: false })),
  setInputState: vi.fn(),
  getDeltaTime: vi.fn(() => 0.016),
  getTotalTime: vi.fn(() => 0),
  getTimingInfo: vi.fn(() => ({ deltaTime: 0.016, totalTime: 0, frameNumber: 0 })),
  setTimingInfo: vi.fn(),
  waitForFrame: vi.fn(() => Promise.resolve()),
  signalFrameReady: vi.fn(),
  getCanvasSize: vi.fn(() => ({ width: 800, height: 600 })),
  setCanvasSize: vi.fn(),
  dispose: vi.fn(),
  // Pixel manipulation methods
  getPendingImageDataRequests: vi.fn(() => []),
  requestImageData: vi.fn(() => Promise.resolve({ type: 'getImageDataResponse' as const, requestId: 0, width: 0, height: 0, data: [] })),
  sendImageDataResponse: vi.fn(),
  // Audio methods
  setAudioState: vi.fn(),
  getAudioState: vi.fn(() => ({ masterVolume: 1, muted: false })),
};

// Mock channelFactory - using a configurable mock that can switch modes
let mockChannelMode: 'postMessage' | 'sharedArrayBuffer' = 'postMessage';
let mockSharedBuffer: SharedArrayBuffer | undefined;

vi.mock('../../src/channels/channelFactory.js', async (importOriginal) => {
  const original = await importOriginal() as Record<string, unknown>;
  return {
    ...original,
    createChannelPair: vi.fn(() => {
      if (mockChannelMode === 'sharedArrayBuffer') {
        mockSharedBuffer = new SharedArrayBuffer(65536);
        return {
          mainChannel: mockMainChannel,
          workerChannel: mockMainChannel,
          mode: 'sharedArrayBuffer' as const,
          buffer: mockSharedBuffer,
        };
      }
      return {
        mainChannel: mockMainChannel,
        workerChannel: mockMainChannel,
        mode: 'postMessage' as const,
        ports: {
          port1: { postMessage: vi.fn(), onmessage: null, start: vi.fn(), close: vi.fn() } as unknown as MessagePort,
          port2: { postMessage: vi.fn(), onmessage: null, start: vi.fn(), close: vi.fn() } as unknown as MessagePort,
        },
      };
    }),
  };
});

/**
 * Tests for LuaCanvasProcess.
 *
 * LuaCanvasProcess implements IProcess to run Lua canvas games in a Web Worker.
 * It coordinates:
 * - Web Worker lifecycle (LuaCanvasWorker)
 * - Channel communication (SharedArrayBuffer or postMessage)
 * - Main thread rendering (GameLoopController, CanvasRenderer, InputCapture)
 */

// Mock Worker class
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  private messageHandler: ((msg: unknown) => void) | null = null;

  postMessage = vi.fn((message: unknown, _transfer?: Transferable[]) => {
    if (this.messageHandler) {
      this.messageHandler(message);
    }
  });

  terminate = vi.fn();

  // Test helper to simulate messages from worker
  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  // Test helper to simulate errors
  simulateError(message: string): void {
    if (this.onerror) {
      this.onerror(new ErrorEvent('error', { message }));
    }
  }

  // Test helper to set up response handler
  setMessageHandler(handler: (msg: unknown) => void): void {
    this.messageHandler = handler;
  }
}

// Mock canvas context
function createMockCanvas(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const ctx = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    // DPR scaling support (Issue #515)
    setTransform: vi.fn(),
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '16px sans-serif',
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    getContext: vi.fn(() => ctx),
    width: 800,
    height: 600,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 800, height: 600 })),
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx };
}

// Mock Worker constructor globally
let mockWorkerInstance: MockWorker;

vi.stubGlobal('Worker', class {
  constructor() {
    mockWorkerInstance = new MockWorker();
    return mockWorkerInstance;
  }
});

// Mock requestAnimationFrame
let rafCallback: FrameRequestCallback | null = null;
let rafId = 0;
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  rafCallback = cb;
  return ++rafId;
});
vi.stubGlobal('cancelAnimationFrame', vi.fn());

// Mock performance.now
vi.stubGlobal('performance', { now: vi.fn(() => 0) });

describe('LuaCanvasProcess', () => {
  let process: IProcess;
  let mockCanvas: ReturnType<typeof createMockCanvas>;
  let LuaCanvasProcess: typeof import('../../src/process/LuaCanvasProcess.js').LuaCanvasProcess;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCanvas = createMockCanvas();
    rafCallback = null;
    mockDrawCommands = [];
    mockChannelMode = 'postMessage';
    mockSharedBuffer = undefined;

    // Dynamic import to get fresh module
    const module = await import('../../src/process/LuaCanvasProcess.js');
    LuaCanvasProcess = module.LuaCanvasProcess;
  });

  afterEach(() => {
    if (process && process.isRunning()) {
      process.stop();
    }
  });

  describe('IProcess interface', () => {
    it('should implement start()', async () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      expect(process.start).toBeInstanceOf(Function);
    });

    it('should implement stop()', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      expect(process.stop).toBeInstanceOf(Function);
    });

    it('should implement isRunning()', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      expect(process.isRunning).toBeInstanceOf(Function);
      expect(process.isRunning()).toBe(false);
    });

    it('should implement handleInput()', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      expect(process.handleInput).toBeInstanceOf(Function);
    });

    it('should have onOutput callback property', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      expect(process.onOutput).toBeInstanceOf(Function);
    });

    it('should have onError callback property', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      expect(process.onError).toBeInstanceOf(Function);
    });

    it('should have onExit callback property', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      expect(process.onExit).toBeInstanceOf(Function);
    });
  });

  describe('start()', () => {
    it('should create a Web Worker on start', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      process.start();

      expect(mockWorkerInstance).toBeDefined();
    });

    it('should send init message to worker with code', () => {
      const code = 'canvas.onDraw(function() canvas.clear() end)';
      process = new LuaCanvasProcess({
        code,
        canvas: mockCanvas.canvas,
      });

      process.start();

      // postMessage is called with (message, transferList)
      expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'init',
          code,
        }),
        expect.any(Array) // Transfer list
      );
    });

    it('should set isRunning to true after start', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      process.start();

      expect(process.isRunning()).toBe(true);
    });

    it('should not start twice if already running', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      process.start();
      const firstWorker = mockWorkerInstance;

      process.start();

      // Should still be the same worker instance (no new Worker created)
      expect(mockWorkerInstance).toBe(firstWorker);
    });

    it('should send start message to worker after ready', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      process.start();

      // Simulate worker ready
      mockWorkerInstance.simulateMessage({ type: 'ready' });

      expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({ type: 'start' });
    });
  });

  describe('stop()', () => {
    it('should send stop message to worker', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      process.start();
      mockWorkerInstance.simulateMessage({ type: 'ready' });
      process.stop();

      expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({ type: 'stop' });
    });

    it('should terminate the worker', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      process.start();
      process.stop();

      expect(mockWorkerInstance.terminate).toHaveBeenCalled();
    });

    it('should set isRunning to false', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      process.start();
      expect(process.isRunning()).toBe(true);

      process.stop();
      expect(process.isRunning()).toBe(false);
    });

    it('should call onExit callback with code 0', () => {
      const onExit = vi.fn();
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });
      process.onExit = onExit;

      process.start();
      process.stop();

      expect(onExit).toHaveBeenCalledWith(0);
    });

    it('should do nothing if not running', () => {
      const onExit = vi.fn();
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });
      process.onExit = onExit;

      process.stop();

      expect(onExit).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should call onError when worker sends error message', () => {
      const onError = vi.fn();
      process = new LuaCanvasProcess({
        code: 'invalid lua code',
        canvas: mockCanvas.canvas,
      });
      process.onError = onError;

      process.start();
      mockWorkerInstance.simulateMessage({
        type: 'error',
        message: 'Lua syntax error',
      });

      expect(onError).toHaveBeenCalledWith('Lua syntax error');
    });

    it('should call onExit with code 1 on error', () => {
      const onExit = vi.fn();
      process = new LuaCanvasProcess({
        code: 'invalid lua code',
        canvas: mockCanvas.canvas,
      });
      process.onExit = onExit;

      process.start();
      mockWorkerInstance.simulateMessage({
        type: 'error',
        message: 'Lua syntax error',
      });

      expect(onExit).toHaveBeenCalledWith(1);
    });

    it('should handle worker onerror event', () => {
      const onError = vi.fn();
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });
      process.onError = onError;

      process.start();
      mockWorkerInstance.simulateError('Worker crashed');

      expect(onError).toHaveBeenCalledWith('Worker crashed');
    });

    it('should set isRunning to false on error', () => {
      process = new LuaCanvasProcess({
        code: 'invalid lua code',
        canvas: mockCanvas.canvas,
      });

      process.start();
      expect(process.isRunning()).toBe(true);

      mockWorkerInstance.simulateMessage({
        type: 'error',
        message: 'Lua syntax error',
      });

      expect(process.isRunning()).toBe(false);
    });
  });

  describe('mode detection', () => {
    it('should output mode information on start', () => {
      const onOutput = vi.fn();
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });
      process.onOutput = onOutput;

      process.start();

      // Should output a mode message (either high-performance or compatibility)
      expect(onOutput).toHaveBeenCalledWith(
        expect.stringMatching(/Running in (high-performance|compatibility) mode/)
      );
    });

    it('should include SharedArrayBuffer in init when available', () => {
      // Mock crossOriginIsolated and set channel mode
      vi.stubGlobal('crossOriginIsolated', true);
      mockChannelMode = 'sharedArrayBuffer';

      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      process.start();

      const initCall = mockWorkerInstance.postMessage.mock.calls.find(
        (call) => (call[0] as { type: string }).type === 'init'
      );
      expect(initCall).toBeDefined();
      expect((initCall![0] as { buffer?: SharedArrayBuffer }).buffer).toBeInstanceOf(SharedArrayBuffer);

      vi.unstubAllGlobals();
      // Re-stub the mocks we need
      vi.stubGlobal('Worker', class {
        constructor() {
          mockWorkerInstance = new MockWorker();
          return mockWorkerInstance;
        }
      });
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        rafCallback = cb;
        return ++rafId;
      });
      vi.stubGlobal('cancelAnimationFrame', vi.fn());
      vi.stubGlobal('performance', { now: vi.fn(() => 0) });
    });

    it('should use postMessage when SharedArrayBuffer not available', () => {
      // Ensure crossOriginIsolated is false (default in test environment)
      vi.stubGlobal('crossOriginIsolated', false);

      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      process.start();

      const initCall = mockWorkerInstance.postMessage.mock.calls.find(
        (call) => (call[0] as { type: string }).type === 'init'
      );
      expect(initCall).toBeDefined();
      // No buffer in postMessage mode
      expect((initCall![0] as { buffer?: SharedArrayBuffer }).buffer).toBeUndefined();

      vi.unstubAllGlobals();
      // Re-stub the mocks we need
      vi.stubGlobal('Worker', class {
        constructor() {
          mockWorkerInstance = new MockWorker();
          return mockWorkerInstance;
        }
      });
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        rafCallback = cb;
        return ++rafId;
      });
      vi.stubGlobal('cancelAnimationFrame', vi.fn());
      vi.stubGlobal('performance', { now: vi.fn(() => 0) });
    });
  });

  describe('handleInput()', () => {
    it('should do nothing (canvas games use keyboard/mouse input)', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      process.start();

      // handleInput is a no-op for canvas processes
      expect(() => process.handleInput('test')).not.toThrow();
    });
  });

  describe('worker state changes', () => {
    it('should handle initializing state', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      process.start();
      mockWorkerInstance.simulateMessage({ type: 'stateChanged', state: 'initializing' });

      // Should not crash, state is tracked internally
      expect(process.isRunning()).toBe(true);
    });

    it('should handle running state', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      process.start();
      mockWorkerInstance.simulateMessage({ type: 'ready' });
      mockWorkerInstance.simulateMessage({ type: 'stateChanged', state: 'running' });

      expect(process.isRunning()).toBe(true);
    });

    it('should handle stopped state from worker', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      process.start();
      mockWorkerInstance.simulateMessage({ type: 'stateChanged', state: 'stopped' });

      // Worker stopped itself
      expect(process.isRunning()).toBe(false);
    });

    it('should handle error state from worker', () => {
      const onExit = vi.fn();
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });
      process.onExit = onExit;

      process.start();
      mockWorkerInstance.simulateMessage({ type: 'stateChanged', state: 'error' });

      expect(process.isRunning()).toBe(false);
      expect(onExit).toHaveBeenCalledWith(1);
    });
  });

  describe('options', () => {
    it('should accept workerUrl option', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
        workerUrl: new URL('custom-worker.js', import.meta.url),
      });

      expect(process).toBeDefined();
    });

    it('should accept mode option to force postMessage', () => {
      const onOutput = vi.fn();
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
        mode: 'postMessage',
      });
      process.onOutput = onOutput;

      process.start();

      expect(onOutput).toHaveBeenCalledWith(
        expect.stringContaining('compatibility mode')
      );
    });
  });

  describe('rendering integration', () => {
    it('should start game loop when worker is running', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.tick(function() canvas.clear() end)',
        canvas: mockCanvas.canvas,
      });

      process.start();
      mockWorkerInstance.simulateMessage({ type: 'ready' });
      mockWorkerInstance.simulateMessage({ type: 'stateChanged', state: 'running' });

      // The game loop should have been started - requestAnimationFrame should have been called
      expect(rafCallback).not.toBeNull();
    });

    it('should render draw commands received from worker', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.tick(function() canvas.clear() end)',
        canvas: mockCanvas.canvas,
        mode: 'postMessage',
      });

      process.start();
      mockWorkerInstance.simulateMessage({ type: 'ready' });
      mockWorkerInstance.simulateMessage({ type: 'stateChanged', state: 'running' });

      // Inject draw commands that will be returned by the mock channel
      mockDrawCommands = [{ type: 'clear' }];

      // Simulate a frame callback to trigger rendering
      if (rafCallback) {
        // Mock performance.now to return a timestamp
        (performance.now as ReturnType<typeof vi.fn>).mockReturnValue(16.67);
        rafCallback(16.67);
      }

      // The channel should have been queried for draw commands
      expect(mockMainChannel.getDrawCommands).toHaveBeenCalled();
      // The clear command should have been rendered
      expect(mockCanvas.ctx.clearRect).toHaveBeenCalled();
    });

    it('should stop game loop when process is stopped', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.tick(function() canvas.clear() end)',
        canvas: mockCanvas.canvas,
      });

      process.start();
      mockWorkerInstance.simulateMessage({ type: 'ready' });
      mockWorkerInstance.simulateMessage({ type: 'stateChanged', state: 'running' });

      // Game loop should be running
      expect(rafCallback).not.toBeNull();

      // Stop the process
      process.stop();

      // cancelAnimationFrame should have been called
      expect(cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // DPR Scaling Support (Issue #515)
  // ============================================================================

  describe('setDevicePixelRatio()', () => {
    it('should have setDevicePixelRatio method', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      expect(process.setDevicePixelRatio).toBeInstanceOf(Function);
    });

    it('should configure renderer with DPR after start', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      process.start();
      mockWorkerInstance.simulateMessage({ type: 'ready' });
      mockWorkerInstance.simulateMessage({ type: 'stateChanged', state: 'running' });

      // Set DPR after process is running
      process.setDevicePixelRatio(2);

      // Canvas should be scaled by DPR
      expect(mockCanvas.canvas.width).toBe(1600); // 800 * 2
      expect(mockCanvas.canvas.height).toBe(1200); // 600 * 2
    });

    it('should apply DPR before process is started (deferred)', () => {
      process = new LuaCanvasProcess({
        code: 'canvas.onDraw(function() end)',
        canvas: mockCanvas.canvas,
      });

      // Set DPR before start
      process.setDevicePixelRatio(2);

      // Start the process
      process.start();
      mockWorkerInstance.simulateMessage({ type: 'ready' });
      mockWorkerInstance.simulateMessage({ type: 'stateChanged', state: 'running' });

      // Canvas should be scaled by DPR
      expect(mockCanvas.canvas.width).toBe(1600); // 800 * 2
      expect(mockCanvas.canvas.height).toBe(1200); // 600 * 2
    });
  });
});
