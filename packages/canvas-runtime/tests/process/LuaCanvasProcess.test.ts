import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IProcess } from '@lua-learning/shell-core';

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

  postMessage = vi.fn((message: unknown) => {
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

      expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'init',
          code,
        })
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
      // Mock crossOriginIsolated
      vi.stubGlobal('crossOriginIsolated', true);

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
});
