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
  createChannelPair,
  type ChannelPairResult,
} from '../channels/channelFactory.js';
import type { IWorkerChannel } from '../channels/IWorkerChannel.js';
import { GameLoopController } from '../renderer/GameLoopController.js';
import { CanvasRenderer } from '../renderer/CanvasRenderer.js';
import { InputCapture } from '../renderer/InputCapture.js';
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

  // Rendering components
  private channel: IWorkerChannel | null = null;
  private gameLoop: GameLoopController | null = null;
  private renderer: CanvasRenderer | null = null;
  private inputCapture: InputCapture | null = null;
  private channelPairResult: ChannelPairResult | null = null;

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

    // Create channel pair for main ↔ worker communication
    const actualMode = useSharedArrayBuffer ? 'sharedArrayBuffer' : 'postMessage';
    this.channelPairResult = createChannelPair(actualMode, DEFAULT_BUFFER_SIZE);
    this.channel = this.channelPairResult.mainChannel;

    // Set canvas size on channel
    this.channel.setCanvasSize(this.canvas.width, this.canvas.height);

    // Create rendering components
    this.renderer = new CanvasRenderer(this.canvas);
    this.gameLoop = new GameLoopController(this.handleFrame.bind(this));
    this.inputCapture = new InputCapture(this.canvas);

    // Create the worker
    this.worker = this.createWorker();

    // Set up message handler
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
    this.worker.onerror = this.handleWorkerError.bind(this);

    // Build init message with channel resources
    const initMessage: {
      type: 'init';
      code: string;
      buffer?: SharedArrayBuffer;
      port?: MessagePort;
    } = {
      type: 'init',
      code: this.code,
    };

    // Transfer the appropriate resources to the worker
    const transferList: Transferable[] = [];

    if (this.channelPairResult.mode === 'sharedArrayBuffer' && this.channelPairResult.buffer) {
      initMessage.buffer = this.channelPairResult.buffer;
    } else if (this.channelPairResult.mode === 'postMessage' && this.channelPairResult.ports) {
      initMessage.port = this.channelPairResult.ports.port2;
      transferList.push(this.channelPairResult.ports.port2);
    }

    this.worker.postMessage(initMessage, transferList);
  }

  /**
   * Stop the canvas process.
   * Terminates the Web Worker and cleans up resources.
   */
  stop(): void {
    if (!this.running) return;

    // Stop the game loop
    if (this.gameLoop) {
      this.gameLoop.dispose();
      this.gameLoop = null;
    }

    // Dispose input capture
    if (this.inputCapture) {
      this.inputCapture.dispose();
      this.inputCapture = null;
    }

    // Dispose the channel
    if (this.channel) {
      this.channel.dispose();
      this.channel = null;
    }

    // Send stop message if worker exists
    if (this.worker) {
      this.worker.postMessage({ type: 'stop' });
      this.worker.terminate();
      this.worker = null;
    }

    this.running = false;
    this.currentWorkerState = 'stopped';
    this.renderer = null;
    this.channelPairResult = null;

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

    if (state === 'running') {
      // Worker is running, start the game loop
      this.startGameLoop();
    } else if (state === 'stopped') {
      this.running = false;
    } else if (state === 'error') {
      this.terminateWithError();
    }
  }

  /**
   * Start the main-thread game loop for rendering.
   */
  private startGameLoop(): void {
    if (this.gameLoop) {
      this.gameLoop.start();
    }
  }

  /**
   * Handle each frame of the game loop.
   * Gets draw commands from channel and renders them.
   */
  private handleFrame(timing: { deltaTime: number; totalTime: number; frameNumber: number }): void {
    if (!this.channel || !this.renderer) return;

    // Update timing info on the channel for the worker
    this.channel.setTimingInfo(timing);

    // Send current input state to the worker
    if (this.inputCapture) {
      this.channel.setInputState(this.inputCapture.getInputState());
    }

    // Get draw commands from worker via channel
    const commands = this.channel.getDrawCommands();

    // Render the commands and update channel state for any setSize commands
    if (commands.length > 0) {
      for (const cmd of commands) {
        if (cmd.type === 'setSize') {
          // Update channel's canvas size so get_width/get_height return correct values
          this.channel.setCanvasSize(cmd.width, cmd.height);
        }
      }
      this.renderer.render(commands);
    }

    // Clear "just pressed" state for next frame
    if (this.inputCapture) {
      this.inputCapture.update();
    }

    // Signal that the frame is ready (for frame synchronization)
    this.channel.signalFrameReady();
  }

  /**
   * Terminate the process with an error code.
   */
  private terminateWithError(): void {
    // Stop the game loop
    if (this.gameLoop) {
      this.gameLoop.dispose();
      this.gameLoop = null;
    }

    // Dispose input capture
    if (this.inputCapture) {
      this.inputCapture.dispose();
      this.inputCapture = null;
    }

    // Dispose the channel
    if (this.channel) {
      this.channel.dispose();
      this.channel = null;
    }

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.running = false;
    this.currentWorkerState = 'error';
    this.renderer = null;
    this.channelPairResult = null;

    this.onExit(1);
  }
}
