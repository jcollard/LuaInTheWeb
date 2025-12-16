/**
 * Web Worker entry point for the Lua Canvas runtime.
 *
 * This file is designed to be loaded as a Web Worker script.
 * It handles message-based communication with the main thread.
 *
 * Usage from main thread:
 * ```typescript
 * const worker = new Worker(new URL('./LuaCanvasWorker.js', import.meta.url), { type: 'module' });
 * ```
 */

import { LuaCanvasRuntime } from './LuaCanvasRuntime.js';
import { PostMessageChannel } from '../channels/PostMessageChannel.js';
import { SharedArrayBufferChannel } from '../channels/SharedArrayBufferChannel.js';
import type { IWorkerChannel } from '../channels/IWorkerChannel.js';
import type {
  MainToWorkerMessage,
  WorkerToMainMessage,
  WorkerState,
} from './WorkerMessages.js';

// Declare self as DedicatedWorkerGlobalScope
declare const self: DedicatedWorkerGlobalScope;

let runtime: LuaCanvasRuntime | null = null;
let channel: IWorkerChannel | null = null;

/**
 * Send a message to the main thread.
 */
function postMessage(message: WorkerToMainMessage): void {
  self.postMessage(message);
}

/**
 * Send a state change notification.
 */
function notifyStateChange(state: WorkerState): void {
  postMessage({ type: 'stateChanged', state });
}

/**
 * Send an error message.
 */
function notifyError(message: string, stack?: string): void {
  postMessage({ type: 'error', message, stack });
}

/**
 * Handle INIT message - initialize the runtime with Lua code.
 */
async function handleInit(code: string, sharedBuffer?: SharedArrayBuffer): Promise<void> {
  try {
    // Create the appropriate channel based on whether SharedArrayBuffer is provided
    if (sharedBuffer) {
      channel = new SharedArrayBufferChannel({ side: 'worker' }, sharedBuffer);
    } else {
      channel = new PostMessageChannel({ side: 'worker' }, self);
    }

    // Create and initialize the runtime
    runtime = new LuaCanvasRuntime(channel);

    // Set up error handler
    runtime.onError((message) => {
      notifyError(message);
    });

    notifyStateChange('initializing');

    await runtime.initialize();
    await runtime.loadCode(code);

    notifyStateChange('idle');
    postMessage({ type: 'ready' });
  } catch (error) {
    notifyStateChange('error');
    if (error instanceof Error) {
      notifyError(error.message, error.stack);
    } else {
      notifyError(String(error));
    }
  }
}

/**
 * Handle START message - start the game loop.
 */
function handleStart(): void {
  if (!runtime) {
    notifyError('Runtime not initialized');
    return;
  }

  try {
    runtime.start();
    notifyStateChange('running');
  } catch (error) {
    if (error instanceof Error) {
      notifyError(error.message, error.stack);
    }
  }
}

/**
 * Handle STOP message - stop the game loop.
 */
function handleStop(): void {
  if (!runtime) {
    return;
  }

  runtime.stop();
  notifyStateChange('stopped');
}

/**
 * Handle incoming messages from the main thread.
 */
self.onmessage = async (event: MessageEvent<MainToWorkerMessage & { buffer?: SharedArrayBuffer }>): Promise<void> => {
  const message = event.data;

  switch (message.type) {
    case 'init':
      await handleInit(message.code, event.data.buffer);
      break;

    case 'start':
      handleStart();
      break;

    case 'stop':
      handleStop();
      break;

    default:
      notifyError(`Unknown message type: ${(message as { type: string }).type}`);
  }
};

/**
 * Handle worker errors.
 */
self.onerror = (event: ErrorEvent): void => {
  notifyError(event.message);
};
