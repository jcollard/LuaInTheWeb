// Shared types
export type {
  DrawCommandType,
  ClearCommand,
  SetColorCommand,
  RectCommand,
  FillRectCommand,
  CircleCommand,
  FillCircleCommand,
  LineCommand,
  TextCommand,
  DrawImageCommand,
  DrawCommand,
  MouseButton,
  InputState,
  TimingInfo,
  AssetDefinition,
  AssetManifest,
  LoadedAsset,
} from './shared/index.js';

export { createEmptyInputState, createDefaultTimingInfo, AssetLoader } from './shared/index.js';

// Channel interfaces
export type {
  IWorkerChannel,
  ChannelSide,
  ChannelConfig,
} from './channels/index.js';

// Channel implementations
export { PostMessageChannel, SharedArrayBufferChannel } from './channels/index.js';

// Channel factory
export type {
  ChannelMode,
  CreateChannelOptions,
  ChannelPairResult,
} from './channels/index.js';

export {
  createChannel,
  createChannelPair,
  isSharedArrayBufferAvailable,
  DEFAULT_BUFFER_SIZE,
} from './channels/index.js';

// Renderer components
export {
  CanvasRenderer,
  InputCapture,
  GameLoopController,
  ImageCache,
} from './renderer/index.js';

export type { FrameCallback } from './renderer/index.js';

// Worker components
export { LuaCanvasRuntime } from './worker/index.js';

export type {
  WorkerState,
  MainToWorkerMessage,
  WorkerToMainMessage,
  InitMessage,
  StartMessage,
  StopMessage,
  ReadyMessage,
  ErrorMessage,
  StateChangedMessage,
  SerializedAsset,
} from './worker/index.js';

// Process components
export { LuaCanvasProcess } from './process/index.js';

export type { LuaCanvasProcessOptions } from './process/index.js';
