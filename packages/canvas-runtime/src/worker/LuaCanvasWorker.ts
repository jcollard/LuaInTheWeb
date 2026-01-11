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
  AssetPathRequest,
  ModuleContentRequestMessage,
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
 * Request module content from main thread.
 * Used by the runtime's require() implementation.
 */
function requestModuleContent(moduleName: string, modulePath: string): void {
  const message: ModuleContentRequestMessage = {
    type: 'moduleContentRequest',
    moduleName,
    modulePath,
  };
  self.postMessage(message);
}

/**
 * Handle module content response from main thread.
 */
function handleModuleContentResponse(moduleName: string, content: string | null): void {
  if (runtime) {
    runtime.handleModuleContentResponse(moduleName, content);
  }
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
      // Each operation wrapped independently to prevent crashes
      try {
        notifyError(message);
      } catch (err) {
        console.error('Failed to notify error:', err);
      }

      // Note: Don't call runtime.stop() here - it causes deadlock!
      // The runLoop will stop itself when loopRunning is set to false

      try {
        postMessage({ type: 'pauseRequested' });
      } catch (err) {
        console.error('Failed to send pause request:', err);
      }
    });

    // Set up module request callback for require() support
    runtime.setModuleRequestCallback(requestModuleContent);

    notifyStateChange('initializing');

    await runtime.initialize();
    await runtime.loadCode(code);

    // Check if the code registered any assets or asset paths
    const assetManifest = runtime.getAssetManifest();
    const assetPaths = runtime.getAssetPaths();

    if (assetManifest.size > 0 || assetPaths.length > 0) {
      // Request assets from main thread
      const assetRequests: AssetRequest[] = Array.from(assetManifest.values()).map((def) => ({
        name: def.name,
        path: def.path,
      }));
      const assetPathRequests: AssetPathRequest[] = assetPaths.map((path) => ({ path }));
      postMessage({ type: 'assetsNeeded', assets: assetRequests, assetPaths: assetPathRequests });
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

      // For image assets, create ImageBitmap to validate
      if (asset.assetType === 'image' || (!asset.assetType && asset.width > 0)) {
        const imageBitmap = await createImageBitmap(blob);
        imageBitmap.close(); // Clean up - we only needed to validate
      }

      // Store dimensions in the runtime (for legacy API - by name)
      runtime.setAssetDimensions(asset.name, asset.width, asset.height);

      // If this asset has a filename, also store it as a discovered file (for new API)
      if (asset.filename && asset.assetType) {
        runtime.setDiscoveredFile(asset.filename, asset.width, asset.height, asset.assetType);
      }
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
 * Handle RELOAD message - trigger hot reload of all loaded modules.
 */
function handleReload(): void {
  if (!runtime) {
    notifyError('Runtime not initialized');
    return;
  }

  try {
    runtime.triggerReload();
  } catch (error) {
    if (error instanceof Error) {
      notifyError(error.message, error.stack);
    }
  }
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

    case 'reload':
      handleReload();
      break;

    case 'moduleContentResponse':
      handleModuleContentResponse(message.moduleName, message.content);
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
