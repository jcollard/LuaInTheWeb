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
  DrawCommand,
  MouseButton,
  InputState,
  TimingInfo,
} from './shared/index.js';

export { createEmptyInputState, createDefaultTimingInfo } from './shared/index.js';

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
