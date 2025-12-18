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
  SerializedAsset,
  AssetRequest,
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

    // Check if the code registered any assets
    const assetManifest = runtime.getAssetManifest();
    if (assetManifest.size > 0) {
      // Request assets from main thread
      const assetRequests: AssetRequest[] = Array.from(assetManifest.values()).map((def) => ({
        name: def.name,
        path: def.path,
      }));
      postMessage({ type: 'assetsNeeded', assets: assetRequests });
      // Don't send 'ready' yet - wait for assets
      notifyStateChange('idle');
    } else {
      // No assets needed, ready to start
      notifyStateChange('idle');
      postMessage({ type: 'ready' });
    }
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
 * Handle ASSETS_LOADED message - receive loaded assets from main thread.
 */
async function handleAssetsLoaded(assets: SerializedAsset[]): Promise<void> {
  if (!runtime) {
    notifyError('Runtime not initialized');
    return;
  }

  try {
    // Create ImageBitmaps from the asset data and store dimensions
    for (const asset of assets) {
      // Create blob from ArrayBuffer
      const blob = new Blob([asset.data]);

      // Create ImageBitmap (available in workers)
      const imageBitmap = await createImageBitmap(blob);

      // Store dimensions in the runtime
      runtime.setAssetDimensions(asset.name, asset.width, asset.height);

      // Note: The ImageBitmap is created but not stored in the worker
      // The main thread CanvasRenderer uses ImageCache for actual rendering
      // The worker just needs the dimensions to respond to get_width/get_height
      imageBitmap.close(); // Clean up - we only needed to validate and get dimensions
    }

    // Now ready to start
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

    case 'assetsLoaded':
      await handleAssetsLoaded(message.assets);
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
