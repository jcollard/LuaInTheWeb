export type {
  IWorkerChannel,
  ChannelSide,
  ChannelConfig,
} from './IWorkerChannel.js';

export { PostMessageChannel } from './PostMessageChannel.js';
export { SharedArrayBufferChannel } from './SharedArrayBufferChannel.js';

export type {
  ChannelMode,
  CreateChannelOptions,
  ChannelPairResult,
} from './channelFactory.js';

export {
  createChannel,
  createChannelPair,
  isSharedArrayBufferAvailable,
  DEFAULT_BUFFER_SIZE,
} from './channelFactory.js';
