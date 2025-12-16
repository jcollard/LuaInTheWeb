import type { IWorkerChannel, ChannelSide } from './IWorkerChannel.js';
import { PostMessageChannel } from './PostMessageChannel.js';
import { SharedArrayBufferChannel } from './SharedArrayBufferChannel.js';

/**
 * Communication mode for the channel.
 */
export type ChannelMode = 'sharedArrayBuffer' | 'postMessage' | 'auto';

/**
 * Default SharedArrayBuffer size (64KB).
 */
export const DEFAULT_BUFFER_SIZE = 65536;

/**
 * Check if SharedArrayBuffer is available in the current context.
 *
 * SharedArrayBuffer requires:
 * 1. The browser supports SharedArrayBuffer
 * 2. The page is served with COOP/COEP headers (crossOriginIsolated)
 *
 * @returns true if SharedArrayBuffer can be used
 */
export function isSharedArrayBufferAvailable(): boolean {
  return (
    typeof SharedArrayBuffer !== 'undefined' &&
    typeof globalThis.crossOriginIsolated !== 'undefined' &&
    globalThis.crossOriginIsolated === true
  );
}

/**
 * Options for creating a single channel.
 */
export interface CreateChannelOptions {
  /** Which side of the channel this is */
  side: ChannelSide;
  /** Communication mode */
  mode: 'sharedArrayBuffer' | 'postMessage';
  /** MessagePort for postMessage mode */
  port?: MessagePort;
  /** SharedArrayBuffer for sharedArrayBuffer mode */
  buffer?: SharedArrayBuffer;
}

/**
 * Create a single channel instance.
 *
 * @param options - Channel creation options
 * @returns The created channel
 * @throws Error if required resources are missing for the specified mode
 */
export function createChannel(options: CreateChannelOptions): IWorkerChannel {
  const { side, mode, port, buffer } = options;

  if (mode === 'postMessage') {
    if (!port) {
      throw new Error('MessagePort required for postMessage mode');
    }
    return new PostMessageChannel({ side }, port);
  }

  if (mode === 'sharedArrayBuffer') {
    if (!buffer) {
      throw new Error('SharedArrayBuffer required for sharedArrayBuffer mode');
    }
    return new SharedArrayBufferChannel({ side }, buffer);
  }

  throw new Error(`Unknown mode: ${mode}`);
}

/**
 * Result of creating a channel pair.
 */
export interface ChannelPairResult {
  /** Channel for the main thread */
  mainChannel: IWorkerChannel;
  /** Channel for the worker */
  workerChannel: IWorkerChannel;
  /** The mode that was used */
  mode: 'sharedArrayBuffer' | 'postMessage';
  /** SharedArrayBuffer if using sharedArrayBuffer mode (to transfer to worker) */
  buffer?: SharedArrayBuffer;
  /** MessagePorts if using postMessage mode (port2 to transfer to worker) */
  ports?: { port1: MessagePort; port2: MessagePort };
}

/**
 * Create a pair of channels for main thread and worker communication.
 *
 * This is the primary entry point for setting up communication.
 * It handles auto-detection and creates both sides of the channel.
 *
 * @param mode - Communication mode ('auto' will detect the best available)
 * @param bufferSize - Size of SharedArrayBuffer if using that mode
 * @returns Channel pair with both main and worker channels
 *
 * @example
 * ```typescript
 * // Auto-detect best mode
 * const { mainChannel, workerChannel, mode, buffer, ports } = createChannelPair();
 *
 * // Create worker and transfer resources
 * const worker = new Worker('worker.js');
 * if (mode === 'sharedArrayBuffer') {
 *   worker.postMessage({ type: 'init', buffer }, []);
 * } else {
 *   worker.postMessage({ type: 'init', port: ports.port2 }, [ports.port2]);
 * }
 * ```
 */
export function createChannelPair(
  mode: ChannelMode = 'auto',
  bufferSize: number = DEFAULT_BUFFER_SIZE
): ChannelPairResult {
  // Determine actual mode
  const actualMode: 'sharedArrayBuffer' | 'postMessage' =
    mode === 'auto'
      ? isSharedArrayBufferAvailable()
        ? 'sharedArrayBuffer'
        : 'postMessage'
      : mode;

  if (actualMode === 'sharedArrayBuffer') {
    const buffer = new SharedArrayBuffer(bufferSize);
    const mainChannel = new SharedArrayBufferChannel({ side: 'main' }, buffer);
    const workerChannel = new SharedArrayBufferChannel({ side: 'worker' }, buffer);

    return {
      mainChannel,
      workerChannel,
      mode: 'sharedArrayBuffer',
      buffer,
    };
  }

  // postMessage mode
  const messageChannel = new MessageChannel();
  const mainChannel = new PostMessageChannel({ side: 'main' }, messageChannel.port1);
  const workerChannel = new PostMessageChannel({ side: 'worker' }, messageChannel.port2);

  return {
    mainChannel,
    workerChannel,
    mode: 'postMessage',
    ports: {
      port1: messageChannel.port1,
      port2: messageChannel.port2,
    },
  };
}
