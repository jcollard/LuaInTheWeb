/**
 * Lua Canvas Process implementing IProcess interface.
 *
 * Runs Lua canvas games in a Web Worker with main-thread rendering.
 */

import type { IProcess } from '@lua-learning/shell-core';
import {
  isSharedArrayBufferAvailable,
  DEFAULT_BUFFER_SIZE,
  type ChannelMode,
} from '../channels/channelFactory.js';
import type { WorkerToMainMessage, WorkerState } from '../worker/WorkerMessages.js';

/**
 * Options for creating a LuaCanvasProcess.
 */
export interface LuaCanvasProcessOptions {
  /** Lua code to execute */
  code: string;
  /** Canvas element for rendering */
  canvas: HTMLCanvasElement;
  /** Custom worker URL (optional) */
  workerUrl?: URL;
  /** Force a specific channel mode (optional, defaults to auto) */
  mode?: ChannelMode;
}

/**
 * Process that runs Lua canvas games in a Web Worker.
 *
 * Coordinates:
 * - Web Worker lifecycle (LuaCanvasWorker)
 * - Channel communication (SharedArrayBuffer or postMessage)
 * - Main thread rendering (GameLoopController, CanvasRenderer, InputCapture)
 */
export class LuaCanvasProcess implements IProcess {
  private readonly code: string;
  private readonly canvas: HTMLCanvasElement;
  private readonly workerUrl?: URL;
  private readonly mode: ChannelMode;

  private worker: Worker | null = null;
  private running = false;
  private currentWorkerState: WorkerState = 'idle';
  private sharedBuffer: SharedArrayBuffer | null = null;

  /**
   * Callback invoked when the process produces output.
   */
  onOutput: (text: string) => void = () => {};

  /**
   * Callback invoked when the process produces an error.
   */
  onError: (text: string) => void = () => {};

  /**
   * Callback invoked when the process exits.
   */
  onExit: (code: number) => void = () => {};

  /**
   * Get the canvas element.
   * Used by GameLoopController/CanvasRenderer integration in React.
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Get the current worker state.
   */
  getWorkerState(): WorkerState {
    return this.currentWorkerState;
  }

  constructor(options: LuaCanvasProcessOptions) {
    this.code = options.code;
    this.canvas = options.canvas;
    this.workerUrl = options.workerUrl;
    this.mode = options.mode ?? 'auto';
  }

  /**
   * Start the canvas process.
   * Creates a Web Worker and initializes the Lua runtime.
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.currentWorkerState = 'idle';

    // Determine communication mode
    const useSharedArrayBuffer = this.shouldUseSharedArrayBuffer();

    // Output mode information
    if (useSharedArrayBuffer) {
      this.onOutput('Running in high-performance mode\n');
    } else {
      this.onOutput('Running in compatibility mode\n');
    }

    // Create shared buffer if using SharedArrayBuffer mode
    if (useSharedArrayBuffer) {
      this.sharedBuffer = new SharedArrayBuffer(DEFAULT_BUFFER_SIZE);
    }

    // Create the worker
    this.worker = this.createWorker();

    // Set up message handler
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
    this.worker.onerror = this.handleWorkerError.bind(this);

    // Send init message
    const initMessage: { type: 'init'; code: string; buffer?: SharedArrayBuffer } = {
      type: 'init',
      code: this.code,
    };

    if (this.sharedBuffer) {
      initMessage.buffer = this.sharedBuffer;
    }

    this.worker.postMessage(initMessage);
  }

  /**
   * Stop the canvas process.
   * Terminates the Web Worker and cleans up resources.
   */
  stop(): void {
    if (!this.running) return;

    // Send stop message if worker exists
    if (this.worker) {
      this.worker.postMessage({ type: 'stop' });
      this.worker.terminate();
      this.worker = null;
    }

    this.running = false;
    this.currentWorkerState = 'stopped';
    this.sharedBuffer = null;

    this.onExit(0);
  }

  /**
   * Check if the process is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Handle input from the user.
   * Canvas games use keyboard/mouse input, not text input - this is a no-op.
   */
  handleInput(_input: string): void {
    // Canvas games don't use text input - no-op
  }

  /**
   * Determine whether to use SharedArrayBuffer based on mode and availability.
   */
  private shouldUseSharedArrayBuffer(): boolean {
    if (this.mode === 'postMessage') {
      return false;
    }
    if (this.mode === 'sharedArrayBuffer') {
      return true;
    }
    // Auto mode - check availability
    return isSharedArrayBufferAvailable();
  }

  /**
   * Create the Web Worker instance.
   */
  private createWorker(): Worker {
    if (this.workerUrl) {
      return new Worker(this.workerUrl, { type: 'module' });
    }
    // Default worker URL - relative to this module
    return new Worker(new URL('../worker/LuaCanvasWorker.js', import.meta.url), {
      type: 'module',
    });
  }

  /**
   * Handle messages from the worker.
   */
  private handleWorkerMessage(event: MessageEvent<WorkerToMainMessage>): void {
    const message = event.data;

    switch (message.type) {
      case 'ready':
        this.handleReady();
        break;

      case 'error':
        this.handleError(message.message);
        break;

      case 'stateChanged':
        this.handleStateChanged(message.state);
        break;
    }
  }

  /**
   * Handle worker error event.
   */
  private handleWorkerError(event: ErrorEvent): void {
    this.handleError(event.message);
  }

  /**
   * Handle ready message from worker.
   */
  private handleReady(): void {
    // Worker is initialized, start the game loop
    if (this.worker) {
      this.worker.postMessage({ type: 'start' });
    }
  }

  /**
   * Handle error from worker.
   */
  private handleError(message: string): void {
    this.onError(message);
    this.terminateWithError();
  }

  /**
   * Handle state change from worker.
   */
  private handleStateChanged(state: WorkerState): void {
    this.currentWorkerState = state;

    if (state === 'stopped') {
      this.running = false;
    } else if (state === 'error') {
      this.terminateWithError();
    }
  }

  /**
   * Terminate the process with an error code.
   */
  private terminateWithError(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.running = false;
    this.currentWorkerState = 'error';
    this.sharedBuffer = null;

    this.onExit(1);
  }
}
