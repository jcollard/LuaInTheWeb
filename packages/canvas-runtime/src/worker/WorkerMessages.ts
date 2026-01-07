/**
 * Message types for communication with the canvas worker.
 */

/**
 * Worker lifecycle state.
 */
export type WorkerState = 'idle' | 'initializing' | 'running' | 'stopped' | 'error';

/**
 * Serialized asset data for transfer to worker.
 * Contains the binary data and metadata for a preloaded asset.
 */
export interface SerializedAsset {
  /** Unique name to reference this asset */
  name: string;
  /** The raw binary data as ArrayBuffer (transferable) */
  data: ArrayBuffer;
  /** The width in pixels (for images) */
  width: number;
  /** The height in pixels (for images) */
  height: number;
  /** The original filename (for directory-scanned assets) */
  filename?: string;
  /** The asset type ('image' or 'font') */
  assetType?: 'image' | 'font';
}

/**
 * Message from main thread to worker.
 */
export type MainToWorkerMessage =
  | InitMessage
  | AssetsLoadedMessage
  | StartMessage
  | StopMessage
  | ReloadMessage
  | ModuleContentResponseMessage;

/**
 * Initialize the Lua engine with code.
 */
export interface InitMessage {
  type: 'init';
  /** Lua code to execute */
  code: string;
  /** Preloaded asset data (optional) */
  assets?: SerializedAsset[];
}

/**
 * Loaded asset data from main thread to worker.
 */
export interface AssetsLoadedMessage {
  type: 'assetsLoaded';
  /** Array of loaded assets with their data */
  assets: SerializedAsset[];
}

/**
 * Start the game loop.
 */
export interface StartMessage {
  type: 'start';
}

/**
 * Stop the game loop.
 */
export interface StopMessage {
  type: 'stop';
}

/**
 * Trigger hot reload of all loaded Lua modules.
 * Updates function definitions while preserving runtime state.
 */
export interface ReloadMessage {
  type: 'reload';
}

/**
 * Response with module file content from main thread.
 * Sent in response to a ModuleContentRequestMessage.
 */
export interface ModuleContentResponseMessage {
  type: 'moduleContentResponse';
  /** The module name that was requested */
  moduleName: string;
  /** The resolved path of the module file */
  modulePath: string;
  /** The file content, or null if not found */
  content: string | null;
}

/**
 * Asset definition for requesting assets from main thread.
 */
export interface AssetRequest {
  /** Unique name to reference this asset */
  name: string;
  /** Path to the asset file */
  path: string;
}

/**
 * Directory path request for the new asset path API.
 */
export interface AssetPathRequest {
  /** Directory path to scan for assets */
  path: string;
}

/**
 * Message from worker to main thread.
 */
export type WorkerToMainMessage =
  | ReadyMessage
  | ErrorMessage
  | StateChangedMessage
  | AssetsNeededMessage
  | ModuleContentRequestMessage;

/**
 * Worker is ready (Lua engine initialized).
 */
export interface ReadyMessage {
  type: 'ready';
}

/**
 * An error occurred.
 */
export interface ErrorMessage {
  type: 'error';
  message: string;
  /** Stack trace if available */
  stack?: string;
}

/**
 * Worker state changed.
 */
export interface StateChangedMessage {
  type: 'stateChanged';
  state: WorkerState;
}

/**
 * Worker needs assets to be loaded by main thread.
 */
export interface AssetsNeededMessage {
  type: 'assetsNeeded';
  /** Array of assets that need to be loaded (legacy API) */
  assets: AssetRequest[];
  /** Array of directory paths to scan for assets (new API) */
  assetPaths?: AssetPathRequest[];
}

/**
 * Worker requests module file content from main thread.
 * Used by the require() implementation to load modules from the filesystem.
 */
export interface ModuleContentRequestMessage {
  type: 'moduleContentRequest';
  /** The module name being required (e.g., 'player', 'lib.utils') */
  moduleName: string;
  /** The resolved path to try (e.g., '/player.lua', '/lib/utils/init.lua') */
  modulePath: string;
}
